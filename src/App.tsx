/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Compass,
  LocateFixed,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  SlidersHorizontal,
  MapPin,
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
} from './services/neaApi';

const PSI_READING_KEYS: PsiMetricKey[] = [
  'psi_twenty_four_hourly',
  'pm25_twenty_four_hourly',
  'pm25_sub_index',
  'pm10_twenty_four_hourly',
  'pm10_sub_index',
  'so2_twenty_four_hourly',
  'so2_sub_index',
  'co_eight_hour_max',
  'co_sub_index',
  'o3_eight_hour_max',
  'o3_sub_index',
  'no2_one_hour_max',
];

function formatTimestamp(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-SG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
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

  // User Location Coordinates (matched against API regionMetadata.labelLocation)
  const [userLat, setUserLat] = useState<string>('');
  const [userLng, setUserLng] = useState<string>('');
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
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

      // Sync dateInput with returned item date if empty
      if (!queryDate && psiItems[0]?.date) {
        setDateInput(psiItems[0].date);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch NEA API data'
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
    const meta =
      psiData?.data?.regionMetadata?.length
        ? psiData.data.regionMetadata
        : pm25Data?.data?.regionMetadata || [];
    return meta;
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

  // Calculate distances from user coordinates to each region's labelLocation
  const regionDistances = useMemo(() => {
    const lat = parseFloat(userLat);
    const lng = parseFloat(userLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const map: Record<string, number> = {};
    for (const r of regions) {
      map[r.name] = calculateDistanceKm(
        lat,
        lng,
        r.labelLocation.latitude,
        r.labelLocation.longitude
      );
    }
    return map;
  }, [userLat, userLng, regions]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Browser Geolocation API is not available');
      return;
    }
    setLocating(true);
    setGeoStatus(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat.toFixed(5));
        setUserLng(lng.toFixed(5));
        const nearest = findNearestRegion(lat, lng, regions);
        if (nearest) {
          setSelectedRegion(nearest.region);
          setGeoStatus(
            `Nearest region: ${nearest.region} (${nearest.distanceKm.toFixed(2)} km)`
          );
        }
        setLocating(false);
      },
      (err) => {
        setGeoStatus(err.message || 'Unable to acquire device coordinates');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCoordinateChange = (newLat: string, newLng: string) => {
    setUserLat(newLat);
    setUserLng(newLng);
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && regions.length > 0) {
      const nearest = findNearestRegion(lat, lng, regions);
      if (nearest) {
        setSelectedRegion(nearest.region);
        setGeoStatus(
          `Nearest region: ${nearest.region} (${nearest.distanceKm.toFixed(2)} km)`
        );
      }
    } else {
      setGeoStatus(null);
    }
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(dateInput);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones (Brand, Nav links, Primary Actions) */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <a
          href="#overview"
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          SG Air Monitor
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#controls"
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Location & Query
          </a>
          <a
            href="#primary-readings"
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            PSI & PM2.5
          </a>
          <a
            href="#psi-breakdown"
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Sub-Indices
          </a>
          <a
            href="#regional-matrix"
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Regional Matrix
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating || loading}
            className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
            <span>{locating ? 'Locating...' : 'Nearest Region'}</span>
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
      <main
        id="overview"
        className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8"
      >
        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">API Request Error</p>
              <p className="text-rose-700 mt-0.5 font-mono text-xs">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => loadData(dateInput)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        )}

        {/* Section 1: Controls corresponding strictly to API inputs and regionMetadata */}
        <section
          id="controls"
          aria-label="API Query and Location Controls"
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Real-Time PSI & PM2.5 Telemetry
              </h1>
              {/* Zero-Pill Metadata Discipline: Clean unboxed text with · separators */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                <span>
                  date: {activePsiItem?.date || activePm25Item?.date || '—'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  timestamp:{' '}
                  {activePsiItem?.timestamp ||
                    activePm25Item?.timestamp ||
                    '—'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  updatedTimestamp:{' '}
                  {activePsiItem?.updatedTimestamp ||
                    activePm25Item?.updatedTimestamp ||
                    '—'}
                </span>
              </div>
            </div>

            {/* Region Selector Tabs from data.regionMetadata[].name */}
            <div className="flex flex-col sm:items-end gap-1.5">
              <span className="text-xs font-medium text-slate-500">
                regionMetadata.name
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
                      className={`min-h-[44px] px-3 py-2 text-xs font-semibold capitalize rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Input Fields Mapped to API Query Parameters & Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* 1. API Date Parameter (?date=YYYY-MM-DD) & Timestamp Item Selector */}
            <div className="space-y-3">
              <form onSubmit={handleDateSubmit} className="space-y-1.5">
                <label
                  htmlFor="api-date-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Query Parameter (date)</span>
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
                    items[].timestamp ({availableTimestamps.length})
                  </span>
                </label>
                <select
                  id="timestamp-select"
                  value={selectedTimestamp}
                  onChange={(e) => setSelectedTimestamp(e.target.value)}
                  disabled={availableTimestamps.length === 0}
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                >
                  {availableTimestamps.map((ts) => (
                    <option key={ts} value={ts}>
                      {ts}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Coordinate Inputs matching regionMetadata[].labelLocation */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="user-lat-input"
                    className="flex items-center gap-1 text-xs font-semibold text-slate-700"
                  >
                    <Compass className="w-3.5 h-3.5 text-slate-400" />
                    <span>latitude</span>
                  </label>
                  <input
                    id="user-lat-input"
                    type="number"
                    step="0.00001"
                    placeholder={
                      activeRegionMeta
                        ? String(activeRegionMeta.labelLocation.latitude)
                        : '1.35735'
                    }
                    value={userLat}
                    onChange={(e) =>
                      handleCoordinateChange(e.target.value, userLng)
                    }
                    className="w-full min-h-[44px] px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="user-lng-input"
                    className="flex items-center gap-1 text-xs font-semibold text-slate-700"
                  >
                    <Compass className="w-3.5 h-3.5 text-slate-400" />
                    <span>longitude</span>
                  </label>
                  <input
                    id="user-lng-input"
                    type="number"
                    step="0.00001"
                    placeholder={
                      activeRegionMeta
                        ? String(activeRegionMeta.labelLocation.longitude)
                        : '103.82'
                    }
                    value={userLng}
                    onChange={(e) =>
                      handleCoordinateChange(userLat, e.target.value)
                    }
                    className="w-full min-h-[44px] px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    labelLocation:{' '}
                    {activeRegionMeta
                      ? `${activeRegionMeta.labelLocation.latitude}, ${activeRegionMeta.labelLocation.longitude}`
                      : '—'}
                  </span>
                </span>
                {geoStatus && (
                  <span className="text-blue-600 font-sans font-medium truncate max-w-[180px]">
                    {geoStatus}
                  </span>
                )}
              </div>
            </div>

            {/* 3. PSI Reading Metric Selector corresponding to data.items[].readings */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="psi-reading-key-select"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>PSI readings Metric Key</span>
                </label>
                <select
                  id="psi-reading-key-select"
                  value={selectedPsiKey}
                  onChange={(e) =>
                    setSelectedPsiKey(e.target.value as PsiMetricKey)
                  }
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                >
                  {PSI_READING_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-mono tabular-nums pt-0.5">
                <span>API Response Code: </span>
                <span>
                  PSI={psiData ? psiData.code : '—'} · PM2.5=
                  {pm25Data ? pm25Data.code : '—'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Focal Anchor — Primary Regional Readings for Selected Region */}
        <section
          id="primary-readings"
          aria-label="Selected Region Primary Readings"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
        >
          {/* Card 1: PSI 24-Hourly */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>psi_twenty_four_hourly</span>
                <span className="capitalize font-sans font-semibold text-slate-700">
                  {selectedRegion}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Endpoint: /v2/real-time/api/psi
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
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>timestamp: {formatTimestamp(activePsiItem?.timestamp)}</span>
              <span>date: {activePsiItem?.date || '—'}</span>
            </div>
          </div>

          {/* Card 2: PM2.5 1-Hourly (from PM2.5 Endpoint) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>pm25_one_hourly</span>
                <span className="capitalize font-sans font-semibold text-slate-700">
                  {selectedRegion}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Endpoint: /v2/real-time/api/pm25
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
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>
                timestamp: {formatTimestamp(activePm25Item?.timestamp)}
              </span>
              <span>date: {activePm25Item?.date || '—'}</span>
            </div>
          </div>

          {/* Card 3: Active Inspected Metric from PSI Endpoint */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-blue-600 font-mono font-semibold">
                <span className="truncate">{selectedPsiKey}</span>
                <span className="capitalize font-sans text-slate-700">
                  {selectedRegion}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Selected PSI Reading Field
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
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>
                lat: {activeRegionMeta?.labelLocation.latitude ?? '—'}
              </span>
              <span>
                lng: {activeRegionMeta?.labelLocation.longitude ?? '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: Complete PSI Endpoint Readings for Selected Region */}
        <section
          id="psi-breakdown"
          aria-label="All PSI Endpoint Readings for Selected Region"
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                PSI Endpoint Readings ({selectedRegion})
              </h2>
              <p className="text-xs text-slate-500">
                Select any metric card below to inspect it across all regions
                and timestamps
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 tabular-nums">
              updatedTimestamp: {activePsiItem?.updatedTimestamp || '—'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {PSI_READING_KEYS.map((key) => {
              const val = activePsiItem?.readings?.[key]?.[selectedRegion];
              const isSelected = selectedPsiKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPsiKey(key)}
                  className={`min-h-[88px] p-4 rounded-xl border text-left transition-colors flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-mono text-slate-600 break-all">
                    {key}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      {loading ? '·' : (val ?? '—')}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      {selectedRegion}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: Regional Comparison Matrix across all regionMetadata items */}
        <section
          id="regional-matrix"
          aria-label="Regional Comparison Matrix"
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Regional Comparison Matrix
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                regionMetadata · pm25_one_hourly · {selectedPsiKey}
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 tabular-nums">
              timestamp: {selectedTimestamp || '—'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-mono text-slate-500">
                  <th className="py-3.5 px-4 sm:px-6 font-semibold">
                    regionMetadata.name
                  </th>
                  <th className="py-3.5 px-4 font-semibold">
                    labelLocation.latitude
                  </th>
                  <th className="py-3.5 px-4 font-semibold">
                    labelLocation.longitude
                  </th>
                  {regionDistances && (
                    <th className="py-3.5 px-4 font-semibold text-right">
                      distance (km)
                    </th>
                  )}
                  <th className="py-3.5 px-4 font-semibold text-right">
                    pm25_one_hourly
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    psi_twenty_four_hourly
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 font-semibold text-right text-blue-600">
                    {selectedPsiKey}
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
                      <td className="py-3.5 px-4 sm:px-6 font-sans capitalize text-slate-900">
                        {r.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {r.labelLocation.latitude}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {r.labelLocation.longitude}
                      </td>
                      {regionDistances && (
                        <td className="py-3.5 px-4 text-right text-slate-600">
                          {dist !== undefined ? dist.toFixed(2) : '—'}
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

        {/* Section 5: Timestamp Items Log (when date query returns multiple hourly items) */}
        {availableTimestamps.length > 1 && (
          <section
            aria-label="Returned Timestamp Items"
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Returned Items by Timestamp ({selectedRegion})
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  items[].timestamp ({availableTimestamps.length} records
                  returned for date {dateInput})
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-mono text-slate-500">
                  <tr>
                    <th className="py-3 px-4 sm:px-6 font-semibold">
                      timestamp
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      updatedTimestamp
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      pm25_one_hourly ({selectedRegion})
                    </th>
                    <th className="py-3 px-4 sm:px-6 font-semibold text-right text-blue-600">
                      {selectedPsiKey} ({selectedRegion})
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
                        <td className="py-3 px-4 sm:px-6 text-slate-900">
                          {ts}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {psiItem?.updatedTimestamp ||
                            pm25Item?.updatedTimestamp ||
                            '—'}
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
