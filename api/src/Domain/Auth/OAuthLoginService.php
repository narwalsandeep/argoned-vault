<?php

declare(strict_types=1);

namespace Blackbox\Domain\Auth;

use Blackbox\Infrastructure\Auth\OAuthLoginStateRepository;
use Blackbox\Infrastructure\Auth\UserOAuthIdentityRepository;
use Blackbox\Infrastructure\Auth\UserRepository;
use Blackbox\Infrastructure\Http\SimpleHttpClient;
use Psr\Log\LoggerInterface;

final class OAuthLoginService
{
    public const PROVIDER_GOOGLE = 'google';

    public const PROVIDER_LINKEDIN = 'linkedin';

    public const PROVIDER_FACEBOOK = 'facebook';

    /** @param array{state_ttl_seconds:int,google:array{client_id:string,client_secret:string},linkedin:array{client_id:string,client_secret:string},facebook:array{client_id:string,client_secret:string}} $oauth */
    public function __construct(
        private readonly UserRepository $users,
        private readonly UserOAuthIdentityRepository $oauthIdentities,
        private readonly OAuthLoginStateRepository $oauthStates,
        private readonly SimpleHttpClient $http,
        private readonly LoggerInterface $logger,
        private readonly string $apiPublicBaseUrl,
        private readonly string $uiAppBaseUrl,
        private readonly string $legalSignupDocsVersion,
        private readonly array $oauth,
    ) {
    }

    /**
     * @return array{google:bool,linkedin:bool,facebook:bool}
     */
    public function providersAvailability(): array
    {
        return [
            'google' => $this->isProviderConfigured(self::PROVIDER_GOOGLE),
            'linkedin' => $this->isProviderConfigured(self::PROVIDER_LINKEDIN),
            'facebook' => $this->isProviderConfigured(self::PROVIDER_FACEBOOK),
        ];
    }

    public function assertProviderEnabled(string $provider): void
    {
        if (!in_array($provider, [self::PROVIDER_GOOGLE, self::PROVIDER_LINKEDIN, self::PROVIDER_FACEBOOK], true)) {
            throw new \InvalidArgumentException('oauth_unknown_provider');
        }
        if (!$this->isProviderConfigured($provider)) {
            throw new \RuntimeException('oauth_provider_disabled');
        }
    }

    /**
     * Absolute URL to send the browser to (IdP authorize page).
     */
    public function beginAuthorization(string $provider): string
    {
        $this->assertProviderEnabled($provider);
        $this->oauthStates->deleteExpired();
        $plainState = bin2hex(random_bytes(32));
        $hash = hash('sha256', $plainState);
        $ttl = max(60, (int) ($this->oauth['state_ttl_seconds'] ?? 600));
        $this->oauthStates->insert($hash, $provider, $ttl);
        $redirectUri = $this->callbackRedirectUri();

        return match ($provider) {
            self::PROVIDER_GOOGLE => $this->googleAuthorizeUrl($plainState, $redirectUri),
            self::PROVIDER_LINKEDIN => $this->linkedinAuthorizeUrl($plainState, $redirectUri),
            self::PROVIDER_FACEBOOK => $this->facebookAuthorizeUrl($plainState, $redirectUri),
            default => throw new \InvalidArgumentException('oauth_unknown_provider'),
        };
    }

