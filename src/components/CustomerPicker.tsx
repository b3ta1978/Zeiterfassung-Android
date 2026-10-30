import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search, UserPlus, X } from 'lucide-react';
import { Customer } from '../types';
import { formatPostalAndCity, formatStreetAndNumber } from '../utils/timeAndFormat';

interface CustomerPickerProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer: (draft: Omit<Customer, 'id' | 'createdAt'>) => Customer;
}

export const CustomerPicker: React.FC<CustomerPickerProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onCreateCustomer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newHouseNumber, setNewHouseNumber] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newCity, setNewCity] = useState('');
  const [formError, setFormError] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.customerNumber || '').toLowerCase().includes(q) ||
        (c.defaultCity || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return customers.some((c) => c.name.trim().toLowerCase() === q);
  }, [customers, searchQuery]);

  const nextSuggestedNumber = useMemo(() => {
    const nums = customers
      .map((c) => {
        const m = (c.customerNumber || '').match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 1000;
      })
      .filter((n) => !Number.isNaN(n));
    const maxNum = nums.length > 0 ? Math.max(...nums) : 1000;
    return `KD-${maxNum + 1}`;
  }, [customers]);

  const openCreateForm = (prefillName = '') => {
    setNewName(prefillName.trim());
    setNewNumber(nextSuggestedNumber);
    setNewContact('');
    setNewPhone('');
    setNewStreet('');
    setNewHouseNumber('');
    setNewPostalCode('');
    setNewCity('');
    setFormError('');
    setIsCreating(true);
    setIsOpen(false);
  };

  const handleQuickCreateFromSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    openCreateForm(trimmed);
  };

  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('Bitte einen Kundennamen oder Firmennamen eingeben.');
      return;
    }
    const created = onCreateCustomer({
      name: newName.trim(),
      customerNumber: newNumber.trim() || undefined,
      contactPerson: newContact.trim() || undefined,
      phone: newPhone.trim() || undefined,
      defaultStreet: newStreet.trim() || undefined,
      defaultHouseNumber: newHouseNumber.trim() || undefined,
      defaultPostalCode: newPostalCode.trim() || undefined,
      defaultCity: newCity.trim() || undefined,
    });
    onSelectCustomer(created);
    setIsCreating(false);
    setSearchQuery('');
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="text-sm font-semibold text-slate-900">
          01. Kunde auswählen
        </label>
        <button
          type="button"
          onClick={() => openCreateForm('')}
          className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Neuen Kunden anlegen
        </button>
      </div>

      {/* Main Selector Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[54px] px-4 py-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
          selectedCustomer
            ? 'bg-slate-50/70 border-slate-300 hover:border-slate-400'
            : 'bg-white border-slate-300 hover:border-blue-600'
        }`}
      >
        <div className="min-w-0">
          {selectedCustomer ? (
            <>
              <div className="font-semibold text-slate-900 truncate">
                {selectedCustomer.name}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5 tabular-nums">
                {[
                  selectedCustomer.customerNumber,
                  selectedCustomer.contactPerson,
                  selectedCustomer.defaultCity,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Kunde ausgewählt'}
              </div>
            </>
          ) : (
            <span className="text-slate-500 text-sm">
              Kunden antippen oder neu anlegen…
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable Search & Selection List */}
      {isOpen && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2.5 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kunden suchen oder neuen Namen tippen…"
              autoFocus
              className="w-full min-h-[38px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Suche löschen"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredCustomers.map((cust) => {
              const isSelected = cust.id === selectedCustomerId;
              const addressHint =
                cust.defaultStreet || cust.defaultCity
                  ? [
                      formatStreetAndNumber(
                        cust.defaultStreet || '',
                        cust.defaultHouseNumber || ''
                      ),
                      formatPostalAndCity(
                        cust.defaultPostalCode || '',
                        cust.defaultCity || ''
                      ),
                    ]
                      .filter((p) => p !== '—')
                      .join(', ')
                  : '';

              return (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer(cust);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full min-h-[54px] px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {cust.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5 tabular-nums">
                      {[cust.customerNumber, addressHint || cust.contactPerson]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-700 shrink-0" />}
                </button>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="px-4 py-5 text-center text-sm text-slate-500">
                Kein bestehender Kunde gefunden.
              </div>
            )}
          </div>

          {/* Direct create trigger if customer does not exist yet */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200">
            {!exactMatchExists && searchQuery.trim() ? (
              <button
                type="button"
                onClick={handleQuickCreateFromSearch}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  „{searchQuery.trim()}“ neu anlegen
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openCreateForm('')}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-700 shrink-0" />
                Kunde existiert noch nicht? Neu anlegen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet for Creating New Customer */}
      {isCreating && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3" />

            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Neuen Kunden anlegen
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kundenname / Firma *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="z. B. Müller Elektrotechnik GmbH"
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kundennummer (optional)
                  </label>
                  <input
                    type="text"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="KD-1005"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ansprechpartner (optional)
                  </label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="Vor- und Nachname"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefonnummer (optional)
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="z. B. 0171 4458920"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-600 mb-2">
                  Stammadresse (optional – Einsatzort kann jederzeit per GPS überschrieben werden)
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="Straße"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newHouseNumber}
                      onChange={(e) => setNewHouseNumber(e.target.value)}
                      placeholder="Hausnr."
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <input
                      type="text"
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      placeholder="PLZ"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Ort"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 min-h-[48px] px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  Speichern & auswählen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
