export interface Customer {
  id: string;
  name: string;
  customerNumber?: string;
  contactPerson?: string;
  phone?: string;
  defaultStreet?: string;
  defaultHouseNumber?: string;
  defaultPostalCode?: string;
  defaultCity?: string;
  createdAt: string;
}

export interface GpsLocation {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt?: string;
}

export interface ActiveSession {
  customerId: string;
  location: GpsLocation;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  startTimestampIso: string | null;
  breakMinutes: number;
  note: string;
}

export interface TimeEntry {
  id: string;
  customerId: string;
  customerName: string;
  customerNumber?: string;
  date: string; // YYYY-MM-DD
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakMinutes: number;
  durationMinutes: number;
  note: string;
  createdAt: string;
}

export interface CompanyProfile {
  companyName: string;
  employeeName: string;
  employeeId: string;
}

export enum AppTab {
  Track = 'track',
  Reports = 'reports',
  Customers = 'customers',
  Settings = 'settings',
}

export type ReportFilterMode = 'day' | 'month';
