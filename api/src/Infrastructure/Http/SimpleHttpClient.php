<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Http;

/**
 * Minimal HTTP client for OAuth token and profile endpoints (curl).
 */
class SimpleHttpClient
{
    /**
     * @param array<string,string> $formFields
     * @return array{status:int,body:string}
     */
    public function postForm(string $url, array $formFields): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('curl_init_failed');
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($formFields),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($body === false) {
            curl_close($ch);
            throw new \RuntimeException('curl_exec_failed: ' . curl_error($ch));
        }
        curl_close($ch);

        return ['status' => $status, 'body' => (string) $body];
    }

    /**
     * @return array{status:int,body:string}
     */
    public function get(string $url, ?string $bearerToken = null): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('curl_init_failed');
        }
        $headers = ['Accept: application/json'];
        if ($bearerToken !== null && $bearerToken !== '') {
            $headers[] = 'Authorization: Bearer ' . $bearerToken;
        }
        curl_setopt_array($ch, [
            CURLOPT_HTTPGET => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => $headers,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($body === false) {
            curl_close($ch);
            throw new \RuntimeException('curl_exec_failed: ' . curl_error($ch));
        }
        curl_close($ch);

        return ['status' => $status, 'body' => (string) $body];
    }

    /**
     * @return array<string,mixed>
     */
    public function decodeJsonObject(string $json): array
    {
        try {
            $v = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new \RuntimeException('invalid_json');
        }

        return is_array($v) ? $v : [];
    }
}
