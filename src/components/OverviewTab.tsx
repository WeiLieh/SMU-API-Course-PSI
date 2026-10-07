/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  RegionName,
  RegionMetadata,
  PsiItem,
  Pm25Item,
} from '../types/nea';
import { getPsiBand, getPm25Band } from '../services/neaApi';
import { SingaporeMap } from './SingaporeMap';
import {
  ShieldAlert,
  ChevronRight,
  MapPin,
  Clock,
  Sparkles,
  Info,
  Search,
} from 'lucide-react';

interface OverviewTabProps {
  selectedRegion: RegionName;
  onSelectRegion: (region: RegionName) => void;
  regions: RegionMetadata[];
  activePsiItem: PsiItem | null;
  activePm25Item: Pm25Item | null;
  isLoading: boolean;
  onOpenAdvisory: () => void;
  onNavigateToMap: () => void;
  postalCodeInput: string;
  onPostalCodeChange: (val: string) => void;
  onPostalCodeSubmit: (e: React.FormEvent) => void;
  postalAddress: string | null;
  geoStatus: string | null;
  geoError: string | null;
  userCoords: { lat: number; lng: number } | null;
}

const REGION_LABELS: Record<RegionName, string> = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
  central: 'Central',
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  selectedRegion,
  onSelectRegion,
  regions,
  activePsiItem,
  activePm25Item,
  isLoading,
  onOpenAdvisory,
  onNavigateToMap,
  postalCodeInput,
  onPostalCodeChange,
  onPostalCodeSubmit,
  postalAddress,
  geoStatus,
  geoError,
  userCoords,
}) => {
  const currentPsi = activePsiItem?.readings?.psi_twenty_four_hourly?.[selectedRegion] ?? 0;
  const currentPm25 = activePm25Item?.readings?.pm25_one_hourly?.[selectedRegion] ?? 0;
  const psiBand = getPsiBand(currentPsi);
  const pm25Band = getPm25Band(currentPm25);

  const formatTime = (ts?: string) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Region Switcher Segmented Control */}
      <section aria-label="Region Selector">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Singapore Region
          </span>
          <span className="text-[11px] text-slate-500">
            Selected: <strong className="text-slate-900 dark:text-white font-medium">{REGION_LABELS[selectedRegion]}</strong>
          </span>
        </div>
        <div
          role="tablist"
          className="grid grid-cols-5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl gap-1"
        >
          {(['north', 'south', 'east', 'west', 'central'] as RegionName[]).map((r) => {
            const isSelected = selectedRegion === r;
            const regPsi = activePsiItem?.readings?.psi_twenty_four_hourly?.[r] ?? 0;
            return (
              <button
                key={r}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => onSelectRegion(r)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-h-[46px] transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span className="text-xs leading-none">{REGION_LABELS[r]}</span>
                <span className="text-[10px] font-mono tabular-nums mt-0.5 opacity-80">
                  {isLoading ? '·' : regPsi}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Primary Focal Hero Card - 24-Hour PSI */}
      <section
        aria-label="Current Air Quality Hero"
        className={`relative overflow-hidden rounded-3xl p-6 border shadow-sm transition-all ${psiBand.bgClass} ${psiBand.borderClass}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span>Singapore {REGION_LABELS[selectedRegion]}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              24-Hour PSI
            </h1>
          </div>

          {/* Air Quality Band Pill */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${psiBand.badgeBg}`}>
            {psiBand.band}
          </div>
        </div>

        {/* Hero Value Display */}
        <div className="my-6 flex items-baseline justify-center gap-3">
          <span className="text-6xl sm:text-7xl font-extrabold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
            {isLoading ? '···' : currentPsi}
          </span>
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">PSI</span>
            <span className="text-[11px] font-mono text-slate-500">Scale: {psiBand.rangeLabel}</span>
          </div>
        </div>

        {/* Sub-status & Description */}
        <p className="text-center text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
          {psiBand.description}
        </p>

        {/* Clean Unboxed Metadata Footer */}
        <div className="mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Reading: {formatTime(activePsiItem?.timestamp)}</span>
          </span>
          <span>·</span>
          <span>Updated: {formatTime(activePsiItem?.updatedTimestamp)}</span>
        </div>
      </section>

      {/* 3. 1-Hour PM2.5 & Key Secondary Metric Grid */}
      <section className="grid grid-cols-2 gap-3" aria-label="Key Pollutant Metrics">
        {/* Card A: 1-Hour PM2.5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                1-Hr PM2.5
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pm25Band.badgeBg}`}>
                {pm25Band.band.replace('Band ', 'B')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Fine particles</p>
          </div>
          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {isLoading ? '·' : currentPm25}
            </span>
            <span className="text-[11px] font-mono text-slate-400">µg/m³</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">
            {pm25Band.description}
          </span>
        </div>

        {/* Card B: 24-Hour PM10 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                PM10 (24-Hr)
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Coarse
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Inhalable dust</p>
          </div>
          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {isLoading ? '·' : (activePsiItem?.readings?.pm10_twenty_four_hourly?.[selectedRegion] ?? '—')}
            </span>
            <span className="text-[11px] font-mono text-slate-400">µg/m³</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">
            Sub-index: {activePsiItem?.readings?.pm10_sub_index?.[selectedRegion] ?? '—'}
          </span>
        </div>
      </section>

      {/* 4. NEA Health Advisory CTA Card */}
      <section aria-label="Health Recommendation">
        <button
          type="button"
          onClick={onOpenAdvisory}
          className="w-full text-left bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border border-sky-100 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-xs active:scale-[0.99] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  NEA Health Advisory
                </span>
                <span className="text-[10px] text-sky-700 dark:text-sky-300 font-medium">
                  · {psiBand.band}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                {psiBand.generalAdvisory}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </button>
      </section>

      {/* 5. 6-Digit Singapore Postal Code Quick Finder */}
      <section
        aria-label="Postal Code Location Resolver"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-sky-500" />
            <span>Find Air Quality by Postal Code</span>
          </div>
          <span className="text-[10px] text-slate-400">OneMap Singapore</span>
        </div>

        <form onSubmit={onPostalCodeSubmit} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            placeholder="Enter 6-digit postal (e.g. 178902)"
            value={postalCodeInput}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            className="flex-1 min-h-[44px] px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 dark:text-white"
          />
          <button
            type="submit"
            disabled={postalCodeInput.length !== 6}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 disabled:opacity-40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Locate</span>
          </button>
        </form>

        {/* Quick Sample Postal Codes */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="text-[10px]">Try:</span>
          {[
            { code: '178902', name: 'SMU' },
            { code: '018956', name: 'Marina Bay' },
            { code: '738344', name: 'Woodlands' },
            { code: '609606', name: 'Jurong' },
            { code: '529536', name: 'Tampines' },
          ].map((sample) => (
            <button
              key={sample.code}
              type="button"
              onClick={() => {
                onPostalCodeChange(sample.code);
              }}
              className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] transition-colors cursor-pointer"
            >
              {sample.name} ({sample.code})
            </button>
          ))}
        </div>

        {/* Feedback messages */}
        {postalAddress && (
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{postalAddress}</p>
              {geoStatus && <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">{geoStatus}</p>}
            </div>
          </div>
        )}
        {geoError && (
          <p className="text-xs text-rose-600 font-medium">{geoError}</p>
        )}
      </section>

      {/* 6. Mini Interactive Singapore Map Preview */}
      <section className="space-y-2" aria-label="Singapore Regional Map Preview">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Regional Map Preview
          </span>
          <button
            type="button"
            onClick={onNavigateToMap}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium flex items-center gap-0.5 cursor-pointer"
          >
            <span>Full Map & Distances</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <SingaporeMap
          regions={regions}
          selectedRegion={selectedRegion}
          onSelectRegion={onSelectRegion}
          psiReadings={activePsiItem?.readings?.psi_twenty_four_hourly}
          pm25Readings={activePm25Item?.readings?.pm25_one_hourly}
          userCoords={userCoords}
        />
      </section>
    </div>
  );
};
