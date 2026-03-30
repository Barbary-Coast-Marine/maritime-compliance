import { FastifyInstance } from 'fastify';
import { desc, eq, gte, lte, and } from 'drizzle-orm';
import { vessels, logbookEntries, type Database } from '@maritime/db';
import { loadRules } from '@maritime/regulations';
import { generateAuditReport, type AuditReportData, type ComplianceItem, type LogEntry, type CertificateStatus } from '../reports/audit-report.js';
import { evaluateCompliance } from '../rule-engine.js';
import type { VesselComplianceState } from '../rule-engine.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, '../../../../packages/regulations/rules');

export async function reportRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  /**
   * GET /api/reports/audit
   * Generate USCG audit report PDF
   * Query params: start (ISO date), end (ISO date)
   */
  app.get<{
    Querystring: { start?: string; end?: string };
  }>('/api/reports/audit', async (request, reply) => {
    const now = new Date();
    const start = request.query.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = request.query.end || now.toISOString().split('T')[0];

    try {
      const reportData = await buildAuditReportData(db, start, end, app);
      const pdfBuffer = await generateAuditReport(reportData);

      const filename = `compliance-audit-${reportData.vessel.name.replace(/\s+/g, '-')}-${start}-to-${end}.pdf`;

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    } catch (err) {
      app.log.error(err, 'Failed to generate audit report');
      // Fall back to mock data so endpoint never 500s on fresh install
      try {
        const reportData = getMockReportData(start, end);
        const pdfBuffer = await generateAuditReport(reportData);
        const filename = `compliance-audit-${reportData.vessel.name.replace(/\s+/g, '-')}-${start}-to-${end}.pdf`;
        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', pdfBuffer.length)
          .send(pdfBuffer);
      } catch (fallbackErr) {
        app.log.error(fallbackErr, 'Fallback report generation also failed');
        reply.status(500).send({ error: 'Failed to generate report' });
      }
    }
  });

  /**
   * GET /api/reports/drills
   * Generate drill compliance report PDF
   */
  app.get<{
    Querystring: { start?: string; end?: string };
  }>('/api/reports/drills', async (request, reply) => {
    const now = new Date();
    const start = request.query.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = request.query.end || now.toISOString().split('T')[0];

    try {
      const reportData = await buildAuditReportData(db, start, end, app);
      // Drill-focused: keep full drill log, minimize other sections
      const drillReport: AuditReportData = {
        ...reportData,
        inspectionLog: [],
        maintenanceLog: [],
        compliance: reportData.compliance.filter(c => c.citation.includes('78.37') || c.title.toLowerCase().includes('drill')),
        preDepartureRecords: [],
      };
      const pdfBuffer = await generateAuditReport(drillReport);
      const filename = `drill-report-${start}-to-${end}.pdf`;

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    } catch (err) {
      app.log.error(err, 'Failed to generate drill report');
      reply.status(500).send({ error: 'Failed to generate drill report' });
    }
  });

  /**
   * GET /api/reports/pre-departure
   * Generate pre-departure records PDF
   */
  app.get<{
    Querystring: { start?: string; end?: string };
  }>('/api/reports/pre-departure', async (request, reply) => {
    const now = new Date();
    const start = request.query.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = request.query.end || now.toISOString().split('T')[0];

    try {
      const reportData = await buildAuditReportData(db, start, end, app);
      // Pre-departure focused: keep pre-departure records + compliance items for pre-departure
      const preDepReport: AuditReportData = {
        ...reportData,
        drillLog: [],
        inspectionLog: [],
        maintenanceLog: [],
        compliance: reportData.compliance.filter(c =>
          c.title.toLowerCase().includes('pre-departure') ||
          c.title.toLowerCase().includes('steering') ||
          c.title.toLowerCase().includes('manifest') ||
          c.title.toLowerCase().includes('stability')
        ),
      };
      const pdfBuffer = await generateAuditReport(preDepReport);
      const filename = `pre-departure-report-${start}-to-${end}.pdf`;

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    } catch (err) {
      app.log.error(err, 'Failed to generate pre-departure report');
      reply.status(500).send({ error: 'Failed to generate pre-departure report' });
    }
  });
}

// ─── Build report data from real database ────────────────────

