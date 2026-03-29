/**
 * USCG Inspection Audit Report — PDF Generator
 * 
 * Generates a comprehensive compliance report suitable for
 * presentation to USCG marine inspectors. Covers:
 * - Vessel identification
 * - Compliance status summary
 * - Drill log
 * - Inspection log
 * - Maintenance log
 * - Certificate expiry summary
 * - Pre-departure records
 */

import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

// ─── Types ────────────────────────────────────────────────────

export interface VesselInfo {
  name: string;
  imo: string;
  mmsi: string;
  callSign: string;
  vesselType: string;
  subchapter: string;
  grossTonnage: number;
  yearBuilt: number;
  hailingPort: string;
  operator: string;
  coiNumber: string;
  coiExpiry: string;
  lastDrydock: string;
  drydockDue: string;
  absClass?: string;
  propulsion?: string;
}

export interface ComplianceItem {
  title: string;
  citation: string;
  status: 'pass' | 'warning' | 'violation';
  lastCompleted: string | null;
  nextDue: string | null;
  daysRemaining: number | null;
}

export interface LogEntry {
  date: string;
  type: string;
  title: string;
  author: string;
  notes?: string;
}

export interface CertificateStatus {
  name: string;
  expiry: string;
  daysRemaining: number;
  status: 'valid' | 'expiring' | 'expired';
}

export interface AuditReportData {
  vessel: VesselInfo;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  compliance: ComplianceItem[];
  drillLog: LogEntry[];
  inspectionLog: LogEntry[];
  maintenanceLog: LogEntry[];
  certificates: CertificateStatus[];
  preDepartureRecords?: { date: string; captain: string; passengerCount: number; itemsCompleted: number; itemsTotal: number }[];
}

// ─── PDF Generation ───────────────────────────────────────────

const COLORS = {
  navy: '#0B1426',
  darkBlue: '#1a3a5c',
  headerBg: '#142038',
  text: '#1a1a1a',
  muted: '#555555',
  green: '#16a34a',
  amber: '#ca8a04',
  red: '#dc2626',
  lightGray: '#f0f0f0',
  white: '#ffffff',
  border: '#cccccc',
};

function statusColor(status: string): string {
  if (status === 'pass' || status === 'valid') return COLORS.green;
  if (status === 'warning' || status === 'expiring') return COLORS.amber;
  return COLORS.red;
}

