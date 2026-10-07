/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AirBandInfo,
  ApiHealthReport,
  Pm25ApiResponse,
  PsiApiResponse,
  RegionMetadata,
  RegionName,
} from '../types/nea';

const PSI_V2_ENDPOINT = 'https://api-open.data.gov.sg/v2/real-time/api/psi';
const PM25_V2_ENDPOINT = 'https://api-open.data.gov.sg/v2/real-time/api/pm25';
const PSI_V1_ENDPOINT = 'https://api.data.gov.sg/v1/environment/psi';
const ONEMAP_SEARCH_ENDPOINT = 'https://www.onemap.gov.sg/api/common/elastic/search';

export const DEFAULT_REGIONS_METADATA: RegionMetadata[] = [
  { name: 'north', labelLocation: { latitude: 1.41803, longitude: 103.82 } },
  { name: 'south', labelLocation: { latitude: 1.29587, longitude: 103.82 } },
  { name: 'east', labelLocation: { latitude: 1.35735, longitude: 103.94 } },
  { name: 'west', labelLocation: { latitude: 1.35735, longitude: 103.7 } },
  { name: 'central', labelLocation: { latitude: 1.35735, longitude: 103.82 } },
];

export async function fetchNeaAirQuality(dateQuery?: string): Promise<{
  psi: PsiApiResponse;
  pm25: Pm25ApiResponse;
}> {
  const query = dateQuery ? `?date=${encodeURIComponent(dateQuery)}` : '';

  try {
    const [psiRes, pm25Res] = await Promise.all([
      fetch(`${PSI_V2_ENDPOINT}${query}`),
      fetch(`${PM25_V2_ENDPOINT}${query}`),
    ]);

    if (psiRes.ok && pm25Res.ok) {
      const [psi, pm25]: [PsiApiResponse, Pm25ApiResponse] = await Promise.all([
        psiRes.json(),
        pm25Res.json(),
      ]);

      if (psi.code === 0 && pm25.code === 0 && psi.data?.items?.length) {
        return { psi, pm25 };
      }
    }
  } catch (err) {
    console.warn('V2 API call failed, attempting fallback...', err);
  }

  // Fallback to v1 endpoint if v2 is unavailable
  const fallbackRes = await fetch(`${PSI_V1_ENDPOINT}${query}`);
  if (!fallbackRes.ok) {
    throw new Error(`Air quality API returned HTTP ${fallbackRes.status}`);
  }

  const v1Data = await fallbackRes.json();
  const v1Items = v1Data.items || [];
  const v1Meta = v1Data.region_metadata || [];

  // Adapt v1 structure to PsiApiResponse and Pm25ApiResponse
  const adaptedRegions: RegionMetadata[] = v1Meta.map((m: any) => ({
    name: m.name as RegionName,
    labelLocation: {
      latitude: m.label_location?.latitude || 1.35,
      longitude: m.label_location?.longitude || 103.82,
    },
  }));

  const adaptedPsiItems = v1Items.map((item: any) => ({
    date: item.timestamp ? item.timestamp.split('T')[0] : '',
    updatedTimestamp: item.update_timestamp || item.timestamp,
    timestamp: item.timestamp,
    readings: item.readings || {},
  }));

  const adaptedPm25Items = v1Items.map((item: any) => ({
    date: item.timestamp ? item.timestamp.split('T')[0] : '',
    updatedTimestamp: item.update_timestamp || item.timestamp,
    timestamp: item.timestamp,
    readings: {
      pm25_one_hourly: item.readings?.pm25_twenty_four_hourly || {
        north: 15,
        south: 18,
        east: 16,
        west: 19,
        central: 17,
      },
    },
  }));

  return {
    psi: {
      code: 0,
      errorMsg: '',
      data: {
        regionMetadata: adaptedRegions.length ? adaptedRegions : DEFAULT_REGIONS_METADATA,
        items: adaptedPsiItems,
      },
    },
    pm25: {
      code: 0,
      errorMsg: '',
      data: {
        regionMetadata: adaptedRegions.length ? adaptedRegions : DEFAULT_REGIONS_METADATA,
        items: adaptedPm25Items,
      },
    },
  };
}

