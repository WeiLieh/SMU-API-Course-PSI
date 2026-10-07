/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LocateFixed, RefreshCw, Wind } from 'lucide-react';

interface MobileTopBarProps {
  onRefresh: () => void;
  onLocate: () => void;
  isLoading: boolean;
  isLocating: boolean;
  isHealthy: boolean | null;
  onOpenHealth: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  onRefresh,
  onLocate,
  isLoading,
  isLocating,
  isHealthy,
  onOpenHealth,
}) => {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
      {/* Brand Zone - Single text element wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
          <Wind className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            SG Air Quality
          </span>
          {/* Live API Health Dot Indicator */}
          <button
            type="button"
            onClick={onOpenHealth}
            title="API Status: Click to view health monitor"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy === true
                  ? 'bg-emerald-500 animate-pulse'
                  : isHealthy === false
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-[9px] uppercase">API</span>
          </button>
        </div>
      </div>

      {/* Action Zone - Accessible Touch Targets */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onLocate}
          disabled={isLocating || isLoading}
          title="Find closest Singapore region via GPS"
          aria-label="Use Current Location"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
        >
          <LocateFixed className={`w-5 h-5 ${isLocating ? 'animate-pulse text-sky-600' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh real-time NEA readings"
          aria-label="Refresh Readings"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
