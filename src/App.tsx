import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Clock,
  Edit3,
  Printer,
  Smartphone,
  Users,
  WifiOff,
} from 'lucide-react';
import { CustomerManagerView } from './components/CustomerManagerView';
import { EditBookingModal } from './components/EditBookingModal';
import { PrintableReportView } from './components/PrintableReportView';
import { SettingsView } from './components/SettingsView';
import { TimeTrackerCard } from './components/TimeTrackerCard';
import {
  createInitialCustomers,
  createInitialEntries,
  DEFAULT_COMPANY_PROFILE,
} from './data/seedData';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  ActiveSession,
  AppTab,
  CompanyProfile,
  Customer,
  ReportFilterMode,
  TimeEntry,
} from './types';
import { exportEntriesToExcel, exportEntriesToPdf } from './utils/exportService';
import {
  calculateDurationMinutes,
  formatFullAddress,
  formatIsoDateGerman,
  formatMinutesAsDecimalGerman,
  formatMinutesAsHHMM,
  getCurrentYearMonth,
  getTodayIsoDate,
} from './utils/timeAndFormat';

const STORAGE_KEYS = {
  customers: 'zeitort_customers_v1',
  entries: 'zeitort_entries_v1',
  session: 'zeitort_active_session_v1',
  profile: 'zeitort_company_profile_v1',
};

function createEmptySession(): ActiveSession {
  return {
    customerId: '',
    location: {
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
    },
    date: getTodayIsoDate(),
    startTime: '',
    startTimestampIso: null,
    breakMinutes: 0,
    note: '',
  };
}

