import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import {
  CompanyProfile,
  Customer,
  ReportFilterMode,
  TimeEntry,
} from '../types';
import {
  downloadPrintableHtmlFile,
  exportEntriesToExcel,
  exportEntriesToPdf,
} from '../utils/exportService';
import {
  calculateDurationMinutes,
  formatIsoDateGerman,
  formatIsoDateLongGerman,
  formatMinutesAsDecimalGerman,
  formatMinutesAsHHMM,
  formatPostalAndCity,
  formatStreetAndNumber,
  formatYearMonthGerman,
  getCurrentYearMonth,
  getTodayIsoDate,
  shiftIsoDate,
  shiftYearMonth,
} from '../utils/timeAndFormat';

interface PrintableReportViewProps {
  entries: TimeEntry[];
  customers: Customer[];
  profile: CompanyProfile;
  mode: ReportFilterMode;
  onChangeMode: (mode: ReportFilterMode) => void;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  selectedCustomerFilter: string;
  onChangeCustomerFilter: (customerId: string) => void;
  onUpdateEntry: (updated: TimeEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onNotify: (message: string) => void;
  compactHeader?: boolean;
}

const GERMAN_MONTHS = [
  { value: '01', label: 'Januar' },
  { value: '02', label: 'Februar' },
  { value: '03', label: 'März' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
];

export const PrintableReportView: React.FC<PrintableReportViewProps> = ({
  entries,
  customers,
  profile,
  mode,
  onChangeMode,
  selectedDate,
  onChangeDate,
  selectedMonth,
  onChangeMonth,
  selectedCustomerFilter,
  onChangeCustomerFilter,
  onUpdateEntry,
  onDeleteEntry,
  onNotify,
  compactHeader = false,
}) => {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const matchesPeriod =
          mode === 'day'
            ? e.date === selectedDate
            : e.date.startsWith(selectedMonth);
        const matchesCustomer =
          !selectedCustomerFilter || e.customerId === selectedCustomerFilter;
        return matchesPeriod && matchesCustomer;
      })
      .sort((a, b) =>
        `${a.date}_${a.startTime}`.localeCompare(`${b.date}_${b.startTime}`)
      );
  }, [entries, mode, selectedDate, selectedMonth, selectedCustomerFilter]);

  const totalMinutes = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
    [filteredEntries]
  );

  const totalBreakMinutes = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + (e.breakMinutes || 0), 0),
    [filteredEntries]
  );

  const uniqueCustomerCount = useMemo(
    () => new Set(filteredEntries.map((e) => e.customerName)).size,
    [filteredEntries]
  );

  const selectedCustomerName = useMemo(() => {
    if (!selectedCustomerFilter) return undefined;
    return customers.find((c) => c.id === selectedCustomerFilter)?.name;
  }, [customers, selectedCustomerFilter]);

  const [yearPart, monthPart] = useMemo(() => {
    const [y, m] = (selectedMonth || getCurrentYearMonth()).split('-');
    return [y || '2026', m || '10'];
  }, [selectedMonth]);

  const availableYears = useMemo(() => {
    const years = new Set<string>(['2025', '2026', '2027']);
    years.add(String(new Date().getFullYear()));
    for (const e of entries) {
      if (e.date.length >= 4) years.add(e.date.slice(0, 4));
    }
    return Array.from(years).sort();
  }, [entries]);

  const buildExportOptions = () => ({
    entries: filteredEntries,
    mode,
    selectedDate,
    selectedMonth,
    customerFilterName: selectedCustomerName,
    profile,
  });

  const handlePrint = () => {
    window.print();
  };

  const handlePdfExport = () => {
    exportEntriesToPdf(buildExportOptions());
    onNotify('PDF-Nachweis wurde erstellt und heruntergeladen.');
  };

  const handleExcelExport = () => {
    exportEntriesToExcel(buildExportOptions());
    onNotify('Excel-Datei (.xlsx) wurde erstellt und heruntergeladen.');
  };

  const handleHtmlExport = () => {
    downloadPrintableHtmlFile(buildExportOptions());
    onNotify('Druckbare Datei (.html) wurde gespeichert.');
  };

  const handleSaveEditedEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const recalcMinutes = calculateDurationMinutes(
      editingEntry.startTime,
      editingEntry.endTime,
      editingEntry.breakMinutes
    );
    onUpdateEntry({
      ...editingEntry,
      durationMinutes: recalcMinutes,
    });
    setEditingEntry(null);
    onNotify('Einsatz aktualisiert.');
  };

  return (
    <div className="space-y-4 print-only-container">
      {/* Controls & Export Toolbar (Hidden when printing) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {compactHeader ? 'Druckdatei & Export' : 'Druckbare Einsatzdatei, PDF & Excel'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Einzelnen Tag oder kompletten Monat auswählen, drucken oder exportieren
            </p>
          </div>

          {/* Day vs Month Segmented Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => onChangeMode('day')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'day'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Einzelner Tag
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('month')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ausgewählter Monat
            </button>
          </div>
        </div>

        {/* Date / Month & Customer Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-7">
            {mode === 'day' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeDate(shiftIsoDate(selectedDate, -1))}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-700 shrink-0 cursor-pointer"
                  aria-label="Vorheriger Tag"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) onChangeDate(e.target.value);
                  }}
                  className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={() => onChangeDate(shiftIsoDate(selectedDate, 1))}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-700 shrink-0 cursor-pointer"
                  aria-label="Nächster Tag"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDate(getTodayIsoDate())}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Heute
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeMonth(shiftYearMonth(selectedMonth, -1))}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-700 shrink-0 cursor-pointer"
                  aria-label="Vorheriger Monat"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={monthPart}
                  onChange={(e) => onChangeMonth(`${yearPart}-${e.target.value}`)}
                  className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  {GERMAN_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={yearPart}
                  onChange={(e) => onChangeMonth(`${e.target.value}-${monthPart}`)}
                  className="w-24 min-h-[44px] px-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChangeMonth(shiftYearMonth(selectedMonth, 1))}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-700 shrink-0 cursor-pointer"
                  aria-label="Nächster Monat"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-5">
            <select
              value={selectedCustomerFilter}
              onChange={(e) => onChangeCustomerFilter(e.target.value)}
              aria-label="Nach Kunde filtern"
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-700"
            >
              <option value="">Alle Kunden im Zeitraum</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Print, PDF, Excel, Printable HTML */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[46px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>{mode === 'day' ? 'Tag drucken' : 'Monat drucken'}</span>
          </button>

          <button
            type="button"
            onClick={handlePdfExport}
            className="min-h-[46px] px-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Als PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExcelExport}
            className="min-h-[46px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Als Excel</span>
          </button>

          <button
            type="button"
            onClick={handleHtmlExport}
            className="min-h-[46px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-700 shrink-0" />
            <span>Druckdatei</span>
          </button>
        </div>
      </div>

      {/* DIN-A4 Printable Sheet */}
      <div
        id="printable-report-sheet"
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8"
      >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-900">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Druckbare Einsatzdatei · Arbeitszeitnachweis
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {mode === 'day'
                ? formatIsoDateLongGerman(selectedDate)
                : `Monatsnachweis ${formatYearMonthGerman(selectedMonth)}`}
            </h3>
            {selectedCustomerName && (
              <p className="text-xs font-medium text-slate-600 mt-1">
                Kunde: {selectedCustomerName}
              </p>
            )}
          </div>

          <div className="sm:text-right text-xs text-slate-600 space-y-0.5">
            <div className="font-bold text-sm text-slate-900">
              {profile.companyName || 'Einsatzbetrieb'}
            </div>
            {profile.employeeName && (
              <div>
                Mitarbeiter: {profile.employeeName}
                {profile.employeeId ? ` · ${profile.employeeId}` : ''}
              </div>
            )}
            <div className="tabular-nums text-slate-500">
              Stand: {formatIsoDateGerman(getTodayIsoDate())}
            </div>
          </div>
        </div>

        {/* Summary Metrics Bar (Unboxed clean tabular metrics) */}
        <div className="py-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-500">Erfasste Einsätze</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {filteredEntries.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Kunden im Nachweis</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {uniqueCustomerCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Gesamtzeit (Std:Min)</div>
            <div className="text-lg font-bold font-mono tabular-nums text-blue-700 mt-0.5">
              {formatMinutesAsHHMM(totalMinutes)} Std.
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Industriestunden</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {formatMinutesAsDecimalGerman(totalMinutes)} Std.
            </div>
          </div>
        </div>

        {/* Report Table */}
        {filteredEntries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Keine abgeschlossenen Einsätze für diesen Zeitraum vorhanden.
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Sobald Sie bei einem Einsatz auf „Endzeit jetzt erfassen & in Druckdatei speichern“ tippen, erscheint der Eintrag automatisch hier im druckbaren Nachweis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 pr-3 whitespace-nowrap">Datum</th>
                  <th className="py-2.5 px-3">Kunde</th>
                  <th className="py-2.5 px-3">Standort (Straße, Nr., Ort)</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Beginn</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Ende</th>
                  <th className="py-2.5 pl-3 text-right whitespace-nowrap">Netto-Dauer</th>
                  <th className="no-print py-2.5 pl-3 text-right whitespace-nowrap">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 align-top">
                    <td className="py-3 pr-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatIsoDateGerman(entry.date)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {entry.customerName}
                      </div>
                      {(entry.customerNumber || entry.note) && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {[entry.customerNumber, entry.note]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div>
                        {formatStreetAndNumber(entry.street, entry.houseNumber)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatPostalAndCity(entry.postalCode, entry.city)}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {entry.startTime}
                    </td>
                    <td className="py-3 px-2 text-center font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {entry.endTime}
                      {entry.breakMinutes > 0 && (
                        <div className="text-[11px] text-slate-400">
                          -{entry.breakMinutes}m
                        </div>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {formatMinutesAsHHMM(entry.durationMinutes)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatMinutesAsDecimalGerman(entry.durationMinutes)} h
                      </div>
                    </td>
                    <td className="no-print py-2.5 pl-3 text-right whitespace-nowrap">
                      {confirmDeleteId === entry.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteEntry(entry.id);
                              setConfirmDeleteId(null);
                              onNotify('Eintrag gelöscht.');
                            }}
                            className="min-h-[34px] px-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                          >
                            Löschen
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[34px] px-2 rounded-lg border border-slate-300 text-xs text-slate-600 cursor-pointer"
                          >
                            Nein
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingEntry({ ...entry })}
                            className="min-h-[36px] min-w-[36px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer"
                            aria-label="Eintrag bearbeiten"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center cursor-pointer"
                            aria-label="Eintrag löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold text-slate-900 text-xs sm:text-sm">
                  <td colSpan={4} className="pt-3.5 pr-3">
                    Gesamtsumme ({filteredEntries.length}{' '}
                    {filteredEntries.length === 1 ? 'Einsatz' : 'Einsätze'})
                  </td>
                  <td className="pt-3.5 px-2 text-center font-mono tabular-nums text-xs text-slate-500">
                    {totalBreakMinutes > 0 ? `Pause ${totalBreakMinutes}m` : ''}
                  </td>
                  <td className="pt-3.5 pl-3 text-right font-mono tabular-nums whitespace-nowrap">
                    <div>{formatMinutesAsHHMM(totalMinutes)} Std.</div>
                    <div className="text-xs font-normal text-slate-600">
                      {formatMinutesAsDecimalGerman(totalMinutes)} Ind.-Std.
                    </div>
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Signature Block for Print / Sign-off */}
        <div className="mt-12 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div className="border-t border-slate-400 pt-2 text-xs text-slate-600">
            Ort, Datum · Unterschrift Mitarbeiter ({profile.employeeName || 'Techniker'})
          </div>
          <div className="border-t border-slate-400 pt-2 text-xs text-slate-600">
            Ort, Datum · Unterschrift Kunde / Auftraggeber
          </div>
        </div>
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingEntry(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Einsatz bearbeiten
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedEntry} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kunde
                </label>
                <select
                  value={editingEntry.customerId}
                  onChange={(e) => {
                    const found = customers.find((c) => c.id === e.target.value);
                    setEditingEntry({
                      ...editingEntry,
                      customerId: e.target.value,
                      customerName: found ? found.name : editingEntry.customerName,
                      customerNumber: found?.customerNumber,
                    });
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, date: e.target.value })
                    }
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Anfangszeit
                  </label>
                  <input
                    type="time"
                    value={editingEntry.startTime}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, startTime: e.target.value })
                    }
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endzeit
                  </label>
                  <input
                    type="time"
                    value={editingEntry.endTime}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, endTime: e.target.value })
                    }
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Straße
                  </label>
                  <input
                    type="text"
                    value={editingEntry.street}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, street: e.target.value })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hausnr.
                  </label>
                  <input
                    type="text"
                    value={editingEntry.houseNumber}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        houseNumber: e.target.value,
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={editingEntry.postalCode}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        postalCode: e.target.value,
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div className="col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ort
                  </label>
                  <input
                    type="text"
                    value={editingEntry.city}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, city: e.target.value })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pause (Min.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={480}
                    value={editingEntry.breakMinutes}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        breakMinutes: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div className="col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tätigkeit / Notiz
                  </label>
                  <input
                    type="text"
                    value={editingEntry.note}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, note: e.target.value })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 min-h-[46px] rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] rounded-xl bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white cursor-pointer"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
