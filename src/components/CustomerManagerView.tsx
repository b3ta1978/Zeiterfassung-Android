import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { Customer, TimeEntry } from '../types';
import {
  formatMinutesAsDecimalGerman,
  formatMinutesAsHHMM,
  formatPostalAndCity,
  formatStreetAndNumber,
} from '../utils/timeAndFormat';

interface CustomerManagerViewProps {
  customers: Customer[];
  entries: TimeEntry[];
  onCreateCustomer: (draft: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  onUpdateCustomer: (updated: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onSelectForTracking: (customer: Customer) => void;
  onNotify: (message: string) => void;
}

export const CustomerManagerView: React.FC<CustomerManagerViewProps> = ({
  customers,
  entries,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onSelectForTracking,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [modalCustomer, setModalCustomer] = useState<Partial<Customer> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const statsByCustomer = useMemo(() => {
    const map = new Map<string, { count: number; minutes: number }>();
    for (const e of entries) {
      const prev = map.get(e.customerId) || { count: 0, minutes: 0 };
      map.set(e.customerId, {
        count: prev.count + 1,
        minutes: prev.minutes + e.durationMinutes,
      });
    }
    return map;
  }, [entries]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.customerNumber || '').toLowerCase().includes(q) ||
        (c.defaultCity || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openNewCustomerModal = (prefillName = '') => {
    const maxNum = customers.reduce((max, c) => {
      const m = (c.customerNumber || '').match(/(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 1000);
    setModalCustomer({
      name: prefillName,
      customerNumber: `KD-${maxNum + 1}`,
      contactPerson: '',
      phone: '',
      defaultStreet: '',
      defaultHouseNumber: '',
      defaultPostalCode: '',
      defaultCity: '',
    });
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCustomer || !modalCustomer.name?.trim()) return;

    if (modalCustomer.id) {
      const existing = customers.find((c) => c.id === modalCustomer.id);
      if (existing) {
        onUpdateCustomer({
          ...existing,
          name: modalCustomer.name.trim(),
          customerNumber: modalCustomer.customerNumber?.trim() || undefined,
          contactPerson: modalCustomer.contactPerson?.trim() || undefined,
          phone: modalCustomer.phone?.trim() || undefined,
          defaultStreet: modalCustomer.defaultStreet?.trim() || undefined,
          defaultHouseNumber: modalCustomer.defaultHouseNumber?.trim() || undefined,
          defaultPostalCode: modalCustomer.defaultPostalCode?.trim() || undefined,
          defaultCity: modalCustomer.defaultCity?.trim() || undefined,
        });
        onNotify('Kundendaten gespeichert.');
      }
    } else {
      onCreateCustomer({
        name: modalCustomer.name.trim(),
        customerNumber: modalCustomer.customerNumber?.trim() || undefined,
        contactPerson: modalCustomer.contactPerson?.trim() || undefined,
        phone: modalCustomer.phone?.trim() || undefined,
        defaultStreet: modalCustomer.defaultStreet?.trim() || undefined,
        defaultHouseNumber: modalCustomer.defaultHouseNumber?.trim() || undefined,
        defaultPostalCode: modalCustomer.defaultPostalCode?.trim() || undefined,
        defaultCity: modalCustomer.defaultCity?.trim() || undefined,
      });
      onNotify('Neuer Kunde wurde angelegt.');
    }
    setModalCustomer(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Kundenverzeichnis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {customers.length} gespeicherte Kunden · Direkt für Zeiterfassung auswählbar
            </p>
          </div>
          <button
            type="button"
            onClick={() => openNewCustomerModal('')}
            className="min-h-[44px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Neuen Kunden anlegen</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kunden nach Name, Nummer oder Ort filtern…"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
          />
        </div>

        <div className="mt-4 divide-y divide-slate-200">
          {filteredCustomers.map((customer) => {
            const stat = statsByCustomer.get(customer.id) || {
              count: 0,
              minutes: 0,
            };
            const streetStr = formatStreetAndNumber(
              customer.defaultStreet || '',
              customer.defaultHouseNumber || ''
            );
            const cityStr = formatPostalAndCity(
              customer.defaultPostalCode || '',
              customer.defaultCity || ''
            );
            const addressLine = [streetStr, cityStr]
              .filter((s) => s !== '—')
              .join(', ');

            return (
              <div
                key={customer.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm sm:text-base">
                    {customer.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {[
                      customer.customerNumber,
                      customer.contactPerson,
                      customer.phone,
                      addressLine,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Keine Zusatzangaben'}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 tabular-nums">
                    {stat.count} {stat.count === 1 ? 'Einsatz' : 'Einsätze'} ·{' '}
                    {formatMinutesAsHHMM(stat.minutes)} Std. (
                    {formatMinutesAsDecimalGerman(stat.minutes)} h)
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectForTracking(customer)}
                    className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>Einsatz starten</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCustomer({ ...customer })}
                    className="min-h-[42px] min-w-[42px] rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center cursor-pointer"
                    aria-label="Kunde bearbeiten"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {confirmDeleteId === customer.id ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteCustomer(customer.id);
                          setConfirmDeleteId(null);
                          onNotify('Kunde entfernt.');
                        }}
                        className="min-h-[42px] px-3 rounded-xl bg-red-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Löschen
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[42px] px-2.5 rounded-xl border border-slate-300 text-xs text-slate-600 cursor-pointer"
                      >
                        Abbruch
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(customer.id)}
                      className="min-h-[42px] min-w-[42px] rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-600 inline-flex items-center justify-center cursor-pointer"
                      aria-label="Kunde löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Kein Kunde unter „{search}“ gefunden.
              </p>
              <button
                type="button"
                onClick={() => openNewCustomerModal(search)}
                className="min-h-[44px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>„{search.trim() || 'Neuer Kunde'}“ jetzt anlegen</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalCustomer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModalCustomer(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {modalCustomer.id ? 'Kundendaten bearbeiten' : 'Neuen Kunden anlegen'}
              </h3>
              <button
                type="button"
                onClick={() => setModalCustomer(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kundenname / Firma *
                </label>
                <input
                  type="text"
                  required
                  value={modalCustomer.name || ''}
                  onChange={(e) =>
                    setModalCustomer({ ...modalCustomer, name: e.target.value })
                  }
                  placeholder="Firmenname oder Nachname"
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kundennummer
                  </label>
                  <input
                    type="text"
                    value={modalCustomer.customerNumber || ''}
                    onChange={(e) =>
                      setModalCustomer({
                        ...modalCustomer,
                        customerNumber: e.target.value,
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={modalCustomer.phone || ''}
                    onChange={(e) =>
                      setModalCustomer({ ...modalCustomer, phone: e.target.value })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ansprechpartner
                </label>
                <input
                  type="text"
                  value={modalCustomer.contactPerson || ''}
                  onChange={(e) =>
                    setModalCustomer({
                      ...modalCustomer,
                      contactPerson: e.target.value,
                    })
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard-Straße
                  </label>
                  <input
                    type="text"
                    value={modalCustomer.defaultStreet || ''}
                    onChange={(e) =>
                      setModalCustomer({
                        ...modalCustomer,
                        defaultStreet: e.target.value,
                      })
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
                    value={modalCustomer.defaultHouseNumber || ''}
                    onChange={(e) =>
                      setModalCustomer({
                        ...modalCustomer,
                        defaultHouseNumber: e.target.value,
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
                    value={modalCustomer.defaultPostalCode || ''}
                    onChange={(e) =>
                      setModalCustomer({
                        ...modalCustomer,
                        defaultPostalCode: e.target.value,
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
                    value={modalCustomer.defaultCity || ''}
                    onChange={(e) =>
                      setModalCustomer({
                        ...modalCustomer,
                        defaultCity: e.target.value,
                      })
                    }
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalCustomer(null)}
                  className="flex-1 min-h-[46px] rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] rounded-xl bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
