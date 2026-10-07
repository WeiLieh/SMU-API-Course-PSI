/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PsiItem,
  Pm25Item,
  PsiMetricKey,
  RegionName,
} from '../types/nea';
import {
  SlidersHorizontal,
  Info,
  CheckCircle2,
  ChevronDown,
  Layers,
  Flame,
  Wind,
} from 'lucide-react';

interface PollutantsTabProps {
  selectedRegion: RegionName;
  onSelectRegion: (region: RegionName) => void;
  activePsiItem: PsiItem | null;
  activePm25Item: Pm25Item | null;
  isLoading: boolean;
}

interface PollutantMeta {
  key: PsiMetricKey | 'pm25_one_hourly';
  name: string;
  short: string;
  category: 'particulate' | 'gas' | 'index';
  unit?: string;
  desc: string;
  source: string;
  safeThreshold?: string;
}

const POLLUTANTS: PollutantMeta[] = [
  {
    key: 'pm25_one_hourly',
    name: '1-Hour PM2.5 Concentration',
    short: '1-Hr PM2.5',
    category: 'particulate',
    unit: 'µg/m³',
    desc: 'Fine particulate matter measuring ≤ 2.5 micrometers. Used for immediate, hourly outdoor activity decisions.',
    source: 'Vehicle exhaust, industrial emissions, bush fires & regional haze.',
    safeThreshold: '≤ 55 µg/m³ (Normal Band I)',
  },
  {
    key: 'psi_twenty_four_hourly',
    name: '24-Hour Overall PSI',
    short: '24-Hr PSI',
    category: 'index',
    desc: 'Singapore composite air quality index computed from the highest sub-index reading over the past 24 hours.',
    source: 'Composite index representing overall ambient air quality across all monitored pollutants.',
    safeThreshold: '0 – 100 (Good to Moderate)',
  },
  {
    key: 'pm25_twenty_four_hourly',
    name: '24-Hour PM2.5 Average',
    short: 'PM2.5 (24-Hr)',
    category: 'particulate',
    unit: 'µg/m³',
    desc: '24-hour moving average of fine particulate matter capable of deep lung penetration.',
    source: 'Regional transboundary smoke haze and domestic fossil fuel combustion.',
    safeThreshold: '≤ 37.5 µg/m³ (Singapore 24h target)',
  },
  {
    key: 'pm25_sub_index',
    name: 'PM2.5 Sub-Index',
    short: 'PM2.5 Sub-Idx',
    category: 'index',
    desc: 'Standardized sub-index calculated from 24-hour PM2.5 concentration.',
    source: 'Mathematical calculation used in official NEA PSI derivation.',
    safeThreshold: '≤ 100',
  },
  {
    key: 'pm10_twenty_four_hourly',
    name: '24-Hour PM10 Average',
    short: 'PM10 (24-Hr)',
    category: 'particulate',
    unit: 'µg/m³',
    desc: 'Inhalable coarse particles measuring ≤ 10 micrometers that irritate respiratory passages.',
    source: 'Road dust, construction activities, windblown soil and soot.',
    safeThreshold: '≤ 150 µg/m³',
  },
  {
    key: 'pm10_sub_index',
    name: 'PM10 Sub-Index',
    short: 'PM10 Sub-Idx',
    category: 'index',
    desc: 'Standardized sub-index calculated from 24-hour PM10 concentration.',
    source: 'Mathematical calculation for PM10 severity.',
    safeThreshold: '≤ 100',
  },
  {
    key: 'o3_eight_hour_max',
    name: 'Ozone (8-Hour Max)',
    short: 'O₃ (8-Hr)',
    category: 'gas',
    unit: 'µg/m³',
    desc: 'Ground-level photochemical ozone formed by solar radiation reacting with NOx and VOCs.',
    source: 'Chemical reactions under sunlight between car exhaust and volatile compounds.',
    safeThreshold: '≤ 100 µg/m³',
  },
  {
    key: 'o3_sub_index',
    name: 'Ozone Sub-Index',
    short: 'O₃ Sub-Idx',
    category: 'index',
    desc: 'Standardized sub-index calculated from 8-hour maximum ozone concentration.',
    source: 'Ground-level ozone photochemical risk index.',
    safeThreshold: '≤ 100',
  },
  {
    key: 'no2_one_hour_max',
    name: 'Nitrogen Dioxide (1-Hour Max)',
    short: 'NO₂ (1-Hr)',
    category: 'gas',
    unit: 'µg/m³',
    desc: 'Reddish-brown toxic gas produced during high-temperature combustion; irritates lungs.',
    source: 'Motor vehicles, diesel engines, and power generation plants.',
    safeThreshold: '≤ 200 µg/m³',
  },
  {
    key: 'co_eight_hour_max',
    name: 'Carbon Monoxide (8-Hour Max)',
    short: 'CO (8-Hr)',
    category: 'gas',
    unit: 'mg/m³',
    desc: 'Colorless, odorless gas that reduces oxygen delivery to organs and cardiovascular tissues.',
    source: 'Incomplete combustion of fuel in vehicle engines and industrial machinery.',
    safeThreshold: '≤ 10.0 mg/m³',
  },
  {
    key: 'co_sub_index',
    name: 'Carbon Monoxide Sub-Index',
    short: 'CO Sub-Idx',
    category: 'index',
    desc: 'Standardized sub-index calculated from 8-hour carbon monoxide readings.',
    source: 'Carbon monoxide exposure index.',
    safeThreshold: '≤ 100',
  },
  {
    key: 'so2_twenty_four_hourly',
    name: 'Sulphur Dioxide (24-Hour)',
    short: 'SO₂ (24-Hr)',
    category: 'gas',
    unit: 'µg/m³',
    desc: 'Pungent gas produced by burning sulphur-containing fossil fuels like heavy fuel oils.',
    source: 'Petroleum refineries (Jurong Island), shipping vessels and power stations.',
    safeThreshold: '≤ 80 µg/m³',
  },
  {
    key: 'so2_sub_index',
    name: 'Sulphur Dioxide Sub-Index',
    short: 'SO₂ Sub-Idx',
    category: 'index',
    desc: 'Standardized sub-index calculated from 24-hour sulphur dioxide concentration.',
    source: 'Sulphur dioxide exposure index.',
    safeThreshold: '≤ 100',
  },
];