    /**
     * @return array{
     *   id:string,
     *   email:string,
     *   mfa_enabled:bool,
     *   mfa_state:?string,
     *   first_name:string,
     *   last_name:string,
     *   display_name:?string,
     *   email_verified:bool
     * }
     */
    public function finishAuthorization(string $statePlain, string $code): array
    {
        $statePlain = trim($statePlain);
        $code = trim($code);
        if ($statePlain === '' || $code === '') {
            throw new \RuntimeException('oauth_invalid_callback');
        }
        $this->oauthStates->deleteExpired();
        $stateHash = hash('sha256', $statePlain);
        $row = $this->oauthStates->consumeIfValid($stateHash);
        if ($row === null) {
            throw new \RuntimeException('oauth_invalid_or_expired_state');
        }
        $provider = (string) $row['provider'];
        $redirectUri = $this->callbackRedirectUri();
        $accessToken = match ($provider) {
            self::PROVIDER_GOOGLE => $this->exchangeGoogleCode($code, $redirectUri),
            self::PROVIDER_LINKEDIN => $this->exchangeLinkedInCode($code, $redirectUri),
            self::PROVIDER_FACEBOOK => $this->exchangeFacebookCode($code, $redirectUri),
            default => throw new \RuntimeException('oauth_unknown_provider'),
        };
        $profile = match ($provider) {
            self::PROVIDER_GOOGLE => $this->fetchGoogleProfile($accessToken),
            self::PROVIDER_LINKEDIN => $this->fetchLinkedInProfile($accessToken),
            self::PROVIDER_FACEBOOK => $this->fetchFacebookProfile($accessToken),
            default => throw new \RuntimeException('oauth_unknown_provider'),
        };

        $userId = $this->resolveOrCreateUserId($provider, $profile);

        $u = $this->users->findById($userId);
        if ($u === null) {
            throw new \RuntimeException('user_not_found');
        }

        return [
            'id' => $u['id'],
            'email' => $u['email'],
            'mfa_enabled' => $u['mfa_enabled'],
            'mfa_state' => $u['mfa_state'],
            'first_name' => $u['first_name'],
            'last_name' => $u['last_name'],
            'display_name' => $u['display_name'] ?? null,
            'email_verified' => $u['email_verified_at'] !== null,
        ];
    }

    public function uiLoginSuccessUrl(): string
    {
        return rtrim($this->uiAppBaseUrl, '/') . '/login?oauth=success';
    }

    public function uiLoginErrorUrl(string $code): string
    {
        return rtrim($this->uiAppBaseUrl, '/') . '/login?oauth_error=' . rawurlencode($code);
    }

    private function callbackRedirectUri(): string
    {
        return rtrim($this->apiPublicBaseUrl, '/') . '/api/v1/auth/oauth/callback';
    }

    private function isProviderConfigured(string $provider): bool
    {
        $cfg = $this->oauthConfigFor($provider);

        return $cfg['client_id'] !== '' && $cfg['client_secret'] !== '';
    }

    /**
     * @return array{client_id:string,client_secret:string}
     */
    private function oauthConfigFor(string $provider): array
    {
        /** @var array{client_id:string,client_secret:string} $c */
        $c = $this->oauth[$provider] ?? ['client_id' => '', 'client_secret' => ''];

        return $c;
    }

    /**
     * @param array{subject:string,email:string,email_verified:bool,first_name:string,last_name:string} $profile
     */
    private function resolveOrCreateUserId(string $provider, array $profile): string
    {
        $subject = $profile['subject'];
        $email = mb_strtolower(trim($profile['email']));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('oauth_email_required');
        }
        if (!$profile['email_verified']) {
            throw new \RuntimeException('oauth_email_not_verified');
        }

        $existingByIdentity = $this->oauthIdentities->findUserIdByProviderSubject($provider, $subject);
        if ($existingByIdentity !== null) {
            return $existingByIdentity;
        }

        $byEmail = $this->users->findByEmail($email);
        if ($byEmail !== null) {
            $hash = $byEmail['auth_password_hash'];
            if ($hash !== null && $hash !== '') {
                throw new \RuntimeException('oauth_email_password_account');
            }
            $userId = $byEmail['id'];
            try {
                $this->oauthIdentities->insert($userId, $provider, $subject);
            } catch (\PDOException $e) {
                if (($e->errorInfo[0] ?? '') !== '23505') {
                    throw $e;
                }
                $retry = $this->oauthIdentities->findUserIdByProviderSubject($provider, $subject);

                return $retry ?? $userId;
            }

            return $userId;
        }

