import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Coffee,
  MapPin,
  Save,
  User,
  X,
} from 'lucide-react';
import { Customer, TimeEntry } from '../types';
import {
  calculateDurationMinutes,
  formatMinutesAsDecimalGerman,
  formatMinutesAsHHMM,
} from '../utils/timeAndFormat';

interface EditBookingModalProps {
  entry: TimeEntry | null;
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: TimeEntry) => void;
}

const PAUSE_PRESETS = [0, 15, 30, 45, 60];

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  entry,
  customers,
  isOpen,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<TimeEntry | null>(entry);
  const [customPauseInput, setCustomPauseInput] = useState<string>('0');

  useEffect(() => {
    setDraft(entry);
    if (entry) {
      setCustomPauseInput(String(entry.breakMinutes || 0));
    }
  }, [entry, isOpen]);

  const liveDurationMinutes = useMemo(() => {
    if (!draft) return 0;
    return calculateDurationMinutes(
      draft.startTime,
      draft.endTime,
      draft.breakMinutes
    );
  }, [draft]);

  const rawSpanMinutes = useMemo(() => {
    if (!draft || !draft.startTime || !draft.endTime) return 0;
    const [sh, sm] = draft.startTime.split(':').map(Number);
    const [eh, em] = draft.endTime.split(':').map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
    let s = sh * 60 + sm;
    let e = eh * 60 + em;
    if (e < s) e += 24 * 60;
    return e - s;
  }, [draft]);

  if (!isOpen || !draft) return null;

  const handlePausePreset = (mins: number) => {
    setDraft((prev) => (prev ? { ...prev, breakMinutes: mins } : prev));
    setCustomPauseInput(String(mins));
  };

  const handleCustomPauseChange = (val: string) => {
    setCustomPauseInput(val);
    const num = Math.max(0, parseInt(val, 10) || 0);
    setDraft((prev) => (prev ? { ...prev, breakMinutes: num } : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    onSave({
      ...draft,
      durationMinutes: liveDurationMinutes,
    });
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Buchung anpassen
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Zeiten, Pausen oder Angaben nachträglich ändern
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/70 cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Live Calculation Preview Banner */}
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-blue-900">
                Berechnete Netto-Arbeitszeit:
              </div>
              <div className="text-xs text-blue-700 mt-0.5 tabular-nums">
                Spanne {formatMinutesAsHHMM(rawSpanMinutes)} Std.{' '}
                {draft.breakMinutes > 0 ? `· minus ${draft.breakMinutes} Min. Pause` : '· keine Pause'}
              </div>
            </div>
            <div className="text-right font-mono tabular-nums shrink-0">
              <div className="text-xl font-bold text-blue-900">
                {formatMinutesAsHHMM(liveDurationMinutes)} Std.
              </div>
              <div className="text-xs font-semibold text-blue-700">
                {formatMinutesAsDecimalGerman(liveDurationMinutes)} Industrie-Std.
              </div>
            </div>
          </div>

          {/* SECTION 1: ZEITEN & PAUSEN (Core feature requested) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>Arbeitszeit &amp; Pausenzeit anpassen</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Datum
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={draft.date}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, date: e.target.value } : prev
                      )
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Anfangszeit (Start) *
                </label>
                <input
                  type="time"
                  required
                  value={draft.startTime}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, startTime: e.target.value } : prev
                    )
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endzeit (Ende) *
                </label>
                <input
                  type="time"
                  required
                  value={draft.endTime}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, endTime: e.target.value } : prev
                    )
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            {/* PAUSENZEIT ÄNDERN */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pausenzeit ändern</span>
                </label>
                <span className="text-xs font-mono font-bold tabular-nums text-slate-700">
                  {draft.breakMinutes} Min.
                </span>
              </div>

              {/* Fast presets for pause */}
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-200/80 rounded-xl mb-3">
                {PAUSE_PRESETS.map((preset) => {
                  const isActive = draft.breakMinutes === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePausePreset(preset)}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold tabular-nums transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {preset === 0 ? '0 Min.' : `${preset} m`}
                    </button>
                  );
                })}
              </div>

              {/* Free numeric input for custom pause minutes */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                  Genaue Pause (in Min.):
                </label>
                <input
                  type="number"
                  min={0}
                  max={480}
                  step={5}
                  value={customPauseInput}
                  onChange={(e) => handleCustomPauseChange(e.target.value)}
                  placeholder="Minuten"
                  className="w-28 min-h-[42px] px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums font-semibold text-slate-900 focus:outline-none focus:border-blue-700"
                />
                <span className="text-xs text-slate-500">
                  (wird von der Einsatzdauer abgezogen)
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: KUNDE & ADRESSE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <User className="w-4 h-4 text-blue-700" />
              <span>Kunde &amp; Einsatzort</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kunde
              </label>
              <select
                value={draft.customerId}
                onChange={(e) => {
                  const selected = customers.find((c) => c.id === e.target.value);
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          customerId: e.target.value,
                          customerName: selected ? selected.name : prev.customerName,
                          customerNumber: selected?.customerNumber,
                        }
                      : prev
                  );
                }}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-700"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.customerNumber ? `(${c.customerNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-8">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Straße
                </label>
                <input
                  type="text"
                  value={draft.street}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, street: e.target.value } : prev
                    )
                  }
                  placeholder="Straße"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hausnr.
                </label>
                <input
                  type="text"
                  value={draft.houseNumber}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, houseNumber: e.target.value } : prev
                    )
                  }
                  placeholder="Hausnr."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PLZ
                </label>
                <input
                  type="text"
                  value={draft.postalCode}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, postalCode: e.target.value } : prev
                    )
                  }
                  placeholder="PLZ"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="col-span-8">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ort
                </label>
                <input
                  type="text"
                  value={draft.city}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, city: e.target.value } : prev
                    )
                  }
                  placeholder="Ort"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: TÄTIGKEIT / NOTIZ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tätigkeit / Bemerkung auf dem Beleg (optional)
            </label>
            <input
              type="text"
              value={draft.note}
              onChange={(e) =>
                setDraft((prev) =>
                  prev ? { ...prev, note: e.target.value } : prev
                )
              }
              placeholder="z. B. Wartungsarbeiten, Reparatur vor Ort…"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
            />
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[46px] rounded-xl bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Änderungen speichern</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
