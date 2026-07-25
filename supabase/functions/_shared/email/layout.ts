export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderEmailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FEFDF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1A1A; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; box-sizing: border-box; }
    .header { background-color: #1D3A28; padding: 24px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { color: #FEFDF8; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.5px; }
    .header p { color: #C5A059; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; }
    .content { background-color: #FFFFFF; padding: 32px 24px; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; border-radius: 0 0 12px 12px; }
    .footer { text-align: center; padding: 24px; font-size: 11px; color: #6B7280; }
    .footer a { color: #2D5016; text-decoration: none; font-weight: 600; }
    .btn { display: inline-block; background-color: #2D5016; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 16px; }
    .card { background-color: #FAF8F5; border-left: 4px solid #C5A059; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6B7280; border-bottom: 2px solid #E5E7EB; padding: 8px 0; }
    .table td { padding: 12px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
    .price { text-align: right; font-family: monospace; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>S.S. PHARMACY</h1>
      <p>Authentic Ayurvedic Medicines • Mfg Lic No: R-1970/Ayur</p>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} S.S. PHARMACY. All rights reserved.</p>
      <p>Need help? Contact support at <a href="mailto:support@sspharmacy.in">support@sspharmacy.in</a></p>
    </div>
  </div>
</body>
</html>`;
}
