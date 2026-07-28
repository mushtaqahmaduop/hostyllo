import PDFDocument from 'pdfkit';
import { fmtPkr, fmtPhone } from '@hostyllo/db';

/**
 * Payment receipt, rendered on demand.
 *
 * Generated per request rather than pre-built and stored (see docs/05_API_SPECIFICATION.md
 * Module 4). A stored PDF is a snapshot, and payments in this system can be edited and voided —
 * so a file written at creation time starts lying the moment either happens, and then keeps
 * circulating as proof of a payment that no longer stands. Rendering from the row means the
 * document cannot disagree with the ledger.
 *
 * Only PDFKit's built-in Helvetica and Courier are used. Embedding a font would mean shipping
 * font files with the API container and keeping them in sync with the web app's, for a document
 * nobody reads for its typography. Courier gives the ledger column the fixed advance width that
 * §4.3 Tier 2 is really asking for.
 *
 * Urdu is deliberately out of scope here. docs/15_UI_SPEC_v1.md §4.1 permits Nastaliq in printed
 * receipt templates, but that needs an embedded Noto Nastaliq face and right-to-left layout, and
 * the UI is English-only until `ur-PK` ships.
 */

export interface ReceiptData {
  receiptNumber: string | null;
  paymentDate: Date | string | null;
  paymentMethod: string | null;
  monthLabel: string;
  status: string;

  rent: number | string;
  admissionFee: number | string;
  concession: number | string;
  extraCharges: { label: string; amount: number | string }[];
  totalDue: number | string;
  paid: number | string;
  unpaid: number | string;

  studentName: string;
  fatherName: string | null;
  studentPhone: string | null;
  roomNumber: string | null;
  bedLabel: string | null;

  hostelName: string;
  hostelTagline: string | null;
  hostelAddress: string | null;
  hostelCity: string | null;
  hostelPhone: string | null;
}

const PAGE_MARGIN = 48;
/** A4 rather than A5: it is what a hostel office printer is loaded with. */
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const INK = '#0B0B0F';
const MUTED = '#52525B';
const HAIRLINE = '#D4D4D8';
const VOID_RED = '#B91C1C';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  bank: 'Bank transfer',
  other: 'Other',
};

/**
 * Returns the document as a readable stream. The caller pipes it straight to the reply; nothing
 * touches disk, so there is no temp file to clean up and no partial artefact if the request is
 * abandoned mid-render.
 */
export function buildReceiptPdf(data: ReceiptData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    info: {
      Title: `Receipt ${data.receiptNumber ?? ''}`.trim(),
      Author: data.hostelName,
      Subject: `Rent receipt — ${data.monthLabel}`,
      Creator: 'Hostyllo',
    },
  });

  const isVoid = data.status === 'void';

  header(doc, data);
  receiptMeta(doc, data, isVoid);
  parties(doc, data);
  amounts(doc, data);
  footer(doc, isVoid);

  // A voided receipt still has to be printable — an operator may need a copy for their own
  // records — but it must never be mistakable for proof of payment. The stamp goes on last so it
  // sits above everything already drawn.
  if (isVoid) voidStamp(doc);

  doc.end();
  return doc;
}

function header(doc: PDFKit.PDFDocument, data: ReceiptData) {
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(18).text(data.hostelName, PAGE_MARGIN, PAGE_MARGIN);

  if (data.hostelTagline) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(data.hostelTagline);
  }

  const contact = [data.hostelAddress, data.hostelCity, data.hostelPhone].filter(Boolean).join(' · ');
  if (contact) {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(contact);
  }

  doc.moveDown(0.8);
  rule(doc);
}

function receiptMeta(doc: PDFKit.PDFDocument, data: ReceiptData, isVoid: boolean) {
  doc.moveDown(0.8);
  const top = doc.y;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('RENT RECEIPT', PAGE_MARGIN, top, {
    characterSpacing: 1.2,
  });
  doc
    .font('Courier-Bold')
    .fontSize(14)
    .fillColor(isVoid ? VOID_RED : INK)
    // Words, not an em dash. On screen a dash reads as "no value"; on paper handed to a student
    // it reads as a printing fault, and it is the kind of glyph that quietly falls outside a
    // built-in font's encoding (see the concession line).
    .text(data.receiptNumber ?? 'Not issued', PAGE_MARGIN, doc.y + 2);

  // Right column, same baseline as the eyebrow.
  const rightX = PAGE_MARGIN + CONTENT_WIDTH / 2;
  const rightWidth = CONTENT_WIDTH / 2;

  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('MONTH', rightX, top, {
    width: rightWidth,
    align: 'right',
    characterSpacing: 1.2,
  });
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(INK)
    .text(data.monthLabel, rightX, doc.y + 2, { width: rightWidth, align: 'right' });
}