        $first = trim($profile['first_name']);
        $last = trim($profile['last_name']);
        if ($first === '' && $last === '') {
            $first = 'Member';
            $last = 'User';
        } elseif ($first === '') {
            $first = 'Member';
        } elseif ($last === '') {
            $last = 'User';
        }

        $user = $this->users->createOAuthUser($email, $first, $last, $this->legalSignupDocsVersion);
        try {
            $this->oauthIdentities->insert($user['id'], $provider, $subject);
        } catch (\PDOException $e) {
            $this->logger->error('oauth.identity_insert_failed', [
                'provider' => $provider,
                'message' => $e->getMessage(),
            ]);
            throw new \RuntimeException('oauth_account_create_failed', 0, $e);
        }

        return $user['id'];
    }

    private function googleAuthorizeUrl(string $state, string $redirectUri): string
    {
        $id = $this->oauthConfigFor(self::PROVIDER_GOOGLE)['client_id'];
        $q = http_build_query([
            'client_id' => $id,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ]);

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . $q;
    }

    private function linkedinAuthorizeUrl(string $state, string $redirectUri): string
    {
        $id = $this->oauthConfigFor(self::PROVIDER_LINKEDIN)['client_id'];
        $q = http_build_query([
            'response_type' => 'code',
            'client_id' => $id,
            'redirect_uri' => $redirectUri,
            'scope' => 'openid profile email',
            'state' => $state,
        ]);

        return 'https://www.linkedin.com/oauth/v2/authorization?' . $q;
    }

    private function facebookAuthorizeUrl(string $state, string $redirectUri): string
    {
        $id = $this->oauthConfigFor(self::PROVIDER_FACEBOOK)['client_id'];
        $q = http_build_query([
            'client_id' => $id,
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'scope' => 'email,public_profile',
        ]);

        return 'https://www.facebook.com/v19.0/dialog/oauth?' . $q;
    }

    private function exchangeGoogleCode(string $code, string $redirectUri): string
    {
        $cfg = $this->oauthConfigFor(self::PROVIDER_GOOGLE);
        $res = $this->http->postForm('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $cfg['client_id'],
            'client_secret' => $cfg['client_secret'],
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);
        if ($res['status'] !== 200) {
            $this->logger->warning('oauth.google_token_exchange', ['status' => $res['status']]);
            throw new \RuntimeException('oauth_token_exchange_failed');
        }
        $data = $this->http->decodeJsonObject($res['body']);
        $token = isset($data['access_token']) ? (string) $data['access_token'] : '';
        if ($token === '') {
            throw new \RuntimeException('oauth_token_exchange_failed');
        }

        return $token;
    }

    private function exchangeLinkedInCode(string $code, string $redirectUri): string
    {
        $cfg = $this->oauthConfigFor(self::PROVIDER_LINKEDIN);
        $res = $this->http->postForm('https://www.linkedin.com/oauth/v2/accessToken', [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'client_id' => $cfg['client_id'],
            'client_secret' => $cfg['client_secret'],
        ]);
        if ($res['status'] !== 200) {
            $this->logger->warning('oauth.linkedin_token_exchange', ['status' => $res['status']]);
            throw new \RuntimeException('oauth_token_exchange_failed');
        }
        $data = $this->http->decodeJsonObject($res['body']);
        $token = isset($data['access_token']) ? (string) $data['access_token'] : '';
        if ($token === '') {
            throw new \RuntimeException('oauth_token_exchange_failed');
        }

        return $token;
    }

    private function exchangeFacebookCode(string $code, string $redirectUri): string
    {
        $cfg = $this->oauthConfigFor(self::PROVIDER_FACEBOOK);
        $url = 'https://graph.facebook.com/v19.0/oauth/access_token?' . http_build_query([
            'client_id' => $cfg['client_id'],
            'redirect_uri' => $redirectUri,
            'client_secret' => $cfg['client_secret'],
            'code' => $code,
        ]);
        $res = $this->http->get($url, null);
        if ($res['status'] !== 200) {
            $this->logger->warning('oauth.facebook_token_exchange', ['status' => $res['status']]);
            throw new \RuntimeException('oauth_token_exchange_failed');
        }
        $data = $this->http->decodeJsonObject($res['body']);
        $token = isset($data['access_token']) ? (string) $data['access_token'] : '';
        if ($token === '') {
            throw new \RuntimeException('oauth_token_exchange_failed');
        }

        return $token;
    }

    /**
     * @return array{subject:string,email:string,email_verified:bool,first_name:string,last_name:string}
     */
    private function fetchGoogleProfile(string $accessToken): array
    {
        $res = $this->http->get('https://openidconnect.googleapis.com/v1/userinfo', $accessToken);
        if ($res['status'] !== 200) {
            throw new \RuntimeException('oauth_profile_failed');
        }
        $j = $this->http->decodeJsonObject($res['body']);
        $sub = isset($j['sub']) ? (string) $j['sub'] : '';
        $email = isset($j['email']) ? (string) $j['email'] : '';
        $verified = isset($j['email_verified']) && ($j['email_verified'] === true || $j['email_verified'] === 'true' || $j['email_verified'] === 1);

        return [
            'subject' => $sub,
            'email' => $email,
            'email_verified' => $verified,
            'first_name' => isset($j['given_name']) ? (string) $j['given_name'] : '',
            'last_name' => isset($j['family_name']) ? (string) $j['family_name'] : '',
        ];
    }

    /**
     * @return array{subject:string,email:string,email_verified:bool,first_name:string,last_name:string}
     */
    private function fetchLinkedInProfile(string $accessToken): array
    {
        $res = $this->http->get('https://api.linkedin.com/v2/userinfo', $accessToken);
        if ($res['status'] !== 200) {
            throw new \RuntimeException('oauth_profile_failed');
        }
        $j = $this->http->decodeJsonObject($res['body']);
        $sub = isset($j['sub']) ? (string) $j['sub'] : '';
        $email = isset($j['email']) ? (string) $j['email'] : '';
        $verified = $email !== '';

        return [
            'subject' => $sub,
            'email' => $email,
            'email_verified' => $verified,
            'first_name' => isset($j['given_name']) ? (string) $j['given_name'] : '',
            'last_name' => isset($j['family_name']) ? (string) $j['family_name'] : '',
        ];
    }

    /**
     * @return array{subject:string,email:string,email_verified:bool,first_name:string,last_name:string}
     */
    private function fetchFacebookProfile(string $accessToken): array
    {
        $url = 'https://graph.facebook.com/me?' . http_build_query([
            'fields' => 'id,email,first_name,last_name,name',
            'access_token' => $accessToken,
        ]);
        $res = $this->http->get($url, null);
        if ($res['status'] !== 200) {
            throw new \RuntimeException('oauth_profile_failed');
        }
        $j = $this->http->decodeJsonObject($res['body']);
        $sub = isset($j['id']) ? (string) $j['id'] : '';
        $email = isset($j['email']) ? (string) $j['email'] : '';
        $fn = isset($j['first_name']) ? (string) $j['first_name'] : '';
        $ln = isset($j['last_name']) ? (string) $j['last_name'] : '';
        if ($fn === '' && $ln === '' && isset($j['name'])) {
            $parts = preg_split('/\s+/', trim((string) $j['name']), 2);
            $fn = $parts[0] ?? '';
            $ln = $parts[1] ?? '';
        }

        return [
            'subject' => $sub,
            'email' => $email,
            'email_verified' => $email !== '',
            'first_name' => $fn,
            'last_name' => $ln,
        ];
    }
}
