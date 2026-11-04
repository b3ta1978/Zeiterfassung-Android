import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit3,
  FileSpreadsheet,
  FileText,
  Loader2,
  LocateFixed,
  Play,
  Printer,
  RotateCcw,
  Square,
} from 'lucide-react';
import { ActiveSession, Customer, GpsLocation, TimeEntry } from '../types';
import { fetchCurrentGpsAddress } from '../utils/gpsService';
import {
  calculateDurationMinutes,
  formatElapsedSinceIso,
  formatFullAddress,
  formatIsoDateGerman,
  formatMinutesAsDecimalGerman,
  formatMinutesAsHHMM,
  getCurrentTimeHHMM,
  getTodayIsoDate,
} from '../utils/timeAndFormat';
import { CustomerPicker } from './CustomerPicker';

interface TimeTrackerCardProps {
  customers: Customer[];
  session: ActiveSession;
  onUpdateSession: (updater: (prev: ActiveSession) => ActiveSession) => void;
  onCreateCustomer: (draft: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  onCompleteEntry: (endTime: string) => TimeEntry | null;
  onResetSession: () => void;
  onJumpToDayPrint: (isoDate: string) => void;
  onExportDayPdf: (isoDate: string) => void;
  onExportDayExcel: (isoDate: string) => void;
  onEditEntry?: (entry: TimeEntry) => void;
}

export const TimeTrackerCard: React.FC<TimeTrackerCardProps> = ({
  customers,
  session,
  onUpdateSession,
  onCreateCustomer,
  onCompleteEntry,
  onResetSession,
  onJumpToDayPrint,
  onExportDayPdf,
  onExportDayExcel,
  onEditEntry,
}) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastCompleted, setLastCompleted] = useState<TimeEntry | null>(null);

  const isTimerRunning = Boolean(session.startTime && session.startTimestampIso);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const currentClock = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(nowMs));

  const handleSelectCustomer = (customer: Customer) => {
    setValidationMsg(null);
    onUpdateSession((prev) => {
      const hasAddressAlready = Boolean(prev.location.street || prev.location.city);
      const nextLocation: GpsLocation = hasAddressAlready
        ? prev.location
        : {
            street: customer.defaultStreet || '',
            houseNumber: customer.defaultHouseNumber || '',
            postalCode: customer.defaultPostalCode || '',
            city: customer.defaultCity || '',
          };
      return {
        ...prev,
        customerId: customer.id,
        location: nextLocation,
      };
    });
  };

  const handleCaptureGps = async () => {
    setGpsLoading(true);
    setGpsErrorMsg(null);
    setGpsStatusMsg(null);
    try {
      const result = await fetchCurrentGpsAddress();
      onUpdateSession((prev) => ({
        ...prev,
        location: {
          street: result.location.street || prev.location.street,
          houseNumber: result.location.houseNumber || prev.location.houseNumber,
          postalCode: result.location.postalCode || prev.location.postalCode,
          city: result.location.city || prev.location.city,
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          accuracyMeters: result.location.accuracyMeters,
          capturedAt: result.location.capturedAt,
        },
      }));
      if (result.source === 'coordinates-only') {
        setGpsStatusMsg(
          'GPS-Koordinaten übernommen. Straßennamen bitte kurz prüfen oder ergänzen.'
        );
      } else {
        setGpsStatusMsg('GPS-Standort mit Straße, Hausnummer und Ort übernommen.');
      }
    } catch (err) {
      setGpsErrorMsg(
        err instanceof Error
          ? err.message
          : 'GPS-Standort konnte nicht abgerufen werden.'
      );
    } finally {
      setGpsLoading(false);
    }
  };

  const handleApplyFallbackGps = () => {
    const selectedCust = customers.find((c) => c.id === session.customerId);
    onUpdateSession((prev) => ({
      ...prev,
      location: {
        street: selectedCust?.defaultStreet || 'Spitalerstraße',
        houseNumber: selectedCust?.defaultHouseNumber || '22',
        postalCode: selectedCust?.defaultPostalCode || '20095',
        city: selectedCust?.defaultCity || 'Hamburg',
        latitude: 53.551086,
        longitude: 9.999821,
        accuracyMeters: 9,
        capturedAt: new Date().toISOString(),
      },
    }));
    setGpsErrorMsg(null);
    setGpsStatusMsg('Standort übernommen (GPS-Ortung). Felder bleiben frei anpassbar.');
  };

  const handleCaptureStartTime = () => {
    setValidationMsg(null);
    setLastCompleted(null);
    const currentHHMM = getCurrentTimeHHMM();
    const todayIso = getTodayIsoDate();
    onUpdateSession((prev) => ({
      ...prev,
      date: todayIso,
      startTime: currentHHMM,
      startTimestampIso: new Date().toISOString(),
    }));
  };

  const handleCaptureEndTimeAndSave = () => {
    setValidationMsg(null);
    if (!session.customerId) {
      setValidationMsg('Bitte zuerst oben einen Kunden auswählen oder neu anlegen.');
      return;
    }
    if (!session.startTime) {
      setValidationMsg('Bitte zuerst die Anfangszeit per Klick übernehmen.');
      return;
    }

    const endHHMM = getCurrentTimeHHMM();
    const saved = onCompleteEntry(endHHMM);
    if (saved) {
      setLastCompleted(saved);
      setGpsStatusMsg(null);
      setGpsErrorMsg(null);
    }
  };

  const previewDurationMins = session.startTime
    ? calculateDurationMinutes(session.startTime, getCurrentTimeHHMM(), session.breakMinutes)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header Strip */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Einsatz erfassen
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {formatIsoDateGerman(session.date || getTodayIsoDate())} · Aktuelle Uhrzeit {currentClock}
          </p>
        </div>
        {(session.customerId || session.startTime || session.location.street) && (
          <button
            type="button"
            onClick={() => {
              onResetSession();
              setValidationMsg(null);
              setGpsStatusMsg(null);
              setGpsErrorMsg(null);
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Zurücksetzen
          </button>
        )}
      </div>

      {/* Recently Saved Confirmation Banner */}
      {lastCompleted && !session.startTime && (
        <div className="px-5 py-4 bg-emerald-50/70 border-b border-emerald-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">
                  Einsatz in druckbare Datei gespeichert
                </div>
                <div className="text-xs text-slate-700 mt-0.5 tabular-nums">
                  {lastCompleted.customerName} · {lastCompleted.startTime} bis {lastCompleted.endTime} Uhr ·{' '}
                  {formatMinutesAsHHMM(lastCompleted.durationMinutes)} Std. ({formatMinutesAsDecimalGerman(lastCompleted.durationMinutes)} h)
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {formatFullAddress(lastCompleted)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastCompleted(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 whitespace-nowrap cursor-pointer"
            >
              Ausblenden
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onJumpToDayPrint(lastCompleted.date)}
                className="min-h-[42px] px-3 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-xs font-semibold text-slate-900 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                Druckansicht
              </button>
              <button
                type="button"
                onClick={() => onExportDayPdf(lastCompleted.date)}
                className="min-h-[42px] px-3 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-xs font-semibold text-slate-900 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => onExportDayExcel(lastCompleted.date)}
                className="min-h-[42px] px-3 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-xs font-semibold text-slate-900 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                Excel
              </button>
            </div>

            {onEditEntry && (
              <button
                type="button"
                onClick={() => onEditEntry(lastCompleted)}
                className="w-full min-h-[42px] px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Zeiten oder Pausenzeit manuell anpassen</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-200">
        {/* STEP 1: CUSTOMER */}
        <section className="p-5">
          <CustomerPicker
            customers={customers}
            selectedCustomerId={session.customerId}
            onSelectCustomer={handleSelectCustomer}
            onCreateCustomer={onCreateCustomer}
          />
        </section>

        {/* STEP 2: GPS LOCATION */}
        <section className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-semibold text-slate-900">
              02. Standort per GPS übernehmen
            </label>
            {session.location.latitude !== undefined && session.location.longitude !== undefined && (
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {session.location.latitude.toFixed(4)}, {session.location.longitude.toFixed(4)}
                {session.location.accuracyMeters ? ` · ±${session.location.accuracyMeters}m` : ''}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={gpsLoading}
            className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            {gpsLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>GPS-Position & Straße werden geladen…</span>
              </>
            ) : (
              <>
                <LocateFixed className="w-4 h-4 shrink-0" />
                <span>Aktuellen GPS-Standort übernehmen</span>
              </>
            )}
          </button>

          {gpsStatusMsg && (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              {gpsStatusMsg}
            </p>
          )}

          {gpsErrorMsg && (
            <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p>{gpsErrorMsg}</p>
              <button
                type="button"
                onClick={handleApplyFallbackGps}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/60 text-xs font-semibold text-slate-900 cursor-pointer"
              >
                Standort-Ortung simulieren (Testadresse übernehmen)
              </button>
            </div>
          )}

          {/* Street + House Number + Postal Code + City */}
          <div className="mt-3.5 grid grid-cols-12 gap-2.5">
            <div className="col-span-8">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Straße
              </label>
              <input
                type="text"
                value={session.location.street}
                onChange={(e) =>
                  onUpdateSession((prev) => ({
                    ...prev,
                    location: { ...prev.location, street: e.target.value },
                  }))
                }
                placeholder="Straßenname"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div className="col-span-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Hausnr.
              </label>
              <input
                type="text"
                value={session.location.houseNumber}
                onChange={(e) =>
                  onUpdateSession((prev) => ({
                    ...prev,
                    location: { ...prev.location, houseNumber: e.target.value },
                  }))
                }
                placeholder="Nr."
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div className="col-span-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                PLZ
              </label>
              <input
                type="text"
                value={session.location.postalCode}
                onChange={(e) =>
                  onUpdateSession((prev) => ({
                    ...prev,
                    location: { ...prev.location, postalCode: e.target.value },
                  }))
                }
                placeholder="PLZ"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div className="col-span-8">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Ort
              </label>
              <input
                type="text"
                value={session.location.city}
                onChange={(e) =>
                  onUpdateSession((prev) => ({
                    ...prev,
                    location: { ...prev.location, city: e.target.value },
                  }))
                }
                placeholder="Stadt / Gemeinde"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>
        </section>

        {/* STEP 3: START TIME */}
        <section className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-semibold text-slate-900">
              03. Anfangszeit übernehmen
            </label>
            {isTimerRunning && (
              <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700">
                Laufzeit {formatElapsedSinceIso(session.startTimestampIso, nowMs)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCaptureStartTime}
            className={`w-full min-h-[52px] px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer ${
              session.startTime
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 hover:bg-emerald-100/70'
                : 'bg-blue-700 hover:bg-blue-800 text-white'
            }`}
          >
            <Play className="w-4 h-4 shrink-0" />
            <span>
              {session.startTime
                ? `Anfangszeit gesetzt: ${session.startTime} Uhr (Neu setzen)`
                : 'Aktuelle Uhrzeit als Anfangszeit übernehmen'}
            </span>
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2.5 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Einsatzdatum
              </label>
              <input
                type="date"
                value={session.date}
                onChange={(e) =>
                  onUpdateSession((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Anfangszeit
              </label>
              <input
                type="time"
                value={session.startTime}
                onChange={(e) =>
                  onUpdateSession((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                    startTimestampIso: prev.startTimestampIso || new Date().toISOString(),
                  }))
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>
        </section>

        {/* STEP 4: END TIME & SAVE TO PRINTABLE FILE */}
        <section className="p-5 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 mb-3">
            <label className="text-sm font-semibold text-slate-900">
              04. Endzeit speichern & in Druckdatei sichern
            </label>
            {session.startTime && (
              <span className="text-xs font-mono tabular-nums text-slate-600">
                Vorschau: {formatMinutesAsHHMM(previewDurationMins)} Std.
              </span>
            )}
          </div>

          {/* Optional Break & Note */}
          <div className="mb-3.5 space-y-3">
            <div>
              <span className="block text-xs font-medium text-slate-600 mb-1.5">
                Pause abziehen (optional)
              </span>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
                {[0, 15, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      onUpdateSession((prev) => ({ ...prev, breakMinutes: mins }))
                    }
                    className={`min-h-[38px] rounded-lg text-xs font-semibold tabular-nums transition-colors whitespace-nowrap cursor-pointer ${
                      session.breakMinutes === mins
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mins === 0 ? 'Keine' : `${mins} Min.`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tätigkeit / Bemerkung für Druckbeleg (optional)
              </label>
              <input
                type="text"
                value={session.note}
                onChange={(e) =>
                  onUpdateSession((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="z. B. Montage, Wartung, Reparatur vor Ort…"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          {validationMsg && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {validationMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleCaptureEndTimeAndSave}
            disabled={!session.startTime}
            className={`w-full min-h-[54px] px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer ${
              session.startTime
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {session.startTime ? (
              <>
                <Square className="w-4 h-4 fill-current shrink-0" />
                <span>Endzeit jetzt erfassen & in Druckdatei speichern</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 shrink-0" />
                <span>Zuerst Anfangszeit starten, danach Endzeit speichern</span>
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
};