function statusSymbol(status: string): string {
  if (status === 'pass' || status === 'valid') return '✓';
  if (status === 'warning' || status === 'expiring') return '⚠';
  return '✗';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function generateAuditReport(data: AuditReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `USCG Compliance Audit Report — ${data.vessel.name}`,
        Author: 'Barbary Coast Marine Compliance Platform',
        Subject: `Compliance audit for ${data.periodStart} to ${data.periodEnd}`,
        Creator: 'Maritime Compliance Platform v0.1.0',
      },
    });

    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    doc.pipe(stream);

    stream.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on('error', reject);

    try {
      renderReport(doc, data);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function renderReport(doc: PDFKit.PDFDocument, data: AuditReportData) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ─── Header ─────────────────────────────────────────────
  doc
    .rect(doc.page.margins.left, doc.y, pageWidth, 80)
    .fill(COLORS.darkBlue);

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COLORS.white)
    .text('COMPLIANCE AUDIT REPORT', doc.page.margins.left + 15, doc.y - 65, { width: pageWidth - 30 });

  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor(COLORS.white)
    .text(data.vessel.name, doc.page.margins.left + 15, doc.y + 4, { width: pageWidth - 30 });

  doc
    .fontSize(9)
    .text(
      `Period: ${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)}  |  Generated: ${formatDate(data.generatedAt)}`,
      doc.page.margins.left + 15,
      doc.y + 2,
      { width: pageWidth - 30 }
    );

  doc.y += 25;
  doc.fillColor(COLORS.text);

  // ─── Vessel Information ─────────────────────────────────
  sectionHeader(doc, 'VESSEL INFORMATION', pageWidth);

  const v = data.vessel;
  const vesselRows = [
    [`Name: ${v.name}`, `IMO: ${v.imo}`],
    [`MMSI: ${v.mmsi}`, `Call Sign: ${v.callSign}`],
    [`Type: ${v.vesselType}`, `Subchapter: ${v.subchapter}`],
    [`Gross Tonnage: ${v.grossTonnage.toLocaleString()}`, `Year Built: ${v.yearBuilt}`],
    [`Hailing Port: ${v.hailingPort}`, `Operator: ${v.operator}`],
    [`COI: ${v.coiNumber}`, `COI Expires: ${formatDate(v.coiExpiry)}`],
    [`Last Drydock: ${formatDate(v.lastDrydock)}`, `Drydock Due: ${formatDate(v.drydockDue)}`],
  ];
  if (v.absClass) vesselRows.push([`ABS Class: ${v.absClass}`, `Propulsion: ${v.propulsion || 'N/A'}`]);

  doc.font('Helvetica').fontSize(9);
  for (const [left, right] of vesselRows) {
    doc.text(left, doc.page.margins.left + 10, doc.y, { width: pageWidth / 2 - 10, continued: false });
    doc.text(right, doc.page.margins.left + pageWidth / 2, doc.y - 11, { width: pageWidth / 2 - 10 });
  }
  doc.y += 5;

  // ─── Compliance Status Summary ──────────────────────────
  sectionHeader(doc, 'COMPLIANCE STATUS', pageWidth);

  const violations = data.compliance.filter(c => c.status === 'violation');
  const warnings = data.compliance.filter(c => c.status === 'warning');
  const passing = data.compliance.filter(c => c.status === 'pass');

  const overallStatus = violations.length > 0 ? 'VIOLATIONS FOUND' : warnings.length > 0 ? 'WARNINGS' : 'COMPLIANT';
  const overallColor = violations.length > 0 ? COLORS.red : warnings.length > 0 ? COLORS.amber : COLORS.green;

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(overallColor)
    .text(overallStatus, doc.page.margins.left + 10, doc.y);

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(
      `${passing.length} passing  |  ${warnings.length} warnings  |  ${violations.length} violations  |  ${data.compliance.length} total rules evaluated`,
      doc.page.margins.left + 10,
      doc.y + 2
    );

  doc.y += 10;

  // List violations and warnings
  for (const item of [...violations, ...warnings]) {
    checkPage(doc);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(statusColor(item.status))
      .text(`${statusSymbol(item.status)} ${item.title}`, doc.page.margins.left + 15, doc.y, { width: pageWidth - 30 });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        `${item.citation}  |  Last: ${item.lastCompleted ? formatDate(item.lastCompleted) : 'Never'}  |  Due: ${item.nextDue ? formatDate(item.nextDue) : 'N/A'}`,
        doc.page.margins.left + 15,
        doc.y,
        { width: pageWidth - 30 }
      );
    doc.y += 4;
  }

  doc.fillColor(COLORS.text);
  doc.y += 5;

  // ─── Drill Log ─────────────────────────────────────────
  checkPage(doc);
  sectionHeader(doc, `DRILL LOG (${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)})`, pageWidth);

  if (data.drillLog.length === 0) {
    doc.font('Helvetica').fontSize(9).text('No drills recorded in this period.', doc.page.margins.left + 10, doc.y);
    doc.y += 5;
  } else {
    for (const entry of data.drillLog) {
      checkPage(doc);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(`${formatDate(entry.date)}  —  ${entry.title}`, doc.page.margins.left + 10, doc.y, { width: pageWidth - 20 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Conducted by: ${entry.author}`, doc.page.margins.left + 10, doc.y);

      if (entry.notes) {
        doc.text(entry.notes, doc.page.margins.left + 10, doc.y, { width: pageWidth - 20 });
      }
      doc.fillColor(COLORS.text);
      doc.y += 6;
    }
  }

  // ─── Inspection Log ─────────────────────────────────────
  checkPage(doc);
  sectionHeader(doc, `INSPECTION LOG (${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)})`, pageWidth);

  if (data.inspectionLog.length === 0) {
    doc.font('Helvetica').fontSize(9).text('No inspections recorded in this period.', doc.page.margins.left + 10, doc.y);
    doc.y += 5;
  } else {
    for (const entry of data.inspectionLog) {
      checkPage(doc);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(`${formatDate(entry.date)}  —  ${entry.title}`, doc.page.margins.left + 10, doc.y, { width: pageWidth - 20 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Inspected by: ${entry.author}`, doc.page.margins.left + 10, doc.y);

      if (entry.notes) {
        doc.text(entry.notes, doc.page.margins.left + 10, doc.y, { width: pageWidth - 20 });
      }
      doc.fillColor(COLORS.text);
      doc.y += 6;
    }
  }

  // ─── Maintenance Log ────────────────────────────────────
  checkPage(doc);
  sectionHeader(doc, `MAINTENANCE LOG (${formatDate(data.periodStart)} — ${formatDate(data.periodEnd)})`, pageWidth);

  if (data.maintenanceLog.length === 0) {
    doc.font('Helvetica').fontSize(9).text('No maintenance recorded in this period.', doc.page.margins.left + 10, doc.y);
    doc.y += 5;
  } else {
    for (const entry of data.maintenanceLog) {
      checkPage(doc);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(`${formatDate(entry.date)}  —  ${entry.title}`, doc.page.margins.left + 10, doc.y, { width: pageWidth - 20 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Performed by: ${entry.author}`, doc.page.margins.left + 10, doc.y);

      if (entry.notes) {
        doc.text(entry.notes, doc.page.margins.left + 10, doc.y, { width: pageWidth - 20 });
      }
      doc.fillColor(COLORS.text);
      doc.y += 6;
    }
  }

  // ─── Certificate Expiry Summary ─────────────────────────
  checkPage(doc);
  sectionHeader(doc, 'CERTIFICATE & DOCUMENT EXPIRY', pageWidth);

  for (const cert of data.certificates) {
    checkPage(doc);
    const sym = statusSymbol(cert.status);
    const color = statusColor(cert.status);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(color)
      .text(sym, doc.page.margins.left + 10, doc.y, { continued: true, width: 15 })
      .fillColor(COLORS.text)
      .text(`  ${cert.name}`, { continued: true, width: pageWidth / 2 - 25 });

    doc
      .fillColor(COLORS.muted)
      .text(`  Expires: ${formatDate(cert.expiry)}  (${cert.daysRemaining} days)`, { width: pageWidth / 2 });

    doc.y += 2;
  }

  // ─── Pre-Departure Records ──────────────────────────────
  if (data.preDepartureRecords && data.preDepartureRecords.length > 0) {
    checkPage(doc);
    sectionHeader(doc, 'PRE-DEPARTURE RECORDS', pageWidth);

    for (const record of data.preDepartureRecords) {
      checkPage(doc);
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(
          `${formatDate(record.date)}  |  ${record.captain}  |  ${record.passengerCount} passengers  |  ${record.itemsCompleted}/${record.itemsTotal} items checked`,
          doc.page.margins.left + 10,
          doc.y,
          { width: pageWidth - 20 }
        );
      doc.y += 2;
    }
  }

  // ─── Footer ─────────────────────────────────────────────
  doc.y += 20;
  checkPage(doc);

  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + pageWidth, doc.y)
    .strokeColor(COLORS.border)
    .stroke();

  doc.y += 8;

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.muted)
    .text(
      'This report was generated by the Barbary Coast Marine Compliance Platform. ' +
      'Compliance rules are based on USCG regulations (46 CFR) and verified by qualified personnel. ' +
      'This document is provided for informational purposes and does not constitute legal advice. ' +
      'Always consult current regulations and your local OCMI for authoritative compliance guidance.',
      doc.page.margins.left,
      doc.y,
      { width: pageWidth, align: 'center' }
    );

  doc.y += 15;
  doc
    .fontSize(7)
    .text(
      `Barbary Coast Marine  |  Maritime Compliance Platform v0.1.0  |  Generated ${new Date(data.generatedAt).toISOString()}`,
      doc.page.margins.left,
      doc.y,
      { width: pageWidth, align: 'center' }
    );
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string, pageWidth: number) {
  doc.y += 5;

  doc
    .rect(doc.page.margins.left, doc.y, pageWidth, 20)
    .fill(COLORS.headerBg);

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.white)
    .text(title, doc.page.margins.left + 10, doc.y + 5, { width: pageWidth - 20 });

  doc.y += 10;
  doc.fillColor(COLORS.text);
}

function checkPage(doc: PDFKit.PDFDocument) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
    doc.addPage();
  }
}
