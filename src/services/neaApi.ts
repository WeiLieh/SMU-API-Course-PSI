import { Pm25ApiResponse, PsiApiResponse, RegionMetadata, RegionName } from '../types/nea';

const PSI_ENDPOINT = 'https://api-open.data.gov.sg/v2/real-time/api/psi';
const PM25_ENDPOINT = 'https://api-open.data.gov.sg/v2/real-time/api/pm25';

export async function fetchNeaAirQuality(dateQuery?: string): Promise<{
  psi: PsiApiResponse;
  pm25: Pm25ApiResponse;
}> {
  const query = dateQuery ? `?date=${encodeURIComponent(dateQuery)}` : '';
  const [psiRes, pm25Res] = await Promise.all([
    fetch(`${PSI_ENDPOINT}${query}`),
    fetch(`${PM25_ENDPOINT}${query}`),
  ]);

  if (!psiRes.ok) {
    throw new Error(`PSI endpoint returned HTTP ${psiRes.status}`);
  }
  if (!pm25Res.ok) {
    throw new Error(`PM2.5 endpoint returned HTTP ${pm25Res.status}`);
  }

  const [psi, pm25]: [PsiApiResponse, Pm25ApiResponse] = await Promise.all([
    psiRes.json(),
    pm25Res.json(),
  ]);

  if (psi.code !== 0) {
    throw new Error(psi.errorMsg || `PSI API returned code ${psi.code}`);
  }
  if (pm25.code !== 0) {
    throw new Error(pm25.errorMsg || `PM2.5 API returned code ${pm25.code}`);
  }

  return { psi, pm25 };
}

/**
 * Calculates great-circle distance in kilometers between two coordinates
 * using the Haversine formula against NEA's regionMetadata.labelLocation.
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
