/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ApiHealthReport } from '../types/nea';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Server,
  Code2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface ApiHealthTabProps {
  healthReport: ApiHealthReport | null;
  isLoading: boolean;
  onRefreshHealth: () => void;
  lastCheckedTime: string | null;
}

export const ApiHealthTab: React.FC<ApiHealthTabProps> = ({
  healthReport,
  isLoading,
  onRefreshHealth,
  lastCheckedTime,
}) => {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    if (!healthReport) return;
    navigator.clipboard.writeText(JSON.stringify(healthReport, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHealthy = healthReport?.status === 'healthy';
  const isDegraded = healthReport?.status === 'degraded';

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header & Live Diagnostics CTA */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
                isHealthy
                  ? 'bg-emerald-600'
                  : isDegraded
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}
            >
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  API Health Monitor
                </h2>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  /api/health.js
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring Singapore Government PSI & Geocoding Endpoints
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshHealth}
            disabled={isLoading}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Ping All APIs</span>
          </button>
        </div>

        {/* Overall Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isHealthy
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
              : isDegraded
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isHealthy ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : isDegraded ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                Status: {healthReport?.status || 'CHECKING...'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">
                {healthReport?.summary?.message || 'Contacting /api/health.js...'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold font-mono tabular-nums">
              {healthReport?.summary?.healthScorePercent ?? 100}%
            </span>
            <span className="text-[10px] block opacity-75">Health Score</span>
          </div>
        </div>

        {/* Key Health Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-500 block">Operational</span>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {healthReport?.summary?.operational ?? 0} / {healthReport?.summary?.totalServices ?? 4}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-500 block">Average Latency</span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {healthReport?.summary?.averageLatencyMs ?? 0} ms
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            <span className="text-[10px] text-slate-500 block">Uptime</span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {healthReport?.uptimeSeconds ?? 0}s
            </span>
          </div>
        </div>
      </section>

      {/* 2. Monitored Endpoints List */}
      <section className="space-y-2.5" aria-label="Monitored API Services">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Monitored Endpoint Services
          </span>
          <span className="text-[11px] text-slate-500">
            Last ping: {lastCheckedTime || 'Just now'}
          </span>
        </div>

        <div className="space-y-2">
          {healthReport?.services?.map((svc) => {
            const isUp = svc.status === 'UP';
            const isDeg = svc.status === 'DEGRADED';

            return (
              <div
                key={svc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {svc.name}
                      </span>
                      {svc.critical && (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded-full">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {svc.url}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full font-mono ${
                        isUp
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isDeg
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {svc.status}
                    </span>
                  </div>
                </div>

                {/* Latency & Metadata Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>HTTP: <strong className="font-mono text-slate-800 dark:text-slate-200">{svc.httpStatus ?? 'ERR'}</strong></span>
                    <span>·</span>
                    <span>Latency: <strong className="font-mono text-slate-800 dark:text-slate-200">{svc.latencyMs} ms</strong></span>
                  </div>

                  {svc.metadata && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      {svc.metadata.resolvedAddress ? (
                        <span className="truncate max-w-[200px] inline-block text-sky-600">
                          ✓ OneMap Address Match
                        </span>
                      ) : svc.metadata.regionsAvailable ? (
                        <span>✓ 5 Regions Active</span>
                      ) : (
                        <span>✓ Verified Payload</span>
                      )}
                    </div>
                  )}
                </div>

                {svc.error && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg">
                    {svc.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Raw JSON Viewer & Inspector */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Code2 className="w-4 h-4 text-sky-500" />
            <span>Developer / Audit JSON Response</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              disabled={!healthReport}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition-colors cursor-pointer"
            >
              {showJson ? 'Collapse' : 'Inspect'}
            </button>
          </div>
        </div>

        {showJson && (
          <pre className="p-3 bg-slate-950 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800">
            {JSON.stringify(healthReport, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
};
