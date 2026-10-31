import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CompanyProfile, ReportFilterMode, TimeEntry } from '../types';
import {
  formatIsoDateGerman,
  formatIsoDateLongGerman,
  formatMinutesAsDecimalGerman,
  formatMinutesAsHHMM,
  formatPostalAndCity,
  formatStreetAndNumber,
  formatYearMonthGerman,
} from './timeAndFormat';

export interface ExportReportOptions {
  entries: TimeEntry[];
  mode: ReportFilterMode;
  selectedDate: string; // YYYY-MM-DD
  selectedMonth: string; // YYYY-MM
  customerFilterName?: string;
  profile: CompanyProfile;
}

function getPeriodLabel(options: ExportReportOptions): string {
  if (options.mode === 'day') {
    return `Tagesnachweis - ${formatIsoDateLongGerman(options.selectedDate)}`;
  }
  return `Monatsnachweis - ${formatYearMonthGerman(options.selectedMonth)}`;
}

function getFileSafeSlug(options: ExportReportOptions): string {
  const base =
    options.mode === 'day'
      ? `Tag_${options.selectedDate}`
      : `Monat_${options.selectedMonth}`;
  if (options.customerFilterName) {
    const cleanCust = options.customerFilterName
      .replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 28);
    return `Einsatznachweis_${base}_${cleanCust}`;
  }
  return `Einsatznachweis_${base}`;
}