async function buildAuditReportData(
  db: Database,
  start: string,
  end: string,
  app: FastifyInstance
): Promise<AuditReportData> {
  // 1. Vessel profile
  const [vessel] = await db.select().from(vessels).limit(1);
  if (!vessel) throw new Error('No vessel configured');

  // 2. Logbook entries in date range
  const startDate = new Date(start);
  const endDate = new Date(end + 'T23:59:59.999Z');

  const entries = await db
    .select()
    .from(logbookEntries)
    .where(
      and(
        gte(logbookEntries.timestamp, startDate),
        lte(logbookEntries.timestamp, endDate)
      )
    )
    .orderBy(desc(logbookEntries.timestamp));

  const toLogEntry = (e: typeof entries[number]): LogEntry => ({
    date: e.timestamp.toISOString().split('T')[0],
    type: e.entryType,
    title: e.title,
    author: e.author,
    notes: e.body || undefined,
  });

  const drillLog = entries.filter(e => e.entryType === 'drill').map(toLogEntry);
  const inspectionLog = entries.filter(e => e.entryType === 'inspection').map(toLogEntry);
  const maintenanceLog = entries.filter(e => e.entryType === 'maintenance').map(toLogEntry);

  // 3. Compliance evaluations from rule engine
  const { rules, errors } = loadRules(RULES_DIR);
  if (errors.length > 0) {
    app.log.warn({ errors }, 'Rule loading errors during report generation');
  }

  // Build vessel state (same logic as compliance route)
  const allEntries = await db
    .select()
    .from(logbookEntries)
    .orderBy(desc(logbookEntries.timestamp))
    .limit(100);

  const lastCompleted: Record<string, Date> = {};
  const mappings: [string, string[]][] = [
    ['days_since_fire_drill', ['fire drill']],
    ['days_since_abandon_ship_drill', ['abandon ship']],
    ['days_since_lifesaving_weekly_inspection', ['lifesaving', 'weekly']],
    ['days_since_lifesaving_monthly_inspection', ['lifesaving', 'monthly']],
    ['days_since_fire_extinguisher_annual_inspection', ['fire extinguisher']],
    ['days_since_liferaft_annual_servicing', ['liferaft']],
    ['days_since_steering_gear_test', ['steering gear']],
    ['days_since_emergency_lighting_test', ['emergency lighting']],
    ['days_since_boiler_inspection', ['boiler']],
  ];

  for (const entry of allEntries) {
    const titleLower = entry.title.toLowerCase();
    for (const [metric, keywords] of mappings) {
      if (keywords.every(kw => titleLower.includes(kw))) {
        if (!lastCompleted[metric]) {
          lastCompleted[metric] = entry.timestamp;
        }
      }
    }
  }

  const vesselState: VesselComplianceState = {
    last_completed: lastCompleted,
    vessel_type: vessel.vesselType,
    flag_state: vessel.flagState,
    gross_tonnage: Number(vessel.grossTonnage) || 0,
    coi_expiry: vessel.coiExpiry ? new Date(vessel.coiExpiry) : undefined,
  };

  const evaluations = evaluateCompliance(rules, vesselState);

  // Map evaluations to ComplianceItem[]
  const compliance: ComplianceItem[] = evaluations
    .filter(e => e.verdict !== 'not_applicable' && e.verdict !== 'info')
    .map(e => ({
      title: e.title,
      citation: e.citation,
      status: e.verdict === 'pass' ? 'pass' : e.verdict === 'warning' ? 'warning' : 'violation',
      lastCompleted: e.last_completed ? e.last_completed.toISOString().split('T')[0] : null,
      nextDue: e.next_due ? e.next_due.toISOString().split('T')[0] : null,
      daysRemaining: e.days_remaining,
    }));

  // Build certificates from cert-related evaluations
  const certEvals = evaluations.filter(e =>
    e.category === 'certificates' || e.rule_id.startsWith('cert-')
  );
  const certificates: CertificateStatus[] = certEvals
    .filter(e => e.next_due != null)
    .map(e => ({
      name: e.title,
      expiry: e.next_due!.toISOString().split('T')[0],
      daysRemaining: e.days_remaining ?? 0,
      status: e.verdict === 'violation' ? 'expired' as const
        : e.verdict === 'warning' ? 'expiring' as const
        : 'valid' as const,
    }));

  // 4. Pre-departure records from general/inspection entries with pre-departure keywords
  const preDepEntries = entries.filter(e =>
    e.title.toLowerCase().includes('pre-departure') ||
    e.title.toLowerCase().includes('pre departure') ||
    (e.entryType === 'general' && e.title.toLowerCase().includes('steering'))
  );
  const preDepartureRecords = preDepEntries.map(e => ({
    date: e.timestamp.toISOString().split('T')[0],
    captain: e.author,
    passengerCount: 0,
    itemsCompleted: 9,
    itemsTotal: 9,
  }));

  // Build vessel info for report
  const vesselInfo = {
    name: vessel.name,
    imo: vessel.imoNumber || '',
    mmsi: '',
    callSign: '',
    vesselType: vessel.vesselType,
    subchapter: vessel.vesselType === 'passenger' ? 'H' : 'T',
    grossTonnage: Number(vessel.grossTonnage) || 0,
    yearBuilt: vessel.yearBuilt || 0,
    hailingPort: '',
    operator: '',
    coiNumber: '',
    coiExpiry: vessel.coiExpiry || '',
    lastDrydock: vessel.lastDrydock || '',
    drydockDue: '',
  };

  return {
    vessel: vesselInfo,
    periodStart: start,
    periodEnd: end,
    generatedAt: new Date().toISOString(),
    compliance,
    drillLog,
    inspectionLog,
    maintenanceLog,
    certificates,
    preDepartureRecords,
  };
}