function parties(doc: PDFKit.PDFDocument, data: ReceiptData) {
  doc.moveDown(1.2);
  rule(doc);
  doc.moveDown(0.8);

  const top = doc.y;
  const colWidth = CONTENT_WIDTH / 2 - 12;
  const rightX = PAGE_MARGIN + CONTENT_WIDTH / 2 + 12;

  const bed = [data.roomNumber ? `Room ${data.roomNumber}` : null, data.bedLabel]
    .filter(Boolean)
    .join(' · ');

  field(doc, 'RECEIVED FROM', PAGE_MARGIN, top, colWidth, [
    { value: data.studentName, bold: true },
    data.fatherName ? { value: `s/o ${data.fatherName}` } : null,
    data.studentPhone ? { value: fmtPhone(data.studentPhone), mono: true } : null,
    bed ? { value: bed } : null,
  ]);

  field(doc, 'PAYMENT', rightX, top, colWidth, [
    { value: data.paymentDate ? formatDate(data.paymentDate) : 'Not recorded', bold: true },
    { value: METHOD_LABELS[data.paymentMethod ?? ''] ?? data.paymentMethod ?? 'Not recorded' },
  ]);
}

function amounts(doc: PDFKit.PDFDocument, data: ReceiptData) {
  doc.moveDown(1.4);
  rule(doc);
  doc.moveDown(0.6);

  row(doc, 'Rent', fmtPkr(data.rent));

  if (Number(data.admissionFee ?? 0) !== 0) {
    row(doc, 'Admission fee', fmtPkr(data.admissionFee));
  }

  for (const extra of data.extraCharges) {
    row(doc, extra.label, fmtPkr(extra.amount));
  }

  if (Number(data.concession ?? 0) !== 0) {
    // Shown as a deduction, with the sign, so the arithmetic on the page is checkable by hand —
    // which is exactly what a student standing at the desk will do.
    //
    // An ASCII hyphen, not U+2212 MINUS SIGN. PDFKit's built-in Helvetica is WinAnsi-encoded and
    // has no glyph for U+2212; it rendered as a stray double-quote, which on a line reading
    // `" PKR 2,500` looks like a quotation rather than a deduction.
    row(doc, 'Concession', `- ${fmtPkr(data.concession)}`);
  }

  doc.moveDown(0.4);
  rule(doc);
  doc.moveDown(0.4);

  row(doc, 'Total due', fmtPkr(data.totalDue, 2), { bold: true });
  row(doc, 'Amount paid', fmtPkr(data.paid, 2), { bold: true });

  doc.moveDown(0.4);
  rule(doc);
  doc.moveDown(0.5);

  const balance = Number(data.unpaid ?? 0);
  row(
    doc,
    balance > 0 ? 'Balance outstanding' : 'Balance',
    fmtPkr(Math.abs(balance), 2),
    { bold: true, size: 12, emphasis: balance > 0 },
  );
}

/** Label left, figure right in Courier so a column of receipts lines up digit for digit. */
function row(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  opts: { bold?: boolean; size?: number; emphasis?: boolean } = {},
) {
  const size = opts.size ?? 10;
  const y = doc.y;

  doc
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(size)
    .fillColor(opts.emphasis ? VOID_RED : INK)
    .text(label, PAGE_MARGIN, y, { width: CONTENT_WIDTH / 2 });

  doc
    .font(opts.bold ? 'Courier-Bold' : 'Courier')
    .fontSize(size)
    .fillColor(opts.emphasis ? VOID_RED : INK)
    .text(value, PAGE_MARGIN + CONTENT_WIDTH / 2, y, {
      width: CONTENT_WIDTH / 2,
      align: 'right',
    });

  doc.moveDown(0.45);
}

function field(
  doc: PDFKit.PDFDocument,
  label: string,
  x: number,
  y: number,
  width: number,
  lines: ({ value: string; bold?: boolean; mono?: boolean } | null)[],
) {
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text(label, x, y, { width, characterSpacing: 1.2 });

  doc.moveDown(0.3);

  for (const line of lines) {
    if (!line) continue;
    doc
      .font(line.mono ? 'Courier' : line.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(line.bold ? 12 : 10)
      .fillColor(INK)
      .text(line.value, x, doc.y, { width });
    doc.moveDown(0.2);
  }
}

function footer(doc: PDFKit.PDFDocument, isVoid: boolean) {
  doc.moveDown(2);
  rule(doc);
  doc.moveDown(0.6);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      isVoid
        ? 'This payment has been voided. This document is not proof of payment.'
        : 'Computer-generated receipt. No signature required.',
      PAGE_MARGIN,
      doc.y,
      { width: CONTENT_WIDTH },
    );

  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Generated by Hostyllo', {
    width: CONTENT_WIDTH,
  });
}

function voidStamp(doc: PDFKit.PDFDocument) {
  doc.save();
  doc
    .rotate(-18, { origin: [PAGE_WIDTH / 2, 320] })
    .font('Helvetica-Bold')
    .fontSize(72)
    .fillColor(VOID_RED)
    .opacity(0.22)
    .text('VOID', 0, 280, { width: PAGE_WIDTH, align: 'center' });
  doc.restore();
}

function rule(doc: PDFKit.PDFDocument) {
  doc
    .strokeColor(HAIRLINE)
    .lineWidth(0.5)
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
    .stroke();
}

/** `05 Jul 2026`, matching the UI's date doctrine (§4.3). */
function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