function loadFromStorage<T>(key: string, fallback: () => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback();
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Track);

  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage(STORAGE_KEYS.customers, createInitialCustomers)
  );
  const [entries, setEntries] = useState<TimeEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.entries, createInitialEntries)
  );
  const [session, setSession] = useState<ActiveSession>(() =>
    loadFromStorage(STORAGE_KEYS.session, createEmptySession)
  );
  const [profile, setProfile] = useState<CompanyProfile>(() =>
    loadFromStorage(STORAGE_KEYS.profile, () => DEFAULT_COMPANY_PROFILE)
  );

  // Report filter state (Day vs Month + Customer)
  const [reportMode, setReportMode] = useState<ReportFilterMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIsoDate());
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getCurrentYearMonth()
  );
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('');
  const [editingBooking, setEditingBooking] = useState<TimeEntry | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    canPromptNatively,
    isInstalled,
    isOnline,
    triggerNativeInstall,
  } = usePWAInstall();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));
    } catch {
      // Ignore storage quota errors
    }
  }, [customers]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
    } catch {
      // Ignore storage quota errors
    }
  }, [entries]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    } catch {
      // Ignore storage quota errors
    }
  }, [session]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  const showNotification = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3400);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const handleCreateCustomer = useCallback(
    (draft: Omit<Customer, 'id' | 'createdAt'>): Customer => {
      const created: Customer = {
        ...draft,
        id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [created, ...prev]);
      showNotification(`Kunde „${created.name}“ neu angelegt.`);
      return created;
    },
    [showNotification]
  );

  const handleUpdateCustomer = useCallback((updated: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setEntries((prev) =>
      prev.map((e) =>
        e.customerId === updated.id
          ? {
              ...e,
              customerName: updated.name,
              customerNumber: updated.customerNumber,
            }
          : e
      )
    );
  }, []);

  const handleDeleteCustomer = useCallback((customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    setSession((prev) =>
      prev.customerId === customerId ? { ...prev, customerId: '' } : prev
    );
    setSelectedCustomerFilter((prev) => (prev === customerId ? '' : prev));
  }, []);

  const handleCompleteEntry = useCallback(
    (endTimeHHMM: string): TimeEntry | null => {
      const customer = customers.find((c) => c.id === session.customerId);
      if (!customer || !session.startTime) return null;

      const entryDate = session.date || getTodayIsoDate();
      const durationMinutes = calculateDurationMinutes(
        session.startTime,
        endTimeHHMM,
        session.breakMinutes
      );

      const newEntry: TimeEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerId: customer.id,
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        date: entryDate,
        street: session.location.street.trim(),
        houseNumber: session.location.houseNumber.trim(),
        postalCode: session.location.postalCode.trim(),
        city: session.location.city.trim(),
        latitude: session.location.latitude,
        longitude: session.location.longitude,
        startTime: session.startTime,
        endTime: endTimeHHMM,
        breakMinutes: session.breakMinutes,
        durationMinutes,
        note: session.note.trim(),
        createdAt: new Date().toISOString(),
      };

      setEntries((prev) => [...prev, newEntry]);
      setSelectedDate(entryDate);
      setSelectedMonth(entryDate.slice(0, 7));

      // Reset session for next assignment while keeping date current
      setSession(createEmptySession());
      showNotification('Endzeit gespeichert und in druckbare Datei übernommen.');
      return newEntry;
    },
    [customers, session, showNotification]
  );

  const handleUpdateEntry = useCallback((updated: TimeEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const handleDeleteEntry = useCallback((entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  const handleSelectCustomerForTracking = useCallback((customer: Customer) => {
    setSession((prev) => ({
      ...prev,
      customerId: customer.id,
      location:
        prev.location.street || prev.location.city
          ? prev.location
          : {
              street: customer.defaultStreet || '',
              houseNumber: customer.defaultHouseNumber || '',
              postalCode: customer.defaultPostalCode || '',
              city: customer.defaultCity || '',
            },
    }));
    setActiveTab(AppTab.Track);
  }, []);

  const handleJumpToDayPrint = useCallback((isoDate: string) => {
    setReportMode('day');
    setSelectedDate(isoDate);
    setSelectedCustomerFilter('');
    setActiveTab(AppTab.Reports);
  }, []);

  const handleQuickDayPdf = useCallback(
    (isoDate: string) => {
      const dayEntries = entries.filter((e) => e.date === isoDate);
      exportEntriesToPdf({
        entries: dayEntries,
        mode: 'day',
        selectedDate: isoDate,
        selectedMonth: isoDate.slice(0, 7),
        profile,
      });
      showNotification('Tagesnachweis als PDF heruntergeladen.');
    },
    [entries, profile, showNotification]
  );

  const handleQuickDayExcel = useCallback(
    (isoDate: string) => {
      const dayEntries = entries.filter((e) => e.date === isoDate);
      exportEntriesToExcel({
        entries: dayEntries,
        mode: 'day',
        selectedDate: isoDate,
        selectedMonth: isoDate.slice(0, 7),
        profile,
      });
      showNotification('Tagesnachweis als Excel (.xlsx) heruntergeladen.');
    },
    [entries, profile, showNotification]
  );


  const todayEntries = useMemo(() => {
    const today = getTodayIsoDate();
    return entries
      .filter((e) => e.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [entries]);

  const todayTotalMinutes = useMemo(
    () => todayEntries.reduce((acc, e) => acc + e.durationMinutes, 0),
    [todayEntries]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-10">
      {/* Desktop Top Bar (Strict 3-Zone Contract) & Compact Mobile App Bar */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 h-12 md:h-16 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab(AppTab.Track)}
            className="flex items-center gap-2.5 text-base md:text-lg font-bold tracking-tight text-slate-900 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-blue-800 transition-colors">
              <Clock className="w-4 h-4" />
            </span>
            <span>Zeiterfassung</span>
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab(AppTab.Track)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === AppTab.Track
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Erfassung
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(AppTab.Reports)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === AppTab.Reports
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Druck & Export
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(AppTab.Customers)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === AppTab.Customers
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Kunden
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(AppTab.Settings)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === AppTab.Settings
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              Betriebsdaten
            </button>
          </nav>

          {/* Zone 3 */}
          {canPromptNatively && !isInstalled && (
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerNativeInstall().then((ok) => {
                    if (ok) showNotification('Android-App wird installiert.');
                  });
                }}
                className="min-h-[36px] md:min-h-[40px] px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>App installieren</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs font-medium text-amber-900">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              Offline-Modus aktiv: Kunden, Zeiten, PDF- und Excel-Exporte funktionieren lokal weiter.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        {/* TAB 1: TRACKING (Mobile single-column + Desktop 2-column split with live Printable File) */}
        {activeTab === AppTab.Track && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="no-print lg:col-span-5 space-y-5">
              <TimeTrackerCard
                customers={customers}
                session={session}
                onUpdateSession={setSession}
                onCreateCustomer={handleCreateCustomer}
                onCompleteEntry={handleCompleteEntry}
                onResetSession={() => setSession(createEmptySession())}
                onJumpToDayPrint={handleJumpToDayPrint}
                onExportDayPdf={handleQuickDayPdf}
                onExportDayExcel={handleQuickDayExcel}
                onEditEntry={setEditingBooking}
              />

              {/* Mobile Today Summary Card (visible below tracker on mobile/tablet) */}
              <div className="lg:hidden bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Heutige Druckdatei ({formatIsoDateGerman(getTodayIsoDate())})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {todayEntries.length}{' '}
                      {todayEntries.length === 1 ? 'Einsatz' : 'Einsätze'} ·{' '}
                      {formatMinutesAsHHMM(todayTotalMinutes)} Std. (
                      {formatMinutesAsDecimalGerman(todayTotalMinutes)} h)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJumpToDayPrint(getTodayIsoDate())}
                    className="min-h-[40px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Tag / Monat öffnen</span>
                  </button>
                </div>

                {todayEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 pt-3">
                    Noch kein abgeschlossener Einsatz für heute gespeichert.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {todayEntries.map((entry) => (
                      <div key={entry.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {entry.customerName}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {formatFullAddress(entry)}
                          </div>
                          <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                            {entry.startTime} – {entry.endTime}
                            {entry.breakMinutes > 0 ? ` · Pause: ${entry.breakMinutes} Min.` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right font-mono tabular-nums">
                            <div className="text-xs text-blue-700 font-bold">
                              {formatMinutesAsHHMM(entry.durationMinutes)} Std.
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatMinutesAsDecimalGerman(entry.durationMinutes)} h
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingBooking(entry)}
                            className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            aria-label="Buchung bearbeiten"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                            <span>Anpassen</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Printable Day/Month Report Pane on Desktop + Print Target */}
            <div className="hidden lg:block lg:col-span-7 print-only-container">
              <PrintableReportView
                entries={entries}
                customers={customers}
                profile={profile}
                mode={reportMode}
                onChangeMode={setReportMode}
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                selectedMonth={selectedMonth}
                onChangeMonth={setSelectedMonth}
                selectedCustomerFilter={selectedCustomerFilter}
                onChangeCustomerFilter={setSelectedCustomerFilter}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onNotify={showNotification}
                compactHeader
              />
            </div>
          </div>
        )}

        {/* TAB 2: FULL PRINTABLE REPORT, DAY/MONTH SELECTOR, PDF & EXCEL EXPORT */}
        {activeTab === AppTab.Reports && (
          <PrintableReportView
            entries={entries}
            customers={customers}
            profile={profile}
            mode={reportMode}
            onChangeMode={setReportMode}
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
            selectedMonth={selectedMonth}
            onChangeMonth={setSelectedMonth}
            selectedCustomerFilter={selectedCustomerFilter}
            onChangeCustomerFilter={setSelectedCustomerFilter}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onNotify={showNotification}
          />
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === AppTab.Customers && (
          <>
            <div className="no-print">
              <CustomerManagerView
                customers={customers}
                entries={entries}
                onCreateCustomer={handleCreateCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onSelectForTracking={handleSelectCustomerForTracking}
                onNotify={showNotification}
              />
            </div>
            <div className="hidden print-only-container">
              <PrintableReportView
                entries={entries}
                customers={customers}
                profile={profile}
                mode={reportMode}
                onChangeMode={setReportMode}
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                selectedMonth={selectedMonth}
                onChangeMonth={setSelectedMonth}
                selectedCustomerFilter={selectedCustomerFilter}
                onChangeCustomerFilter={setSelectedCustomerFilter}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onNotify={showNotification}
              />
            </div>
          </>
        )}

        {/* TAB 4: SETTINGS & ANDROID INSTALL */}
        {activeTab === AppTab.Settings && (
          <>
            <div className="no-print">
              <SettingsView
                profile={profile}
                onSaveProfile={setProfile}
                customers={customers}
                entries={entries}
                onImportBackup={(data) => {
                  if (data.profile) setProfile(data.profile);
                  setCustomers(data.customers);
                  setEntries(data.entries);
                }}
                onResetToEmpty={() => setEntries([])}
                canPromptNatively={canPromptNatively}
                isInstalled={isInstalled}
                onInstallApp={triggerNativeInstall}
                onNotify={showNotification}
              />
            </div>
            <div className="hidden print-only-container">
              <PrintableReportView
                entries={entries}
                customers={customers}
                profile={profile}
                mode={reportMode}
                onChangeMode={setReportMode}
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
                selectedMonth={selectedMonth}
                onChangeMonth={setSelectedMonth}
                selectedCustomerFilter={selectedCustomerFilter}
                onChangeCustomerFilter={setSelectedCustomerFilter}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onNotify={showNotification}
              />
            </div>
          </>
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Anchor, <= 15% total sticky height) */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab(AppTab.Track)}
          className={`h-full flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === AppTab.Track ? 'text-blue-700' : 'text-slate-500'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap">
            Erfassung
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(AppTab.Reports)}
          className={`h-full flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === AppTab.Reports ? 'text-blue-700' : 'text-slate-500'
          }`}
        >
          <Printer className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap">
            Druck & PDF
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(AppTab.Customers)}
          className={`h-full flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === AppTab.Customers ? 'text-blue-700' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap">
            Kunden
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(AppTab.Settings)}
          className={`h-full flex flex-col items-center justify-center transition-colors cursor-pointer ${
            activeTab === AppTab.Settings ? 'text-blue-700' : 'text-slate-500'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap">
            Betrieb
          </span>
        </button>
      </nav>

      {/* Edit Booking Modal (Manual time and break adjustment) */}
      <EditBookingModal
        entry={editingBooking}
        customers={customers}
        isOpen={Boolean(editingBooking)}
        onClose={() => setEditingBooking(null)}
        onSave={(updated) => {
          handleUpdateEntry(updated);
          showNotification('Buchungszeiten und Pause erfolgreich aktualisiert.');
        }}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-18 md:bottom-6 right-4 left-4 sm:left-auto z-50 sm:max-w-sm bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center justify-between gap-3"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-300 hover:text-white font-semibold cursor-pointer"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
