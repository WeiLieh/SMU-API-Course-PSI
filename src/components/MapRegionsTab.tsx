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
  MapPin,
  LocateFixed,
  Navigation,
  Compass,
  ArrowRight,
  Search,
} from 'lucide-react';

interface MapRegionsTabProps {
  selectedRegion: RegionName;
  onSelectRegion: (region: RegionName) => void;
  regions: RegionMetadata[];
  activePsiItem: PsiItem | null;
  activePm25Item: Pm25Item | null;
  userCoords: { lat: number; lng: number } | null;
  regionDistances: Record<string, number> | null;
  onLocateMe: () => void;
  isLocating: boolean;
  postalCodeInput: string;
  onPostalCodeChange: (val: string) => void;
  onPostalCodeSubmit: (e: React.FormEvent) => void;
  postalAddress: string | null;
  geoStatus: string | null;
  geoError: string | null;
}

const REGION_NAMES: Record<RegionName, string> = {
  north: 'North (Woodlands / Yishun)',
  south: 'South (Marina / Sentosa)',
  east: 'East (Changi / Tampines)',
  west: 'West (Jurong / Tuas)',
  central: 'Central (Bishan / CBD)',
};

export const MapRegionsTab: React.FC<MapRegionsTabProps> = ({
  selectedRegion,
  onSelectRegion,
  regions,
  activePsiItem,
  activePm25Item,
  userCoords,
  regionDistances,
  onLocateMe,
  isLocating,
  postalCodeInput,
  onPostalCodeChange,
  onPostalCodeSubmit,
  postalAddress,
  geoStatus,
  geoError,
}) => {
  return (
    <div className="space-y-4 pb-20">
      {/* 1. Interactive Map Section */}
      <section aria-label="Interactive Map" className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Singapore Air Quality Map
            </h2>
            <p className="text-[11px] text-slate-500">
              Interactive 5-region sensor monitoring
            </p>
          </div>
          <button
            type="button"
            onClick={onLocateMe}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 text-xs font-semibold hover:bg-sky-100 transition-colors cursor-pointer"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
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

      {/* 2. Postal Code & Location Bar */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-500" />
            <span>Find Distance from Your Location</span>
          </div>
          {userCoords && (
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-medium">
              GPS Active
            </span>
          )}
        </div>

        <form onSubmit={onPostalCodeSubmit} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            placeholder="6-Digit Postal Code (e.g. 178902)"
            value={postalCodeInput}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            className="flex-1 min-h-[44px] px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 dark:text-white"
          />
          <button
            type="submit"
            disabled={postalCodeInput.length !== 6}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 disabled:opacity-40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        {postalAddress && (
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 text-xs text-sky-900 dark:text-sky-200">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{postalAddress}</p>
                {geoStatus && <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">{geoStatus}</p>}
              </div>
            </div>
          </div>
        )}

        {geoError && (
          <p className="text-xs text-rose-600 font-medium">{geoError}</p>
        )}
      </section>

      {/* 3. Regional Comparison Cards */}
      <section className="space-y-2.5" aria-label="All Regions Breakdown">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            All 5 Singapore Regions
          </span>
          <span className="text-[11px] text-slate-500">
            Tap a card to switch region
          </span>
        </div>

        <div className="space-y-2">
          {(['central', 'north', 'south', 'east', 'west'] as RegionName[]).map((r) => {
            const isSelected = selectedRegion === r;
            const psi = activePsiItem?.readings?.psi_twenty_four_hourly?.[r] ?? 0;
            const pm25 = activePm25Item?.readings?.pm25_one_hourly?.[r] ?? 0;
            const band = getPsiBand(psi);
            const dist = regionDistances?.[r];
            const meta = regions.find((reg) => reg.name === r);

            return (
              <div
                key={r}
                onClick={() => onSelectRegion(r)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50/70 dark:bg-slate-800 border-sky-500 ring-1 ring-sky-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                        {r} Region
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-sky-600 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {REGION_NAMES[r]}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${band.badgeBg}`}>
                      {band.band}
                    </span>
                    {dist !== undefined && (
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        {dist.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">24-Hr PSI</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {psi}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">1-Hr PM2.5</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {pm25} <span className="text-[9px] font-normal text-slate-400">µg/m³</span>
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Coordinates</span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 block truncate">
                      {meta?.labelLocation.latitude.toFixed(2)}, {meta?.labelLocation.longitude.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