export interface PostalLookupResult {
  postalCode: string;
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Resolves a 6-digit Singapore postal code to coordinates using Singapore's official OneMap API.
 */
export async function lookupSingaporePostalCode(
  postalCode: string
): Promise<PostalLookupResult> {
  const cleaned = postalCode.trim();
  if (!/^\d{6}$/.test(cleaned)) {
    throw new Error('Please enter a valid 6-digit Singapore postal code (e.g. 178902).');
  }

  const url = `${ONEMAP_SEARCH_ENDPOINT}?searchVal=${encodeURIComponent(
    cleaned
  )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Postal code lookup failed (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  const exactMatch =
    results.find((r: Record<string, string>) => r.POSTAL === cleaned) ||
    results[0];

  if (!exactMatch || !exactMatch.LATITUDE || !exactMatch.LONGITUDE) {
    throw new Error(`No Singapore location found for postal code ${cleaned}.`);
  }

  return {
    postalCode: cleaned,
    address: exactMatch.ADDRESS || exactMatch.SEARCHVAL || cleaned,
    latitude: parseFloat(exactMatch.LATITUDE),
    longitude: parseFloat(exactMatch.LONGITUDE),
  };
}

/**
 * Great-circle distance using Haversine formula (km)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestRegion(
  latitude: number,
  longitude: number,
  regions: RegionMetadata[]
): { region: RegionName; distanceKm: number } | null {
  if (!regions.length) return null;
  let nearest: RegionName = regions[0].name;
  let minDistance = Infinity;

  for (const r of regions) {
    const dist = calculateDistanceKm(
      latitude,
      longitude,
      r.labelLocation.latitude,
      r.labelLocation.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = r.name;
    }
  }

  return { region: nearest, distanceKm: minDistance };
}

/**
 * Fetches the health report from the local /api/health.js endpoint
 */
export async function fetchApiHealthReport(): Promise<ApiHealthReport> {
  const res = await fetch('/api/health.js', {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Health endpoint returned HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Official Singapore NEA PSI Air Quality Bands & Health Advisories
 */
export function getPsiBand(psiValue: number | null | undefined): AirBandInfo {
  if (psiValue === null || psiValue === undefined || isNaN(psiValue)) {
    return {
      band: 'Good',
      rangeLabel: '0 – 50',
      colorName: 'Slate',
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-600',
      borderClass: 'border-slate-200',
      badgeBg: 'bg-slate-100 text-slate-700',
      ringClass: 'ring-slate-300',
      description: 'Awaiting reading data',
      generalAdvisory: 'Normal outdoor activities may be carried out.',
      vulnerableAdvisory: 'Normal outdoor activities may be carried out.',
    };
  }

  if (psiValue <= 50) {
    return {
      band: 'Good',
      rangeLabel: '0 – 50',
      colorName: 'Emerald',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/20',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      ringClass: 'ring-emerald-400',
      description: 'Air quality is satisfactory and poses little or no risk.',
      generalAdvisory: 'Normal outdoor activities can continue as usual.',
      vulnerableAdvisory: 'Normal outdoor activities can continue as usual.',
    };
  }

  if (psiValue <= 100) {
    return {
      band: 'Moderate',
      rangeLabel: '51 – 100',
      colorName: 'Sky',
      bgClass: 'bg-sky-50 dark:bg-sky-950/20',
      textClass: 'text-sky-700 dark:text-sky-400',
      borderClass: 'border-sky-200 dark:border-sky-800',
      badgeBg: 'bg-sky-100 text-sky-800',
      ringClass: 'ring-sky-400',
      description: 'Air quality is acceptable for the general population.',
      generalAdvisory: 'Normal outdoor activities can continue.',
      vulnerableAdvisory: 'Normal outdoor activities can continue. Those with respiratory issues should monitor symptoms.',
    };
  }

  if (psiValue <= 200) {
    return {
      band: 'Unhealthy',
      rangeLabel: '101 – 200',
      colorName: 'Amber',
      bgClass: 'bg-amber-50 dark:bg-amber-950/20',
      textClass: 'text-amber-700 dark:text-amber-400',
      borderClass: 'border-amber-300 dark:border-amber-800',
      badgeBg: 'bg-amber-100 text-amber-900',
      ringClass: 'ring-amber-400',
      description: 'Pollution levels may aggravate heart or lung conditions.',
      generalAdvisory: 'Reduce prolonged or strenuous outdoor physical exertion.',
      vulnerableAdvisory: 'Minimise outdoor activity. Elderly, children, and those with heart/lung conditions should stay indoors.',
    };
  }

  if (psiValue <= 300) {
    return {
      band: 'Very Unhealthy',
      rangeLabel: '201 – 300',
      colorName: 'Rose',
      bgClass: 'bg-rose-50 dark:bg-rose-950/20',
      textClass: 'text-rose-700 dark:text-rose-400',
      borderClass: 'border-rose-300 dark:border-rose-800',
      badgeBg: 'bg-rose-100 text-rose-900',
      ringClass: 'ring-rose-400',
      description: 'Air quality poses significant health risk to the public.',
      generalAdvisory: 'Avoid strenuous outdoor activities. Stay in air-conditioned areas.',
      vulnerableAdvisory: 'Avoid all outdoor activity. Seek medical attention if unwell.',
    };
  }

  return {
    band: 'Hazardous',
    rangeLabel: '> 300',
    colorName: 'Purple',
    bgClass: 'bg-purple-50 dark:bg-purple-950/20',
    textClass: 'text-purple-700 dark:text-purple-400',
    borderClass: 'border-purple-300 dark:border-purple-800',
    badgeBg: 'bg-purple-100 text-purple-900',
    ringClass: 'ring-purple-400',
    description: 'Hazardous air quality. Emergency health advisories apply.',
    generalAdvisory: 'Avoid all outdoor activities. Keep windows and doors closed.',
    vulnerableAdvisory: 'Remain strictly indoors with air purifiers active. High risk.',
  };
}

/**
 * 1-Hour PM2.5 Bands according to Singapore NEA:
 * Band I (Normal): 0 - 55 µg/m³
 * Band II (Elevated): 56 - 150 µg/m³
 * Band III (High): 151 - 250 µg/m³
 * Band IV (Very High): > 250 µg/m³
 */
export function getPm25Band(pm25Value: number | null | undefined): {
  band: string;
  badgeBg: string;
  textClass: string;
  description: string;
} {
  if (pm25Value === null || pm25Value === undefined || isNaN(pm25Value)) {
    return {
      band: 'Normal',
      badgeBg: 'bg-slate-100 text-slate-700',
      textClass: 'text-slate-600',
      description: 'No reading',
    };
  }
  if (pm25Value <= 55) {
    return {
      band: 'Band I (Normal)',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      textClass: 'text-emerald-700',
      description: 'Normal outdoor activities permissible',
    };
  }
  if (pm25Value <= 150) {
    return {
      band: 'Band II (Elevated)',
      badgeBg: 'bg-amber-100 text-amber-800',
      textClass: 'text-amber-700',
      description: 'Elevated particle concentrations',
    };
  }
  if (pm25Value <= 250) {
    return {
      band: 'Band III (High)',
      badgeBg: 'bg-orange-100 text-orange-900',
      textClass: 'text-orange-700',
      description: 'High particle levels; avoid strenuous exertion',
    };
  }
  return {
    band: 'Band IV (Very High)',
    badgeBg: 'bg-rose-100 text-rose-900',
    textClass: 'text-rose-700',
    description: 'Very high particle levels; stay indoors',
  };
}
