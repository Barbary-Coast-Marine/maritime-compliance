/**
 * Generate a test audit report PDF — run with: npx tsx src/reports/generate-test.ts
 */
import { writeFileSync } from 'fs';
import { generateAuditReport, type AuditReportData } from './audit-report.js';

const testData: AuditReportData = {
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
  periodStart: '2026-03-01',
  periodEnd: '2026-03-29',
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
    { date: '2026-03-08', type: 'drill', title: 'Abandon Ship Drill (Night)', author: 'Capt. Cevan Lesieur', notes: '7 crew present. Night drill per quarterly requirement. Satisfactory.' },
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

async function main() {
  console.log('Generating test audit report...');
  const pdf = await generateAuditReport(testData);
  const outPath = new URL('../../test-audit-report.pdf', import.meta.url).pathname;
  writeFileSync(outPath, pdf);
  console.log(`Report saved to ${outPath} (${(pdf.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
