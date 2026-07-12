/**
 * generateInvoicePDF
 * Renders an invoice as a styled HTML page inside a hidden iframe,
 * then triggers the browser's native Print → Save as PDF.
 * - Logo loaded from /logo.png
 * - "View on explorer" is a real clickable hyperlink in the PDF
 * - Zero dependencies
 */

export interface InvoiceData {
  invoiceId:    string;
  description:  string;
  amount:       string;
  paidBy:       string;
  paidTo:       string;
  paidAt:       string;
  remarks?:     string;
  txHash?:      string;
  explorerUrl?: string;  // tx explorer URL (preferred)
  payerExplorerUrl?: string;  // payer address explorer URL (fallback)
}

function shortId(hex: string): string {
  return `#${hex.slice(2, 10).toUpperCase()}`;
}

export function generateInvoicePDF(data: InvoiceData): void {
  const invoiceNum = shortId(data.invoiceId);
  const logoUrl    = `${window.location.origin}/logo.png`;

  const rows: { label: string; value: string; isLink?: boolean; href?: string }[] = [
    { label: 'Paid by',     value: data.paidBy },
    { label: 'Paid to',     value: data.paidTo },
  ];
  if (data.remarks) rows.push({ label: 'Note',        value: `"${data.remarks}"` });
  if (data.txHash)  rows.push({
    label: 'Transaction',
    value: data.txHash,
    isLink: !!data.explorerUrl,
    href: data.explorerUrl,
  });

  const rowsHtml = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'}">
      <td class="label">${r.label.toUpperCase()}</td>
      <td class="value mono">${
        r.isLink && r.href
          ? `<a href="${r.href}" target="_blank" style="color:#0D9488;text-decoration:underline;">${r.value}</a>`
          : r.value
      }</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${invoiceNum} — HashKey Pay</title>
<style>
  @page {
    size: A4 landscape;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #FFFFFF;
    color: #0F172A;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 100%;
    max-width: 960px;
    min-height: 540px;
    margin: 0 auto;
    padding: 44px 56px 36px;
    position: relative;
  }
  /* Top accent bar */
  .accent-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: #0D9488;
  }
  /* Header */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    padding-top: 4px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand img {
    width: 40px;
    height: 40px;
    border-radius: 9px;
    object-fit: cover;
  }
  .brand-text h2 {
    font-size: 17px;
    font-weight: 700;
    color: #0F172A;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .brand-text p {
    font-size: 11px;
    color: #64748B;
    margin-top: 2px;
  }
  .invoice-label {
    text-align: right;
  }
  .invoice-label h1 {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #0F172A;
    line-height: 1;
  }
  .invoice-label .id {
    font-size: 14px;
    font-weight: 700;
    color: #0D9488;
    margin-top: 4px;
  }
  /* Divider */
  .divider {
    border: none;
    border-top: 1px solid #E2E8F0;
    margin-bottom: 24px;
  }
  /* Amount block */
  .amount-block {
    background: #F8FAFC;
    border-radius: 10px;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .amount-left .label-sm {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #94A3B8;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .amount-left .amount {
    font-size: 40px;
    font-weight: 800;
    color: #0D9488;
    letter-spacing: -2px;
    line-height: 1;
  }
  .amount-right {
    text-align: right;
  }
  .amount-right .desc {
    font-size: 16px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 4px;
  }
  .amount-right .date {
    font-size: 13px;
    color: #64748B;
  }
  /* Details table */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-bottom: 28px;
  }
  td { padding: 10px 14px; vertical-align: top; }
  td.label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #94A3B8;
    white-space: nowrap;
    width: 140px;
  }
  td.value { color: #0F172A; word-break: break-all; }
  td.mono  { font-family: 'SFMono-Regular', 'Cascadia Code', 'Courier New', monospace; font-size: 12px; }
  /* Footer */
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #E2E8F0;
    padding-top: 14px;
    font-size: 11px;
    color: #94A3B8;
  }
  .footer a {
    color: #0D9488;
    text-decoration: underline;
    font-weight: 600;
  }
  /* Force link URL to print visibly in all PDF renderers */
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 9px;
    color: #94A3B8;
    word-break: break-all;
  }
  /* But not for the footer link — it's already the full URL */
  .footer a::after { content: none; }
  td.mono a[href]::after { content: none; }
  td.mono a {
    color: #0D9488;
    text-decoration: underline;
  }
</style>
</head>
<body>
<div class="page">
  <div class="accent-bar"></div>

  <div class="header">
    <div class="brand">
      <img src="${logoUrl}" alt="HashKey Pay logo" />
      <div class="brand-text">
        <h2>HashKey Pay</h2>
        <p>HashKey Chain · trustless payments</p>
      </div>
    </div>
    <div class="invoice-label">
      <h1>INVOICE</h1>
      <div class="id">${invoiceNum}</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="amount-block">
    <div class="amount-left">
      <div class="label-sm">Amount Paid</div>
      <div class="amount">${data.amount}</div>
    </div>
    <div class="amount-right">
      <div class="desc">${data.description}</div>
      <div class="date">${data.paidAt}</div>
    </div>
  </div>

  <table>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="footer">
    <span>Generated by HashKey Pay · HashKey Chain</span>
    ${data.explorerUrl
      ? `<a href="${data.explorerUrl}" target="_blank">View transaction on explorer →</a>`
      : data.payerExplorerUrl
      ? `<a href="${data.payerExplorerUrl}" target="_blank">View payer on explorer →</a>`
      : ''}
  </div>
</div>
</body>
</html>`;

  // Render in a hidden iframe and trigger print dialog
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for logo image to load before printing
  const img = doc.querySelector('img');
  const doPrint = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* already removed */ }
    }, 2000);
  };

  if (img) {
    img.onload  = doPrint;
    img.onerror = doPrint; // print even if logo fails to load
  } else {
    setTimeout(doPrint, 300);
  }
}
