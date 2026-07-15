<?php

declare(strict_types=1);

namespace Blackbox\Infrastructure\Mail;

/**
 * Shared HTML shell for transactional auth emails: table layout, responsive type, light/dark via {@see https://www.htmlemailtips.com/color-scheme}.
 * All {@see AuthEmailTemplates} output should be built through this class so previews and sends stay identical.
 */
final class AuthEmailLayout
{
    /** System stack for HTML email + dev preview (no webfont fetch; matches modern UI sans). */
    private const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    public static function render(
        string $productName,
        string $htmlDocumentTitle,
        string $preheaderPlain,
        string $greetingPlain,
        string $bodyHtml,
        bool $includePrimaryCta,
        ?string $ctaUrl = null,
        ?string $ctaButtonLabel = null,
        ?string $footerNotePlain = null,
        bool $includePlainUrlFallback = true,
        string $extraCss = '',
    ): string {
        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $year = (string) (int) date('Y');
        $titleEsc = $esc($htmlDocumentTitle);
        $preheaderEsc = $esc($preheaderPlain);
        $productEsc = $esc($productName);
        $greetingEsc = $esc($greetingPlain);

        $ctaBlock = '';
        if ($includePrimaryCta && $ctaUrl !== null && $ctaButtonLabel !== null && $footerNotePlain !== null) {
            $urlEsc = $esc($ctaUrl);
            $buttonEsc = $esc($ctaButtonLabel);
            $footerEsc = $esc($footerNotePlain);
            $ctaBlock = <<<HTML
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;width:100%;">
              <tr>
                <td align="center" bgcolor="#dc2626" style="border-radius:8px;" class="bb-btn">
                  <a href="{$urlEsc}" class="bb-btn" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#dc2626;">
                    {$buttonEsc}
                  </a>
                </td>
              </tr>
            </table>
            <p class="bb-muted" style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#525252;">
              {$footerEsc}
            </p>
HTML;
            if ($includePlainUrlFallback) {
                $ctaBlock .= <<<HTML
            <p class="bb-muted" style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#737373;word-break:break-all;">
              If the button does not work, copy and paste this link into your browser:<br>
              <a href="{$urlEsc}" class="bb-link-fallback" style="color:#dc2626;">{$urlEsc}</a>
            </p>
HTML;
            }
        }

        $baseCss = self::baseEmailCss();
        $extraCssSafe = $extraCss;

        return <<<HTML
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{$titleEsc}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style type="text/css">
{$baseCss}
{$extraCssSafe}
</style>
</head>
<body class="bb-outer" style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<span class="bb-preheader" style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
  {$preheaderEsc}
</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bb-outer" style="background-color:#f4f4f5;width:100%;">
  <tr>
    <td align="center" class="bb-shell-pad" style="padding:20px 12px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bb-card-wrap" style="max-width:560px;width:100%;">
        <tr>
          <td class="bb-card-top bb-card-pad" style="padding:24px 22px 10px;border:1px solid #e5e5e5;border-radius:12px 12px 0 0;background-color:#ffffff;border-bottom:none;">
            <p class="bb-brand" style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#171717;line-height:1.2;">
              <span style="color:#dc2626;">a</span>rgoned<span style="color:#dc2626;">.</span>
            </p>
          </td>
        </tr>
        <tr>
          <td class="bb-card-body bb-card-pad" style="padding:10px 22px 26px;border:1px solid #e5e5e5;border-radius:0 0 12px 12px;background-color:#ffffff;border-top:none;">
            <p class="bb-greeting" style="margin:0 0 14px;font-size:18px;font-weight:600;color:#171717;line-height:1.3;">{$greetingEsc}</p>
            {$bodyHtml}
            {$ctaBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 8px 0;text-align:center;">
            <p class="bb-muted" style="margin:0;font-size:12px;line-height:1.5;color:#737373;">
              &copy; {$year} {$productEsc}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
HTML;
    }

    private static function baseEmailCss(): string
    {
        $font = self::FONT_STACK;

        return <<<CSS
  #MessageViewBody, #MessageWebViewDiv { width: 100% !important; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: {$font} !important; }
  table, td, th, p, a, li, span { font-family: {$font} !important; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  .bb-text { color: #171717; }
  .bb-muted { color: #525252; }
  @media only screen and (max-width: 620px) {
    .bb-card-pad { padding-left: 18px !important; padding-right: 18px !important; }
    .bb-shell-pad { padding-left: 10px !important; padding-right: 10px !important; }
    .bb-greeting { font-size: 17px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .bb-outer { background-color: #171717 !important; }
    .bb-card-top, .bb-card-body { background-color: #262626 !important; border-color: #404040 !important; }
    .bb-text, .bb-greeting, .bb-brand { color: #fafafa !important; }
    .bb-muted { color: #a3a3a3 !important; }
    .bb-btn { background-color: #dc2626 !important; }
    .bb-btn a { color: #ffffff !important; }
    .bb-link-fallback { color: #fca5a5 !important; }
  }
CSS;
    }
}
