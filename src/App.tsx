/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RegionName,
  RegionMetadata,
  PsiApiResponse,
  Pm25ApiResponse,
  ApiHealthReport,
} from './types/nea';
import {
  fetchNeaAirQuality,
  lookupSingaporePostalCode,
  calculateDistanceKm,
  findNearestRegion,
  fetchApiHealthReport,
  getPsiBand,
  DEFAULT_REGIONS_METADATA,
} from './services/neaApi';
import { MobileTopBar } from './components/MobileTopBar';
import { BottomTabBar, TabId } from './components/BottomTabBar';
import { OverviewTab } from './components/OverviewTab';
import { MapRegionsTab } from './components/MapRegionsTab';
import { PollutantsTab } from './components/PollutantsTab';
import { HourlyTrendsTab } from './components/HourlyTrendsTab';
import { ApiHealthTab } from './components/ApiHealthTab';
import { HealthAdvisoryModal } from './components/HealthAdvisoryModal';
import { AlertCircle, Smartphone, Monitor } from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(true);

  // Air Quality Data States
  const [psiData, setPsiData] = useState<PsiApiResponse | null>(null);
  const [pm25Data, setPm25Data] = useState<Pm25ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Active Selections
  const [selectedRegion, setSelectedRegion] = useState<RegionName>('central');
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');

  // Postal Code & GPS Location
  const [postalCodeInput, setPostalCodeInput] = useState<string>('');
  const [postalAddress, setPostalAddress] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // API Health Monitor States
  const [healthReport, setHealthReport] = useState<ApiHealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [lastHealthChecked, setLastHealthChecked] = useState<string | null>(null);

  // Modal State
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState<boolean>(false);

  // 1. Load Real-time NEA Air Quality Data
  const loadAirQualityData = useCallback(async (queryDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { psi, pm25 } = await fetchNeaAirQuality(queryDate || undefined);
      setPsiData(psi);
      setPm25Data(pm25);

      const items = psi.data?.items || pm25.data?.items || [];
      if (items.length > 0) {
        setSelectedTimestamp(items[0].timestamp);
        if (!queryDate && items[0].date) {
          setDateInput(items[0].date);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load air quality readings from NEA.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Load API Health Status from /api/health.js
  const loadHealthStatus = useCallback(async () => {
    setHealthLoading(true);
    try {
      const report = await fetchApiHealthReport();
      setHealthReport(report);
      setLastHealthChecked(new Date().toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Could not load /api/health.js', err);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    loadAirQualityData();
    loadHealthStatus();

    // Periodic background health check every 60 seconds
    const interval = setInterval(() => {
      loadHealthStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadAirQualityData, loadHealthStatus]);

  // Extract Regions Metadata
  const regions: RegionMetadata[] = useMemo(() => {
    if (psiData?.data?.regionMetadata?.length) {
      return psiData.data.regionMetadata;
    }
    if (pm25Data?.data?.regionMetadata?.length) {
      return pm25Data.data.regionMetadata;
    }
    return DEFAULT_REGIONS_METADATA;
  }, [psiData, pm25Data]);

  // Active Items for Current Timestamp
  const activePsiItem = useMemo(() => {
    const items = psiData?.data?.items || [];
    if (!items.length) return null;
    if (!selectedTimestamp) return items[0];
    return items.find((i) => i.timestamp === selectedTimestamp) || items[0];
  }, [psiData, selectedTimestamp]);

  const activePm25Item = useMemo(() => {
    const items = pm25Data?.data?.items || [];
    if (!items.length) return null;
    if (!selectedTimestamp) return items[0];
    return items.find((i) => i.timestamp === selectedTimestamp) || items[0];
  }, [pm25Data, selectedTimestamp]);

  // Compute Great-Circle Distances to User Coords
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

  // 3. User Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGeoError(null);
    setGeoStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });

        const nearest = findNearestRegion(lat, lng, regions);
        if (nearest) {
          setSelectedRegion(nearest.region);
          setGeoStatus(
            `Located: Nearest to ${nearest.region.toUpperCase()} (${nearest.distanceKm.toFixed(1)} km away)`
          );
        }
        setIsLocating(false);
      },
      (err) => {
        setGeoError(err.message || 'Unable to retrieve location.');
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // 4. Postal Code Search Handler
  const resolvePostalCode = async (code: string) => {
    setIsLocating(true);
    setGeoError(null);
    setGeoStatus(null);
    try {
      const res = await lookupSingaporePostalCode(code);
      setPostalAddress(res.address);
      setUserCoords({ lat: res.latitude, lng: res.longitude });

      const nearest = findNearestRegion(res.latitude, res.longitude, regions);
      if (nearest) {
        setSelectedRegion(nearest.region);
        setGeoStatus(
          `Nearest to ${nearest.region.toUpperCase()} region (${nearest.distanceKm.toFixed(1)} km away)`
        );
      }
    } catch (err: any) {
      setPostalAddress(null);
      setGeoError(err?.message || 'Postal code search failed.');
    } finally {
      setIsLocating(false);
    }
  };

  const handlePostalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postalCodeInput.length === 6) {
      resolvePostalCode(postalCodeInput);
    } else {
      setGeoError('Please enter a 6-digit Singapore postal code.');
    }
  };

  const handlePostalChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setPostalCodeInput(digitsOnly);
    setGeoError(null);
    if (digitsOnly.length === 6) {
      resolvePostalCode(digitsOnly);
    } else {
      setPostalAddress(null);
      setGeoStatus(null);
    }
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAirQualityData(dateInput);
  };

  const currentPsiVal = activePsiItem?.readings?.psi_twenty_four_hourly?.[selectedRegion] ?? 0;
  const currentPsiBand = getPsiBand(currentPsiVal);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start sm:py-6 selection:bg-sky-500 selection:text-white">
      {/* Desktop Device Switcher Bar */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-md px-4 py-2 text-xs text-slate-400 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-200">Singapore NEA Live Feed</span>
        </div>
        <button
          type="button"
          onClick={() => setDeviceFrameMode(!deviceFrameMode)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
        >
          {deviceFrameMode ? (
            <>
              <Monitor className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone Frame</span>
            </>
          )}
        </button>
      </div>

      {/* Main Mobile App Frame */}
      <div
        className={`w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative transition-all duration-300 ${
          deviceFrameMode
            ? 'max-w-md min-h-[92vh] sm:rounded-[36px] sm:shadow-2xl sm:border sm:border-slate-800 sm:overflow-hidden'
            : 'max-w-2xl min-h-screen'
        }`}
      >
        {/* Simulated Mobile Status Notch on Desktop */}
        <div className="hidden sm:flex h-4 bg-slate-900 justify-center items-center">
          <div className="w-28 h-3.5 bg-black rounded-b-xl" />
        </div>

        {/* Mobile Top App Bar */}
        <MobileTopBar
          onRefresh={() => loadAirQualityData(dateInput)}
          onLocate={handleLocateMe}
          isLoading={loading}
          isLocating={isLocating}
          isHealthy={healthReport ? healthReport.status === 'healthy' : null}
          onOpenHealth={() => setActiveTab('health')}
        />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 px-4 py-4 overflow-y-auto">
          {/* Global Error Banner */}
          {error && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 flex items-start gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Air Quality Data Unavailable</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadAirQualityData(dateInput)}
                className="px-2.5 py-1 font-semibold bg-white dark:bg-slate-900 rounded-lg shadow-xs hover:bg-rose-100 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Active Tab Screen */}
          {activeTab === 'overview' && (
            <OverviewTab
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              regions={regions}
              activePsiItem={activePsiItem}
              activePm25Item={activePm25Item}
              isLoading={loading}
              onOpenAdvisory={() => setIsAdvisoryModalOpen(true)}
              onNavigateToMap={() => setActiveTab('map')}
              postalCodeInput={postalCodeInput}
              onPostalCodeChange={handlePostalChange}
              onPostalCodeSubmit={handlePostalSubmit}
              postalAddress={postalAddress}
              geoStatus={geoStatus}
              geoError={geoError}
              userCoords={userCoords}
            />
          )}

          {activeTab === 'map' && (
            <MapRegionsTab
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              regions={regions}
              activePsiItem={activePsiItem}
              activePm25Item={activePm25Item}
              userCoords={userCoords}
              regionDistances={regionDistances}
              onLocateMe={handleLocateMe}
              isLocating={isLocating}
              postalCodeInput={postalCodeInput}
              onPostalCodeChange={handlePostalChange}
              onPostalCodeSubmit={handlePostalSubmit}
              postalAddress={postalAddress}
              geoStatus={geoStatus}
              geoError={geoError}
            />
          )}

          {activeTab === 'pollutants' && (
            <PollutantsTab
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              activePsiItem={activePsiItem}
              activePm25Item={activePm25Item}
              isLoading={loading}
            />
          )}

          {activeTab === 'trends' && (
            <HourlyTrendsTab
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              psiData={psiData}
              pm25Data={pm25Data}
              selectedTimestamp={selectedTimestamp}
              onSelectTimestamp={setSelectedTimestamp}
              dateInput={dateInput}
              onDateChange={setDateInput}
              onDateSubmit={handleDateSubmit}
              isLoading={loading}
            />
          )}

          {activeTab === 'health' && (
            <ApiHealthTab
              healthReport={healthReport}
              isLoading={healthLoading}
              onRefreshHealth={loadHealthStatus}
              lastCheckedTime={lastHealthChecked}
            />
          )}
        </main>

        {/* Ergonomic Bottom Tab Navigation */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          apiHealthStatus={healthReport ? healthReport.status : null}
        />

        {/* Health Advisory Modal */}
        <HealthAdvisoryModal
          isOpen={isAdvisoryModalOpen}
          onClose={() => setIsAdvisoryModalOpen(false)}
          currentBand={currentPsiBand}
          currentPsi={currentPsiVal}
          regionName={selectedRegion.toUpperCase()}
        />
      </div>
    </div>
  );
}