export function exportEntriesToPdf(options: ExportReportOptions): void {
  const { entries, profile, customerFilterName } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const sorted = [...entries].sort((a, b) =>
    `${a.date}_${a.startTime}`.localeCompare(`${b.date}_${b.startTime}`)
  );

  const totalMinutes = sorted.reduce((acc, e) => acc + e.durationMinutes, 0);
  const totalBreak = sorted.reduce((acc, e) => acc + (e.breakMinutes || 0), 0);
  const uniqueCustomers = new Set(sorted.map((e) => e.customerName)).size;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Arbeitszeit- und Einsatznachweis', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(getPeriodLabel(options), 14, 24.5);

  if (customerFilterName) {
    doc.text(`Kundenfilter: ${customerFilterName}`, 14, 30);
  }

  // Right-aligned company & employee metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.companyName || 'Einsatzbetrieb', 196, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const empLine = profile.employeeId
    ? `${profile.employeeName} (Pers.-Nr. ${profile.employeeId})`
    : profile.employeeName;
  if (empLine) {
    doc.text(empLine, 196, 23.5, { align: 'right' });
  }
  const nowFormatted = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  doc.text(`Erstellt am: ${nowFormatted} Uhr`, 196, 28.5, { align: 'right' });

  // Hairline divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(14, 34, 196, 34);

  // Summary block
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 16, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Erfasste Einsätze', 19, 44);
  doc.text('Kunden', 68, 44);
  doc.text('Gesamtzeit (Std:Min)', 112, 44);
  doc.text('Industriestunden', 158, 44);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(String(sorted.length), 19, 50.5);
  doc.text(String(uniqueCustomers), 68, 50.5);
  doc.text(`${formatMinutesAsHHMM(totalMinutes)} Std.`, 112, 50.5);
  doc.text(`${formatMinutesAsDecimalGerman(totalMinutes)} Std.`, 158, 50.5);

  const tableRows = sorted.map((entry) => [
    formatIsoDateGerman(entry.date),
    entry.customerName,
    `${formatStreetAndNumber(entry.street, entry.houseNumber)}\n${formatPostalAndCity(
      entry.postalCode,
      entry.city
    )}`,
    entry.startTime,
    entry.endTime,
    entry.breakMinutes > 0 ? `${entry.breakMinutes}m` : '-',
    `${formatMinutesAsHHMM(entry.durationMinutes)}\n(${formatMinutesAsDecimalGerman(
      entry.durationMinutes
    )} h)`,
    entry.note || '-',
  ]);

  autoTable(doc, {
    startY: 59,
    head: [
      [
        'Datum',
        'Kunde',
        'Standort (GPS / Adresse)',
        'Beginn',
        'Ende',
        'Pause',
        'Netto',
        'Tätigkeit / Notiz',
      ],
    ],
    body:
      tableRows.length > 0
        ? tableRows
        : [['-', 'Keine Einträge im gewählten Zeitraum', '-', '-', '-', '-', '00:00', '-']],
    foot:
      tableRows.length > 0
        ? [
            [
              'GESAMT',
              `${sorted.length} ${sorted.length === 1 ? 'Einsatz' : 'Einsätze'}`,
              '',
              '',
              '',
              totalBreak > 0 ? `${totalBreak}m` : '-',
              `${formatMinutesAsHHMM(totalMinutes)} (${formatMinutesAsDecimalGerman(
                totalMinutes
              )} h)`,
              '',
            ],
          ]
        : undefined,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.2,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'top',
    },
    headStyles: {
      fillColor: [29, 78, 216],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.2,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 19 },
      1: { cellWidth: 31 },
      2: { cellWidth: 40 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 13, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 29 },
    },
    margin: { left: 14, right: 14 },
  });

  // Signature area below table
  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150;
  let sigY = finalY + 22;
  if (sigY > 268) {
    doc.addPage();
    sigY = 36;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(14, sigY, 92, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Datum, Unterschrift Mitarbeiter', 14, sigY + 5);

  doc.save(`${getFileSafeSlug(options)}.pdf`);
}

export function exportEntriesToExcel(options: ExportReportOptions): void {
  const { entries, profile, customerFilterName } = options;
  const sorted = [...entries].sort((a, b) =>
    `${a.date}_${a.startTime}`.localeCompare(`${b.date}_${b.startTime}`)
  );

  const totalMinutes = sorted.reduce((acc, e) => acc + e.durationMinutes, 0);
  const totalBreak = sorted.reduce((acc, e) => acc + (e.breakMinutes || 0), 0);
  const totalDecimal = Number((totalMinutes / 60).toFixed(2));

  const headerInfo: (string | number)[][] = [
    ['Arbeitszeit- und Einsatznachweis', '', '', '', '', '', '', '', '', '', '', ''],
    ['Betrieb:', profile.companyName || '-', '', 'Mitarbeiter:', profile.employeeName || '-', 'Pers.-Nr.:', profile.employeeId || '-'],
    ['Zeitraum:', getPeriodLabel(options), '', 'Kundenfilter:', customerFilterName || 'Alle Kunden'],
    [],
    [
      'Datum',
      'Kunden-Nr.',
      'Kunde',
      'Straße',
      'Hausnummer',
      'PLZ',
      'Ort',
      'GPS-Koordinaten',
      'Anfangszeit',
      'Endzeit',
      'Pause (Min.)',
      'Dauer (HH:MM)',
      'Stunden (Dezimal)',
      'Tätigkeit / Bemerkung',
    ],
  ];

  const dataRows: (string | number)[][] = sorted.map((e) => [
    formatIsoDateGerman(e.date),
    e.customerNumber || '',
    e.customerName,
    e.street,
    e.houseNumber,
    e.postalCode,
    e.city,
    e.latitude !== undefined && e.longitude !== undefined
      ? `${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}`
      : '',
    e.startTime,
    e.endTime,
    e.breakMinutes || 0,
    formatMinutesAsHHMM(e.durationMinutes),
    Number((e.durationMinutes / 60).toFixed(2)),
    e.note || '',
  ]);

  const footerRows: (string | number)[][] = [
    [],
    [
      'GESAMTSUMME',
      '',
      `${sorted.length} Einsätze`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalBreak,
      formatMinutesAsHHMM(totalMinutes),
      totalDecimal,
      '',
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([...headerInfo, ...dataRows, ...footerRows]);
  worksheet['!cols'] = [
    { wch: 12 }, // Datum
    { wch: 13 }, // Kunden-Nr.
    { wch: 28 }, // Kunde
    { wch: 24 }, // Straße
    { wch: 12 }, // Hausnr
    { wch: 9 },  // PLZ
    { wch: 18 }, // Ort
    { wch: 21 }, // GPS
    { wch: 12 }, // Anfang
    { wch: 12 }, // Ende
    { wch: 13 }, // Pause
    { wch: 15 }, // Dauer HH:MM
    { wch: 18 }, // Dezimal
    { wch: 34 }, // Notiz
  ];

  // Second sheet: summary per customer
  const byCustomer = new Map<string, { count: number; minutes: number; number?: string }>();
  for (const e of sorted) {
    const prev = byCustomer.get(e.customerName) || { count: 0, minutes: 0, number: e.customerNumber };
    byCustomer.set(e.customerName, {
      count: prev.count + 1,
      minutes: prev.minutes + e.durationMinutes,
      number: prev.number || e.customerNumber,
    });
  }

  const summaryRows: (string | number)[][] = [
    ['Kundenübersicht - ' + getPeriodLabel(options)],
    [],
    ['Kunden-Nr.', 'Kunde', 'Anzahl Einsätze', 'Gesamtzeit (HH:MM)', 'Stunden (Dezimal)'],
    ...Array.from(byCustomer.entries()).map(([name, stat]) => [
      stat.number || '',
      name,
      stat.count,
      formatMinutesAsHHMM(stat.minutes),
      Number((stat.minutes / 60).toFixed(2)),
    ]),
    [],
    ['GESAMT', 'Alle erfassten Kunden', sorted.length, formatMinutesAsHHMM(totalMinutes), totalDecimal],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 17 },
    { wch: 19 },
    { wch: 19 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Einsatznachweis');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Kundenübersicht');

  XLSX.writeFile(workbook, `${getFileSafeSlug(options)}.xlsx`);
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadPrintableHtmlFile(options: ExportReportOptions): void {
  const { entries, profile, customerFilterName } = options;
  const sorted = [...entries].sort((a, b) =>
    `${a.date}_${a.startTime}`.localeCompare(`${b.date}_${b.startTime}`)
  );
  const totalMinutes = sorted.reduce((acc, e) => acc + e.durationMinutes, 0);

  const rowsHtml =
    sorted.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Keine Einsätze im ausgewählten Zeitraum vorhanden.</td></tr>`
      : sorted
          .map(
            (e) => `<tr>
          <td>${escapeHtml(formatIsoDateGerman(e.date))}</td>
          <td><strong>${escapeHtml(e.customerName)}</strong>${
              e.customerNumber ? `<br/><span style="color:#64748b;font-size:11px;">Kd.-Nr. ${escapeHtml(e.customerNumber)}</span>` : ''
            }</td>
          <td>${escapeHtml(formatStreetAndNumber(e.street, e.houseNumber))}<br/><span style="color:#475569;">${escapeHtml(
              formatPostalAndCity(e.postalCode, e.city)
            )}</span></td>
          <td style="font-family:monospace;">${escapeHtml(e.startTime)}</td>
          <td style="font-family:monospace;">${escapeHtml(e.endTime)}</td>
          <td style="font-family:monospace;text-align:right;"><strong>${escapeHtml(
            formatMinutesAsHHMM(e.durationMinutes)
          )}</strong><br/><span style="color:#64748b;font-size:11px;">${escapeHtml(
              formatMinutesAsDecimalGerman(e.durationMinutes)
            )} Std.</span></td>
          <td>${escapeHtml(e.note || '—')}</td>
        </tr>`
          )
          .join('');

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(getPeriodLabel(options))}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 24px auto; max-width: 820px; padding: 0 16px; line-height: 1.45; }
    .top-actions { margin-bottom: 20px; padding: 12px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .print-btn { background: #1d4ed8; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-weight: 600; cursor: pointer; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    .meta { color: #475569; font-size: 13px; }
    .summary { display: flex; gap: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 600; }
    tfoot td { background: #f8fafc; font-weight: 700; }
    .sigs { display: flex; justify-content: space-between; gap: 48px; margin-top: 48px; }
    .sig-box { flex: 1; border-top: 1px solid #64748b; padding-top: 6px; font-size: 12px; color: #475569; }
    @media print { .top-actions { display: none !important; } body { margin: 0; max-width: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="top-actions">
    <span>Druckbare Einsatzdatei (${escapeHtml(getPeriodLabel(options))})</span>
    <button class="print-btn" onclick="window.print()">Jetzt drucken</button>
  </div>
  <div class="header">
    <div>
      <h1>Arbeitszeit- und Einsatznachweis</h1>
      <div class="meta">${escapeHtml(getPeriodLabel(options))}${
    customerFilterName ? ` · Kunde: ${escapeHtml(customerFilterName)}` : ''
  }</div>
    </div>
    <div style="text-align:right;" class="meta">
      <strong style="color:#0f172a;">${escapeHtml(profile.companyName || 'Einsatzbetrieb')}</strong><br/>
      ${escapeHtml(profile.employeeName || '')}${
    profile.employeeId ? ` · Pers.-Nr. ${escapeHtml(profile.employeeId)}` : ''
  }
    </div>
  </div>
  <div class="summary">
    <div>Erfasste Einsätze: <strong>${sorted.length}</strong></div>
    <div>Gesamtdauer: <strong>${escapeHtml(formatMinutesAsHHMM(totalMinutes))} Std.</strong></div>
    <div>Industriestunden: <strong>${escapeHtml(formatMinutesAsDecimalGerman(totalMinutes))} Std.</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Datum</th>
        <th>Kunde</th>
        <th>Standort (Straße, Nr., Ort)</th>
        <th>Anfang</th>
        <th>Ende</th>
        <th style="text-align:right;">Dauer</th>
        <th>Tätigkeit / Notiz</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5">Gesamtsumme (${sorted.length} ${sorted.length === 1 ? 'Einsatz' : 'Einsätze'})</td>
        <td style="text-align:right;font-family:monospace;">${escapeHtml(
          formatMinutesAsHHMM(totalMinutes)
        )} (${escapeHtml(formatMinutesAsDecimalGerman(totalMinutes))} h)</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
  <div class="sigs">
    <div class="sig-box">Ort, Datum / Unterschrift Mitarbeiter</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${getFileSafeSlug(options)}_Druckdatei.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