export const PollutantsTab: React.FC<PollutantsTabProps> = ({
  selectedRegion,
  onSelectRegion,
  activePsiItem,
  activePm25Item,
  isLoading,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'particulate' | 'gas' | 'index'>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>('pm25_one_hourly');

  const filtered = POLLUTANTS.filter((p) => {
    if (filterCategory === 'all') return true;
    return p.category === filterCategory;
  });

  const getVal = (key: PollutantMeta['key'], region: RegionName) => {
    if (key === 'pm25_one_hourly') {
      return activePm25Item?.readings?.pm25_one_hourly?.[region] ?? null;
    }
    return activePsiItem?.readings?.[key as PsiMetricKey]?.[region] ?? null;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header & Category Filter Tabs */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Official NEA Pollutant Standards
            </h2>
            <p className="text-[11px] text-slate-500">
              Singapore {selectedRegion.toUpperCase()} Region Breakdown
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {filtered.length} Parameters
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All (13)' },
            { id: 'particulate', label: 'Particulate (PM)' },
            { id: 'gas', label: 'Gases (NO₂/CO/O₃/SO₂)' },
            { id: 'index', label: 'Sub-Indices' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Pollutant Cards Accordion */}
      <div className="space-y-2.5">
        {filtered.map((item) => {
          const val = getVal(item.key, selectedRegion);
          const isExpanded = expandedKey === item.key;

          return (
            <div
              key={item.key}
              className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                isExpanded
                  ? 'border-sky-400 ring-1 ring-sky-400/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {/* Card Header clickable */}
              <button
                type="button"
                onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.category === 'particulate'
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : item.category === 'gas'
                        ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {item.category === 'particulate' ? (
                      <Flame className="w-4 h-4" />
                    ) : item.category === 'gas' ? (
                      <Wind className="w-4 h-4" />
                    ) : (
                      <Layers className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {isLoading ? '·' : (val ?? '—')}
                    </span>
                    {item.unit && (
                      <span className="text-[10px] font-mono text-slate-400 ml-1">
                        {item.unit}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180 text-sky-600' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Details Drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Main Emission Sources
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                        {item.source}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Singapore Air Quality Guideline
                      </span>
                      <p className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                        {item.safeThreshold || 'Standard index threshold applies'}
                      </p>
                    </div>
                  </div>

                  {/* 5-Region Comparison Bars for this pollutant */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Cross-Region Reading ({item.short})
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {(['north', 'south', 'east', 'west', 'central'] as RegionName[]).map((r) => {
                        const rVal = getVal(item.key, r);
                        const isCurrent = selectedRegion === r;

                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => onSelectRegion(r)}
                            className={`p-1.5 rounded-lg border text-center transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-sky-50 dark:bg-slate-800 border-sky-400 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className="text-[10px] capitalize block text-slate-500">
                              {r}
                            </span>
                            <span className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                              {rVal ?? '—'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
