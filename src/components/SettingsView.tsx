import React, { useState } from 'react';
import { Download, RotateCcw, Save, Smartphone, Upload } from 'lucide-react';
import { CompanyProfile, Customer, TimeEntry } from '../types';

interface SettingsViewProps {
  profile: CompanyProfile;
  onSaveProfile: (profile: CompanyProfile) => void;
  customers: Customer[];
  entries: TimeEntry[];
  onImportBackup: (data: {
    profile?: CompanyProfile;
    customers: Customer[];
    entries: TimeEntry[];
  }) => void;
  onResetToEmpty: () => void;
  canPromptNatively: boolean;
  isInstalled: boolean;
  onInstallApp: () => Promise<boolean>;
  onNotify: (message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onSaveProfile,
  customers,
  entries,
  onImportBackup,
  onResetToEmpty,
  canPromptNatively,
  isInstalled,
  onInstallApp,
  onNotify,
}) => {
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [employeeName, setEmployeeName] = useState(profile.employeeName);
  const [employeeId, setEmployeeId] = useState(profile.employeeId);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      companyName: companyName.trim(),
      employeeName: employeeName.trim(),
      employeeId: employeeId.trim(),
    });
    onNotify('Betriebs- und Mitarbeiterdaten für Druckbelege gespeichert.');
  };

  const handleExportJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      customers,
      entries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZeitOrt_Sicherung_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    onNotify('Datensicherung (.json) heruntergeladen.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.customers) && Array.isArray(parsed.entries)) {
          onImportBackup(parsed);
          onNotify('Datensicherung erfolgreich wiederhergestellt.');
        } else {
          onNotify('Ungültiges Dateiformat der Sicherungsdatei.');
        }
      } catch {
        onNotify('Sicherungsdatei konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Company & Employee Info for Print / PDF / Excel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-900">
          Angaben auf Druckdatei, PDF & Excel
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Diese Angaben erscheinen automatisch im Briefkopf jedes Tages- und Monatsnachweises.
        </p>

        <form onSubmit={handleSubmitProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Firmenname / Betrieb
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="z. B. Meisterbetrieb Haustechnik GmbH"
              className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mitarbeitername
              </label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Vor- und Nachname"
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Personalnummer (optional)
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="z. B. MA-104"
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[48px] px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Angaben speichern</span>
          </button>
        </form>
      </div>

      {/* Android Installation & Local Data Backup */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-200">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900">
                Als Android-App auf dem Startbildschirm nutzen
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                ZeitOrt Mobil ist als installierbare Android-Web-App (PWA) ausgestattet. Nach der Installation startet sie im Vollbildmodus ohne Adressleiste und speichert alle Kunden und Zeiten direkt auf Ihrem Smartphone.
              </p>
            </div>
          </div>

          <div className="mt-4">
            {isInstalled ? (
              <div className="text-xs font-semibold text-emerald-700">
                App ist bereits auf diesem Gerät im App-Modus installiert.
              </div>
            ) : canPromptNatively ? (
              <button
                type="button"
                onClick={() => {
                  onInstallApp().then((ok) => {
                    if (ok) onNotify('App wird auf dem Startbildschirm installiert.');
                  });
                }}
                className="w-full min-h-[48px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Jetzt auf Android installieren</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <div className="font-semibold text-slate-900">
                  Installation unter Android (Chrome):
                </div>
                <div>1. Öffnen Sie den App-Link im Chrome-Browser auf Ihrem Android-Gerät.</div>
                <div>2. Tippen Sie oben rechts auf das Drei-Punkte-Menü (⋮).</div>
                <div>3. Wählen Sie „App installieren“ oder „Zum Startbildschirm hinzufügen“.</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Geräte-Sicherung & Zurücksetzen
          </h3>
          <p className="text-xs text-slate-500 tabular-nums">
            Aktuell gespeichert: {customers.length} Kunden · {entries.length} abgeschlossene Einsätze
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportJsonBackup}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Backup speichern (.json)</span>
            </button>

            <label className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Backup einlesen</span>
              <input
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {confirmClear ? (
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetToEmpty();
                    setConfirmClear(false);
                    onNotify('Alle Einträge wurden geleert.');
                  }}
                  className="min-h-[44px] px-3.5 rounded-xl bg-red-600 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Ja, Einträge leeren
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-xs font-semibold text-slate-600 hover:text-red-700 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Einsatzliste leeren</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
