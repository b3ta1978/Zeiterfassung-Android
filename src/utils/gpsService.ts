import { GpsLocation } from '../types';

export interface GpsLookupResult {
  location: GpsLocation;
  source: 'nominatim' | 'bigdatacloud' | 'coordinates-only';
}

interface NominatimResponse {
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    residential?: string;
    cycleway?: string;
    path?: string;
    square?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    county?: string;
  };
}

interface BigDataCloudResponse {
  locality?: string;
  city?: string;
  postcode?: string;
  principalSubdivision?: string;
}

async function reverseGeocodeNominatim(lat: number, lon: number): Promise<Partial<GpsLocation> | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&accept-language=de&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;
    if (!data.address) return null;

    const a = data.address;
    const street =
      a.road ||
      a.pedestrian ||
      a.residential ||
      a.square ||
      a.footway ||
      a.cycleway ||
      a.path ||
      '';
    const houseNumber = a.house_number || '';
    const postalCode = a.postcode || '';
    const city =
      a.city || a.town || a.village || a.municipality || a.suburb || a.county || '';

    if (!street && !city) return null;
    return { street, houseNumber, postalCode, city };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function reverseGeocodeBigDataCloud(lat: number, lon: number): Promise<Partial<GpsLocation> | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lon)}&localityLanguage=de`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as BigDataCloudResponse;
    const city = data.city || data.locality || data.principalSubdivision || '';
    const postalCode = data.postcode || '';
    if (!city) return null;
    return {
      street: '',
      houseNumber: '',
      postalCode,
      city,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchCurrentGpsAddress(): Promise<GpsLookupResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error(
      'GPS wird von diesem Browser oder Gerät nicht unterstützt. Bitte Adresse manuell eingeben oder Standortfreigabe aktivieren.'
    );
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  }).catch((err: GeolocationPositionError) => {
    if (err.code === 1) {
      throw new Error(
        'Standortzugriff wurde verweigert. Bitte GPS-Berechtigung im Android-Browser freigeben.'
      );
    }
    if (err.code === 2) {
      throw new Error(
        'Aktuelles GPS-Signal nicht verfügbar. Bitte im Freien erneut versuchen oder Straße manuell ergänzen.'
      );
    }
    if (err.code === 3) {
      throw new Error('Zeitüberschreitung bei der GPS-Ortung. Bitte erneut antippen.');
    }
    throw new Error('Standort konnte nicht vom GPS ermittelt werden.');
  });

  const latitude = Number(position.coords.latitude.toFixed(6));
  const longitude = Number(position.coords.longitude.toFixed(6));
  const accuracyMeters = Math.round(position.coords.accuracy);
  const capturedAt = new Date().toISOString();

  const nominatim = await reverseGeocodeNominatim(latitude, longitude);
  if (nominatim) {
    return {
      source: 'nominatim',
      location: {
        street: nominatim.street || '',
        houseNumber: nominatim.houseNumber || '',
        postalCode: nominatim.postalCode || '',
        city: nominatim.city || '',
        latitude,
        longitude,
        accuracyMeters,
        capturedAt,
      },
    };
  }

  const fallback = await reverseGeocodeBigDataCloud(latitude, longitude);
  if (fallback) {
    return {
      source: 'bigdatacloud',
      location: {
        street: fallback.street || '',
        houseNumber: fallback.houseNumber || '',
        postalCode: fallback.postalCode || '',
        city: fallback.city || '',
        latitude,
        longitude,
        accuracyMeters,
        capturedAt,
      },
    };
  }

  return {
    source: 'coordinates-only',
    location: {
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      latitude,
      longitude,
      accuracyMeters,
      capturedAt,
    },
  };
}
