/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  PsiApiResponse,
  Pm25ApiResponse,
  RegionName,
} from '../types/nea';
import { getPsiBand } from '../services/neaApi';
import { Calendar, Clock, TrendingUp, BarChart2 } from 'lucide-react';

interface HourlyTrendsTabProps {
  selectedRegion: RegionName;
  onSelectRegion: (region: RegionName) => void;
  psiData: PsiApiResponse | null;
  pm25Data: Pm25ApiResponse | null;
  selectedTimestamp: string;
  onSelectTimestamp: (ts: string) => void;
  dateInput: string;
  onDateChange: (date: string) => void;
  onDateSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const HourlyTrendsTab: React.FC<HourlyTrendsTabProps> = ({
  selectedRegion,
  onSelectRegion,
  psiData,
  pm25Data,
  selectedTimestamp,
  onSelectTimestamp,
  dateInput,
  onDateChange,
  onDateSubmit,
  isLoading,
}) => {
  const psiItems = psiData?.data?.items || [];
  const pm25Items = pm25Data?.data?.items || [];

  // Combine unique timestamps sorted chronologically (earliest to latest for chart)
  const timestampsAsc = React.useMemo(() => {
    const set = new Set<string>();
    psiItems.forEach((i) => i.timestamp && set.add(i.timestamp));
    pm25Items.forEach((i) => i.timestamp && set.add(i.timestamp));
    return Array.from(set).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [psiItems, pm25Items]);

  const timestampsDesc = React.useMemo(() => {
    return [...timestampsAsc].reverse();
  }, [timestampsAsc]);

  // Extract chart points for 24-hr PSI in selectedRegion
  const chartPoints = React.useMemo(() => {
    return timestampsAsc.map((ts) => {
      const pItem = psiItems.find((i) => i.timestamp === ts);
      const val = pItem?.readings?.psi_twenty_four_hourly?.[selectedRegion] ?? 0;
      const pmVal = pm25Items.find((i) => i.timestamp === ts)?.readings?.pm25_one_hourly?.[selectedRegion] ?? 0;
      const timeLabel = new Date(ts).toLocaleTimeString('en-SG', {
        hour: 'numeric',
        hour12: true,
      });
      return { timestamp: ts, psi: val, pm25: pmVal, timeLabel };
    });
  }, [timestampsAsc, psiItems, pm25Items, selectedRegion]);

  const maxVal = Math.max(...chartPoints.map((p) => Math.max(p.psi, p.pm25)), 120);

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Date Filter & Today Button */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>Select Date for 24-Hour Trends</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {timestampsAsc.length} hourly logs
          </span>
        </div>

        <form onSubmit={onDateSubmit} className="flex items-center gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => onDateChange(e.target.value)}
            className="flex-1 min-h-[44px] px-3.5 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 dark:text-white"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 disabled:opacity-40 rounded-xl transition-colors cursor-pointer"
          >
            Load
          </button>
          {dateInput && (
            <button
              type="button"
              onClick={() => {
                onDateChange('');
                setTimeout(() => {
                  const form = document.querySelector('form');
                  form?.dispatchEvent(new Event('submit', { cancelable: true }));
                }, 10);
              }}
              className="min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Latest
            </button>
          )}
        </form>
      </section>

      {/* 2. Visual Hourly Chart (SVG Bars) */}
      {chartPoints.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <BarChart2 className="w-3.5 h-3.5 text-sky-500" />
              <span>Hourly PSI Trend ({selectedRegion.toUpperCase()})</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-sky-500 inline-block" /> 24-Hr PSI
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-amber-400 inline-block" /> 1-Hr PM2.5
              </span>
            </div>
          </div>

          {/* SVG Chart Area */}
          <div className="h-44 w-full flex items-end gap-1.5 pt-4 pb-2 px-1 overflow-x-auto border-b border-slate-100 dark:border-slate-800">
            {chartPoints.map((point) => {
              const isSelected = point.timestamp === selectedTimestamp;
              const psiHeight = Math.max(8, (point.psi / maxVal) * 110);
              const pm25Height = Math.max(6, (point.pm25 / maxVal) * 110);
              const band = getPsiBand(point.psi);

              return (
                <button
                  key={point.timestamp}
                  type="button"
                  onClick={() => onSelectTimestamp(point.timestamp)}
                  className={`flex flex-col items-center justify-end h-full min-w-[32px] flex-1 group cursor-pointer transition-all ${
                    isSelected ? 'opacity-100 scale-105' : 'opacity-75 hover:opacity-100'
                  }`}
                  title={`${point.timeLabel}: PSI ${point.psi}, PM2.5 ${point.pm25}`}
                >
                  <span className="text-[9px] font-mono tabular-nums text-slate-700 dark:text-slate-300 font-bold mb-1">
                    {point.psi}
                  </span>
                  <div className="w-full flex items-end justify-center gap-0.5 h-28">
                    {/* PSI bar */}
                    <div
                      style={{ height: `${psiHeight}px` }}
                      className={`w-3 rounded-t-sm transition-all ${
                        isSelected
                          ? 'bg-sky-600 ring-2 ring-sky-300'
                          : point.psi > 100
                          ? 'bg-amber-500'
                          : 'bg-sky-400 dark:bg-sky-500'
                      }`}
                    />
                    {/* PM2.5 bar */}
                    <div
                      style={{ height: `${pm25Height}px` }}
                      className="w-1.5 bg-amber-400/80 rounded-t-xs"
                    />
                  </div>
                  <span
                    className={`text-[9px] font-mono mt-1.5 whitespace-nowrap block ${
                      isSelected
                        ? 'font-bold text-sky-600 dark:text-sky-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {point.timeLabel.replace(' ', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Detailed Hourly Log List */}
      <section className="space-y-2" aria-label="Hourly Log Rows">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Hourly Snapshot History
          </span>
          <span className="text-[11px] text-slate-500">
            Tap to inspect snapshot
          </span>
        </div>

        <div className="space-y-2">
          {timestampsDesc.map((ts) => {
            const isSelected = ts === selectedTimestamp;
            const pItem = psiItems.find((i) => i.timestamp === ts);
            const pmItem = pm25Items.find((i) => i.timestamp === ts);
            const psiVal = pItem?.readings?.psi_twenty_four_hourly?.[selectedRegion] ?? 0;
            const pmVal = pmItem?.readings?.pm25_one_hourly?.[selectedRegion] ?? 0;
            const band = getPsiBand(psiVal);

            const d = new Date(ts);
            const formattedTime = d.toLocaleTimeString('en-SG', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <div
                key={ts}
                onClick={() => onSelectTimestamp(ts)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-sky-50/70 dark:bg-slate-800 border-sky-500 ring-1 ring-sky-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formattedTime}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-semibold text-sky-600 bg-sky-100 dark:bg-sky-950 px-1.5 py-0.2 rounded-full">
                          Viewing
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      PM2.5: {pmVal} µg/m³ · 24h Avg: {pItem?.readings?.pm25_twenty_four_hourly?.[selectedRegion] ?? '—'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {psiVal} <span className="text-[10px] font-normal text-slate-400">PSI</span>
                  </span>
                  <div className="mt-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${band.badgeBg}`}>
                      {band.band}
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
