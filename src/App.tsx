/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  LocateFixed,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  SlidersHorizontal,
  MapPin,
  Search,
} from 'lucide-react';
import {
  Pm25ApiResponse,
  PsiApiResponse,
  PsiMetricKey,
  RegionMetadata,
  RegionName,
} from './types/nea';
import {
  calculateDistanceKm,
  fetchNeaAirQuality,
  findNearestRegion,
  lookupSingaporePostalCode,
} from './services/neaApi';

interface MetricMeta {
  key: PsiMetricKey;
  label: string;
  shortLabel: string;
  description: string;
  unit?: string;
}

const PSI_METRICS_META: MetricMeta[] = [
  {
    key: 'psi_twenty_four_hourly',
    label: '24-Hour PSI',
    shortLabel: '24-Hr PSI',
    description: '24-Hour Pollutant Standards Index',
  },
  {
    key: 'pm25_twenty_four_hourly',
    label: 'PM2.5 (24-Hour Avg)',
    shortLabel: 'PM2.5 (24-Hr)',
    description: 'Fine particulate matter 24-hour concentration',
    unit: 'µg/m³',
  },
  {
    key: 'pm25_sub_index',
    label: 'PM2.5 Sub-Index',
    shortLabel: 'PM2.5 Index',
    description: '24-Hour PM2.5 sub-index reading',
  },
  {
    key: 'pm10_twenty_four_hourly',
    label: 'PM10 (24-Hour Avg)',
    shortLabel: 'PM10 (24-Hr)',
    description: 'Particulate matter 24-hour concentration',
    unit: 'µg/m³',
  },
  {
    key: 'pm10_sub_index',
    label: 'PM10 Sub-Index',
    shortLabel: 'PM10 Index',
    description: '24-Hour PM10 sub-index reading',
  },
  {
    key: 'so2_twenty_four_hourly',
    label: 'Sulphur Dioxide (24-Hour)',
    shortLabel: 'SO₂ (24-Hr)',
    description: '24-Hour Sulphur Dioxide concentration',
    unit: 'µg/m³',
  },
  {
    key: 'so2_sub_index',
    label: 'Sulphur Dioxide Sub-Index',
    shortLabel: 'SO₂ Index',
    description: '24-Hour SO₂ sub-index reading',
  },
  {
    key: 'co_eight_hour_max',
    label: 'Carbon Monoxide (8-Hour Max)',
    shortLabel: 'CO (8-Hr Max)',
    description: '8-Hour maximum Carbon Monoxide concentration',
    unit: 'mg/m³',
  },
  {
    key: 'co_sub_index',
    label: 'Carbon Monoxide Sub-Index',
    shortLabel: 'CO Index',
    description: '8-Hour CO sub-index reading',
  },
  {
    key: 'o3_eight_hour_max',
    label: 'Ozone (8-Hour Max)',
    shortLabel: 'O₃ (8-Hr Max)',
    description: '8-Hour maximum Ozone concentration',
    unit: 'µg/m³',
  },
  {
    key: 'o3_sub_index',
    label: 'Ozone Sub-Index',
    shortLabel: 'O₃ Index',
    description: '8-Hour Ozone sub-index reading',
  },
  {
    key: 'no2_one_hour_max',
    label: 'Nitrogen Dioxide (1-Hour Max)',
    shortLabel: 'NO₂ (1-Hr Max)',
    description: '1-Hour maximum Nitrogen Dioxide concentration',
    unit: 'µg/m³',
  },
];

const METRIC_META_MAP: Record<PsiMetricKey, MetricMeta> =
  PSI_METRICS_META.reduce(
    (acc, item) => {
      acc[item.key] = item;
      return acc;
    },
    {} as Record<PsiMetricKey, MetricMeta>
  );

const REGION_DISPLAY_NAMES: Record<RegionName, string> = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
  central: 'Central',
};

function formatFriendlyTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-SG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function formatFriendlyDateTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function App() {
  // API Query & Response States
  const [dateInput, setDateInput] = useState<string>('');
  const [psiData, setPsiData] = useState<PsiApiResponse | null>(null);
  const [pm25Data, setPm25Data] = useState<Pm25ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Controls corresponding strictly to returned API fields
  const [selectedRegion, setSelectedRegion] = useState<RegionName>('central');
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
  const [selectedPsiKey, setSelectedPsiKey] = useState<PsiMetricKey>(
    'psi_twenty_four_hourly'
  );

  // 6-Digit Singapore Postal Code & Resolved Coordinates (matched against API regionMetadata.labelLocation)
  const [postalCode, setPostalCode] = useState<string>('');
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  const loadData = async (queryDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { psi, pm25 } = await fetchNeaAirQuality(queryDate || undefined);
      setPsiData(psi);
      setPm25Data(pm25);

      const psiItems = psi.data?.items || [];
      const pm25Items = pm25.data?.items || [];
      const latestTs =
        psiItems[0]?.timestamp || pm25Items[0]?.timestamp || '';
      setSelectedTimestamp(latestTs);

      if (!queryDate && psiItems[0]?.date) {
        setDateInput(psiItems[0].date);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load air quality readings from NEA.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract regionMetadata from API response
  const regions: RegionMetadata[] = useMemo(() => {
    return psiData?.data?.regionMetadata?.length
      ? psiData.data.regionMetadata
      : pm25Data?.data?.regionMetadata || [];
  }, [psiData, pm25Data]);

  // Ensure selectedRegion is valid in returned regionMetadata
  useEffect(() => {
    if (
      regions.length > 0 &&
      !regions.some((r) => r.name === selectedRegion)
    ) {
      setSelectedRegion(regions[0].name);
    }
  }, [regions, selectedRegion]);

  // Collect all unique timestamps returned by PSI and PM2.5 items
  const availableTimestamps: string[] = useMemo(() => {
    const set = new Set<string>();
    psiData?.data?.items?.forEach((item) => {
      if (item.timestamp) set.add(item.timestamp);
    });
    pm25Data?.data?.items?.forEach((item) => {
      if (item.timestamp) set.add(item.timestamp);
    });
    return Array.from(set).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [psiData, pm25Data]);

  // Active PSI item for selectedTimestamp
  const activePsiItem = useMemo(() => {
    const items = psiData?.data?.items || [];
    if (!items.length) return null;
    if (!selectedTimestamp) return items[0];
    return (
      items.find((item) => item.timestamp === selectedTimestamp) || items[0]
    );
  }, [psiData, selectedTimestamp]);

  // Active PM2.5 item for selectedTimestamp
  const activePm25Item = useMemo(() => {
    const items = pm25Data?.data?.items || [];
    if (!items.length) return null;
    if (!selectedTimestamp) return items[0];
    return (
      items.find((item) => item.timestamp === selectedTimestamp) || items[0]
    );
  }, [pm25Data, selectedTimestamp]);

  // Active RegionMetadata object
  const activeRegionMeta = useMemo(() => {
    return regions.find((r) => r.name === selectedRegion) || null;
  }, [regions, selectedRegion]);

  // Calculate distances from resolved user coordinates to each region's labelLocation
  const regionDistances = useMemo(() => {
    if (!userCoords) return null;

    const map: Record<string, number> = {};
    for (const r of regions) {
      map[r.name] = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        r.labelLocation.latitude,
        r.labelLocation.longitude
      );
    }
    return map;
  }, [userCoords, regions]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError('Location services are not supported by your browser.');
      return;
    }
    setLocating(true);
    setGeoStatus(null);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        const nearest = findNearestRegion(lat, lng, regions);
        if (nearest) {
          setSelectedRegion(nearest.region);
          setGeoStatus(
            `Closest region: ${REGION_DISPLAY_NAMES[nearest.region]} (${nearest.distanceKm.toFixed(1)} km away)`
          );
        }
        setLocating(false);
      },
      (err) => {
        setGeoError(err.message || 'Could not detect your current location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resolvePostalCode = async (codeToLookup: string) => {
    setLocating(true);
    setGeoError(null);
    setGeoStatus(null);
    try {
      const result = await lookupSingaporePostalCode(codeToLookup);
      setUserCoords({ lat: result.latitude, lng: result.longitude });
      const nearest = findNearestRegion(
        result.latitude,
        result.longitude,
        regions
      );
      if (nearest) {
        setSelectedRegion(nearest.region);
        setGeoStatus(
          `Postal ${result.postalCode} → ${REGION_DISPLAY_NAMES[nearest.region]} Region (${nearest.distanceKm.toFixed(1)} km)`
        );
      }
    } catch (err) {
      setUserCoords(null);
      setGeoError(
        err instanceof Error ? err.message : 'Unable to find postal code.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handlePostalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPostalCode(digitsOnly);
    setGeoError(null);

    if (digitsOnly.length === 6) {
      resolvePostalCode(digitsOnly);
    } else if (digitsOnly.length === 0) {
      setUserCoords(null);
      setGeoStatus(null);
    }
  };

  const handlePostalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postalCode.length === 6) {
      resolvePostalCode(postalCode);
    } else {
      setGeoError('Please enter a 6-digit Singapore postal code.');
    }
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(dateInput);
  };

  const activeMetricMeta = METRIC_META_MAP[selectedPsiKey];
  const regionDisplayName =
    REGION_DISPLAY_NAMES[selectedRegion] || selectedRegion;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header without top anchoring tabs */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          SG Air Quality Monitor
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating || loading}
            className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
            <span>{locating ? 'Locating...' : 'Use My Location'}</span>
          </button>
          <button
            type="button"
            onClick={() => loadData(dateInput)}
            disabled={loading}
            className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Unable to Load Readings</p>
              <p className="text-rose-700 mt-0.5 text-xs">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => loadData(dateInput)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors whitespace-nowrap"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Section 1: Controls for Region, Date, Time, and Singapore Postal Code */}
        <section
          aria-label="Location and Date Controls"
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Singapore PSI & PM2.5 Readings
              </h1>
              {/* Clean unboxed metadata with · separators */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1.5">
                <span>
                  Date:{' '}
                  <strong className="font-medium text-slate-700">
                    {formatFriendlyDate(
                      activePsiItem?.date || activePm25Item?.date
                    )}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Reading Time:{' '}
                  <strong className="font-medium text-slate-700">
                    {formatFriendlyTime(
                      activePsiItem?.timestamp || activePm25Item?.timestamp
                    )}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Last Updated:{' '}
                  <strong className="font-medium text-slate-700">
                    {formatFriendlyDateTime(
                      activePsiItem?.updatedTimestamp ||
                        activePm25Item?.updatedTimestamp
                    )}
                  </strong>
                </span>
              </div>
            </div>

            {/* Region Selector Tabs */}
            <div className="flex flex-col sm:items-end gap-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Select Region in Singapore
              </span>
              <div
                role="tablist"
                aria-label="Select Region"
                className="grid grid-cols-5 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto"
              >
                {regions.map((r) => {
                  const isActive = selectedRegion === r.name;
                  return (
                    <button
                      key={r.name}
                      role="tab"
                      aria-selected={isActive}
                      type="button"
                      onClick={() => setSelectedRegion(r.name)}
                      className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {REGION_DISPLAY_NAMES[r.name] || r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Input Fields Mapped to API Query Parameters & Postal Code Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
            {/* 1. Date & Hourly Time Selection */}
            <div className="space-y-3">
              <form onSubmit={handleDateSubmit} className="space-y-1.5">
                <label
                  htmlFor="api-date-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter by Date</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="api-date-input"
                    type="date"
                    value={dateInput}
                    onChange={(e) => {
                      setDateInput(e.target.value);
                      loadData(e.target.value);
                    }}
                    className="flex-1 min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                  {dateInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateInput('');
                        loadData('');
                      }}
                      className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Latest
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-1.5">
                <label
                  htmlFor="timestamp-select"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Select Reading Time ({availableTimestamps.length} available)
                  </span>
                </label>
                <select
                  id="timestamp-select"
                  value={selectedTimestamp}
                  onChange={(e) => setSelectedTimestamp(e.target.value)}
                  disabled={availableTimestamps.length === 0}
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                >
                  {availableTimestamps.map((ts) => (
                    <option key={ts} value={ts}>
                      {formatFriendlyDateTime(ts)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. 6-Digit Singapore Postal Code Input */}
            <div className="space-y-3">
              <form onSubmit={handlePostalSubmit} className="space-y-1.5">
                <label
                  htmlFor="postal-code-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Singapore Postal Code (6 Digits)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="postal-code-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="\d{6}"
                    placeholder="e.g. 178902"
                    value={postalCode}
                    onChange={handlePostalInputChange}
                    className="flex-1 min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={locating || postalCode.length !== 6}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Find</span>
                  </button>
                </div>
              </form>

              <div className="flex flex-col gap-1 pt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {regionDisplayName} Station Coordinates:{' '}
                    <span className="font-mono tabular-nums text-slate-700">
                      {activeRegionMeta
                        ? `${activeRegionMeta.labelLocation.latitude}, ${activeRegionMeta.labelLocation.longitude}`
                        : '—'}
                    </span>
                  </span>
                </span>
                {geoStatus && (
                  <span className="text-blue-600 font-medium">{geoStatus}</span>
                )}
                {geoError && (
                  <span className="text-rose-600 font-medium">{geoError}</span>
                )}
              </div>
            </div>

            {/* 3. Pollutant / Sub-Index Selector */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="psi-reading-key-select"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Highlight Pollutant / Index</span>
                </label>
                <select
                  id="psi-reading-key-select"
                  value={selectedPsiKey}
                  onChange={(e) =>
                    setSelectedPsiKey(e.target.value as PsiMetricKey)
                  }
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                >
                  {PSI_METRICS_META.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label} {item.unit ? `(${item.unit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 pt-0.5">
                <span>{activeMetricMeta.description}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Primary Regional Readings for Selected Region */}
        <section
          aria-label="Selected Region Primary Readings"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
        >
          {/* Card 1: 24-Hour PSI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  24-Hour PSI
                </span>
                <span className="font-semibold text-slate-700">
                  {regionDisplayName} Region
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Overall Pollutant Standards Index
              </p>
            </div>

            <div className="my-6 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold font-mono tabular-nums tracking-tight text-slate-900">
                {loading
                  ? '···'
                  : (activePsiItem?.readings?.psi_twenty_four_hourly?.[
                      selectedRegion
                    ] ?? '—')}
              </span>
              <span className="text-xs font-medium text-slate-400">PSI</span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>As of {formatFriendlyTime(activePsiItem?.timestamp)}</span>
              <span>{formatFriendlyDate(activePsiItem?.date)}</span>
            </div>
          </div>

          {/* Card 2: 1-Hour PM2.5 (from PM2.5 Endpoint) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  1-Hour PM2.5 Reading
                </span>
                <span className="font-semibold text-slate-700">
                  {regionDisplayName} Region
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hourly Fine Particulate Matter Concentration
              </p>
            </div>

            <div className="my-6 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold font-mono tabular-nums tracking-tight text-slate-900">
                {loading
                  ? '···'
                  : (activePm25Item?.readings?.pm25_one_hourly?.[
                      selectedRegion
                    ] ?? '—')}
              </span>
              <span className="text-xs font-mono text-slate-400">µg/m³</span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>As of {formatFriendlyTime(activePm25Item?.timestamp)}</span>
              <span>{formatFriendlyDate(activePm25Item?.date)}</span>
            </div>
          </div>

          {/* Card 3: Active Inspected Metric from PSI Endpoint */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-600 truncate">
                  {activeMetricMeta.label}
                </span>
                <span className="font-semibold text-slate-700">
                  {regionDisplayName} Region
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {activeMetricMeta.description}
              </p>
            </div>

            <div className="my-6 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold font-mono tabular-nums tracking-tight text-blue-600">
                {loading
                  ? '···'
                  : (activePsiItem?.readings?.[selectedPsiKey]?.[
                      selectedRegion
                    ] ?? '—')}
              </span>
              {activeMetricMeta.unit && (
                <span className="text-xs font-mono text-slate-400">
                  {activeMetricMeta.unit}
                </span>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>
                Lat: {activeRegionMeta?.labelLocation.latitude ?? '—'}
              </span>
              <span>
                Lng: {activeRegionMeta?.labelLocation.longitude ?? '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: Complete Pollutant & Sub-Index Breakdown for Selected Region */}
        <section
          aria-label="Detailed Pollutant Readings for Selected Region"
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                All Pollutant & Sub-Index Readings ({regionDisplayName} Region)
              </h2>
              <p className="text-xs text-slate-500">
                Tap any pollutant card below to compare it across all regions
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Updated: {formatFriendlyDateTime(activePsiItem?.updatedTimestamp)}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {PSI_METRICS_META.map((item) => {
              const val = activePsiItem?.readings?.[item.key]?.[selectedRegion];
              const isSelected = selectedPsiKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedPsiKey(item.key)}
                  className={`min-h-[96px] p-4 rounded-xl border text-left transition-colors flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {item.description}
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                        {loading ? '·' : (val ?? '—')}
                      </span>
                      {item.unit && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.unit}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {regionDisplayName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: Regional Comparison Matrix across all Singapore Regions */}
        <section
          aria-label="Compare All Regions in Singapore"
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Compare All Regions Across Singapore
              </h2>
              <p className="text-xs text-slate-500">
                Click any row to switch your active region
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Reading Time: {formatFriendlyDateTime(selectedTimestamp)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-600">
                  <th className="py-3.5 px-4 sm:px-6 font-semibold">Region</th>
                  <th className="py-3.5 px-4 font-semibold">Latitude</th>
                  <th className="py-3.5 px-4 font-semibold">Longitude</th>
                  {regionDistances && (
                    <th className="py-3.5 px-4 font-semibold text-right">
                      Distance from You
                    </th>
                  )}
                  <th className="py-3.5 px-4 font-semibold text-right">
                    1-Hour PM2.5 (µg/m³)
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    24-Hour PSI
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 font-semibold text-right text-blue-600">
                    {activeMetricMeta.shortLabel}
                    {activeMetricMeta.unit ? ` (${activeMetricMeta.unit})` : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-mono tabular-nums">
                {regions.map((r) => {
                  const isSelected = r.name === selectedRegion;
                  const pm25Val =
                    activePm25Item?.readings?.pm25_one_hourly?.[r.name];
                  const psi24Val =
                    activePsiItem?.readings?.psi_twenty_four_hourly?.[r.name];
                  const selectedMetricVal =
                    activePsiItem?.readings?.[selectedPsiKey]?.[r.name];
                  const dist = regionDistances?.[r.name];

                  return (
                    <tr
                      key={r.name}
                      onClick={() => setSelectedRegion(r.name)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/60 font-semibold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-sans text-slate-900">
                        {REGION_DISPLAY_NAMES[r.name] || r.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {r.labelLocation.latitude}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {r.labelLocation.longitude}
                      </td>
                      {regionDistances && (
                        <td className="py-3.5 px-4 text-right text-slate-600">
                          {dist !== undefined ? `${dist.toFixed(1)} km` : '—'}
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right text-slate-900">
                        {pm25Val ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-900">
                        {psi24Val ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right text-blue-600">
                        {selectedMetricVal ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Hourly History Table (when date query returns multiple hourly items) */}
        {availableTimestamps.length > 1 && (
          <section
            aria-label="Hourly Readings Log"
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Hourly Readings History ({regionDisplayName} Region)
                </h2>
                <p className="text-xs text-slate-500">
                  Showing {availableTimestamps.length} hourly readings for{' '}
                  {formatFriendlyDate(dateInput)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 sm:px-6 font-semibold">
                      Reading Time
                    </th>
                    <th className="py-3 px-4 font-semibold">Last Updated</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      1-Hour PM2.5 (µg/m³)
                    </th>
                    <th className="py-3 px-4 sm:px-6 font-semibold text-right text-blue-600">
                      {activeMetricMeta.shortLabel}
                      {activeMetricMeta.unit
                        ? ` (${activeMetricMeta.unit})`
                        : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                  {availableTimestamps.map((ts) => {
                    const psiItem = psiData?.data?.items?.find(
                      (i) => i.timestamp === ts
                    );
                    const pm25Item = pm25Data?.data?.items?.find(
                      (i) => i.timestamp === ts
                    );
                    const isActiveTs = ts === selectedTimestamp;

                    return (
                      <tr
                        key={ts}
                        onClick={() => setSelectedTimestamp(ts)}
                        className={`cursor-pointer transition-colors ${
                          isActiveTs
                            ? 'bg-blue-50/60 font-semibold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 sm:px-6 font-sans text-slate-900">
                          {formatFriendlyDateTime(ts)}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-500">
                          {formatFriendlyTime(
                            psiItem?.updatedTimestamp ||
                              pm25Item?.updatedTimestamp
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900">
                          {pm25Item?.readings?.pm25_one_hourly?.[
                            selectedRegion
                          ] ?? '—'}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right text-blue-600">
                          {psiItem?.readings?.[selectedPsiKey]?.[
                            selectedRegion
                          ] ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