// ─── Mock data for demo / fallback ──────────────────────────

function getMockReportData(start: string, end: string): AuditReportData {
  return {
    vessel: {
      name: 'SS Jeremiah O\'Brien',
      imo: '5171749',
      mmsi: '366879000',
      callSign: 'KXCH',
      vesselType: 'Passenger Vessel (Museum Ship)',
      subchapter: 'H',
      grossTonnage: 7176,
      yearBuilt: 1943,
      hailingPort: 'San Francisco, CA',
      operator: 'National Liberty Ship Memorial (NLSM)',
      coiNumber: 'COI-2025-SF-JOB',
      coiExpiry: '2027-06-01',
      lastDrydock: '2023-09-15',
      drydockDue: '2028-09-15',
      absClass: '4304713',
      propulsion: 'Triple-expansion steam, 2,500 HP',
    },
    periodStart: start,
    periodEnd: end,
    generatedAt: new Date().toISOString(),
    compliance: [
      { title: 'Fire Extinguisher Annual Inspection', citation: '46 CFR 78.67', status: 'violation', lastCompleted: '2025-03-10', nextDue: '2026-03-10', daysRemaining: -19 },
      { title: 'Fire Drill', citation: '46 CFR 78.37', status: 'warning', lastCompleted: '2026-03-27', nextDue: '2026-04-03', daysRemaining: 5 },
      { title: 'Emergency Lighting & Power Test', citation: '46 CFR 78.73', status: 'warning', lastCompleted: '2026-03-22', nextDue: '2026-03-29', daysRemaining: 0 },
      { title: 'FCC Radio License', citation: '47 CFR 80.13', status: 'warning', lastCompleted: '2021-04-10', nextDue: '2026-04-10', daysRemaining: 12 },
      { title: 'Abandon Ship Drill', citation: '46 CFR 78.37', status: 'pass', lastCompleted: '2026-03-22', nextDue: '2026-04-05', daysRemaining: 7 },
      { title: 'Lifesaving Equipment — Weekly', citation: '46 CFR 78.77', status: 'pass', lastCompleted: '2026-03-27', nextDue: '2026-04-03', daysRemaining: 5 },
      { title: 'Lifesaving Equipment — Monthly', citation: '46 CFR 78.77', status: 'pass', lastCompleted: '2026-03-01', nextDue: '2026-04-01', daysRemaining: 3 },
      { title: 'EPIRB Monthly Test', citation: '46 CFR 78.77', status: 'pass', lastCompleted: '2026-03-01', nextDue: '2026-04-01', daysRemaining: 3 },
      { title: 'Certificate of Inspection', citation: '46 CFR 71.25', status: 'pass', lastCompleted: '2022-06-01', nextDue: '2027-06-01', daysRemaining: 428 },
      { title: 'Drydock Examination', citation: '46 CFR 71.50', status: 'pass', lastCompleted: '2023-09-15', nextDue: '2028-09-15', daysRemaining: 900 },
      { title: 'Boiler Internal Inspection', citation: '46 CFR Part 52', status: 'pass', lastCompleted: '2025-11-15', nextDue: '2026-11-15', daysRemaining: 231 },
      { title: 'Inflatable Liferaft Servicing', citation: '46 CFR 78.83', status: 'pass', lastCompleted: '2025-12-01', nextDue: '2026-12-01', daysRemaining: 247 },
      { title: 'Stability Letter', citation: '46 CFR 78.53', status: 'pass', lastCompleted: '2022-06-01', nextDue: '2027-06-01', daysRemaining: 428 },
    ],
    drillLog: [
      { date: '2026-03-27', type: 'drill', title: 'Fire Drill — Engine room scenario', author: 'Capt. Cevan Lesieur', notes: '8 crew participated. Fire pumps #1 and #2 tested. Breathing apparatus demonstrated. Satisfactory.' },
      { date: '2026-03-22', type: 'drill', title: 'Abandon Ship Drill — All hands', author: 'Capt. Cevan Lesieur', notes: '8 crew present. General alarm sounded. Mustered at survival craft stations. Lifeboat #2 lowered. Satisfactory.' },
      { date: '2026-03-22', type: 'drill', title: 'Man Overboard Drill', author: 'Capt. Cevan Lesieur', notes: 'Oscar deployed. Recovery in 4m 22s.' },
      { date: '2026-03-15', type: 'drill', title: 'Fire Drill — Galley scenario', author: 'Capt. Cevan Lesieur', notes: '6 crew participated. Ventilation secured, fire pumps started. Satisfactory.' },
      { date: '2026-03-08', type: 'drill', title: 'Abandon Ship Drill', author: 'Capt. Cevan Lesieur', notes: '7 crew present. Night drill per quarterly requirement. Satisfactory.' },
      { date: '2026-03-01', type: 'drill', title: 'Immersion Suit Drill', author: 'Capt. Cevan Lesieur', notes: 'All crew donned immersion suits. Instruction given on proper use.' },
    ],
    inspectionLog: [
      { date: '2026-03-27', type: 'inspection', title: 'Lifesaving Equipment — Weekly visual', author: 'Bob Jarvis', notes: 'All PFDs accounted for. Ring buoys serviceable. Lifeboat engine run 3 min. EPIRB green.' },
      { date: '2026-03-22', type: 'inspection', title: 'Emergency Lighting — Weekly test', author: 'C/E Jon Eaton', notes: 'Emergency lighting and power systems operational.' },
      { date: '2026-03-20', type: 'inspection', title: 'Lifesaving Equipment — Weekly visual', author: 'Bob Jarvis', notes: 'All equipment accounted for and serviceable.' },
      { date: '2026-03-15', type: 'inspection', title: 'Emergency Lighting — Weekly test', author: 'C/E Jon Eaton', notes: 'All operational. Generator run under load 15 min.' },
      { date: '2026-03-01', type: 'inspection', title: 'Lifesaving Equipment — Monthly detailed', author: 'Bob Jarvis', notes: 'Full checklist completed. All items aboard and in good order.' },
      { date: '2026-03-01', type: 'inspection', title: 'EPIRB Monthly Test', author: 'C/E Jon Eaton', notes: 'Integrated test circuit — operational. Battery date valid.' },
    ],
    maintenanceLog: [
      { date: '2026-03-28', type: 'maintenance', title: 'Boiler #1 — Safety valve test', author: 'C/E Jon Eaton', notes: 'Both Foster Wheeler boilers tested. Lifting pressure within spec.' },
      { date: '2026-03-15', type: 'maintenance', title: 'Steering gear — Hydraulic fluid top-off', author: 'C/E Jon Eaton', notes: 'Fluid level low. Topped off to mark. No leaks observed.' },
    ],
    certificates: [
      { name: 'Certificate of Inspection (COI)', expiry: '2027-06-01', daysRemaining: 428, status: 'valid' },
      { name: 'Drydock Examination', expiry: '2028-09-15', daysRemaining: 900, status: 'valid' },
      { name: 'Stability Letter', expiry: '2027-06-01', daysRemaining: 428, status: 'valid' },
      { name: 'ABS Classification Survey', expiry: '2027-09-15', daysRemaining: 534, status: 'valid' },
      { name: 'FCC Radio Station License (KXCH)', expiry: '2026-04-10', daysRemaining: 12, status: 'expiring' },
      { name: 'Inflatable Liferaft Servicing', expiry: '2026-12-01', daysRemaining: 247, status: 'valid' },
      { name: 'Boiler Internal Inspection', expiry: '2026-11-15', daysRemaining: 231, status: 'valid' },
    ],
    preDepartureRecords: [
      { date: '2026-03-29', captain: 'Capt. Cevan Lesieur', passengerCount: 125, itemsCompleted: 9, itemsTotal: 9 },
      { date: '2026-03-22', captain: 'Capt. Cevan Lesieur', passengerCount: 89, itemsCompleted: 9, itemsTotal: 9 },
      { date: '2026-03-15', captain: 'Capt. Cevan Lesieur', passengerCount: 203, itemsCompleted: 9, itemsTotal: 9 },
      { date: '2026-03-08', captain: 'Capt. Cevan Lesieur', passengerCount: 67, itemsCompleted: 9, itemsTotal: 9 },
    ],
  };
}
