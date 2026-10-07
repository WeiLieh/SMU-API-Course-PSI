/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ShieldCheck, AlertTriangle, HeartPulse, UserCheck, Baby } from 'lucide-react';
import { AirBandInfo } from '../types/nea';

interface HealthAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBand: AirBandInfo;
  currentPsi: number;
  regionName: string;
}

export const HealthAdvisoryModal: React.FC<HealthAdvisoryModalProps> = ({
  isOpen,
  onClose,
  currentBand,
  currentPsi,
  regionName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Official NEA Health Advisory
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Current Status Highlight */}
          <div className={`p-4 rounded-2xl border ${currentBand.bgClass} ${currentBand.borderClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Current Condition · {regionName}
                </span>
                <h4 className={`text-xl font-bold mt-0.5 ${currentBand.textClass}`}>
                  {currentBand.band} (PSI {currentPsi})
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-medium text-slate-500">
                  Band: {currentBand.rangeLabel}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {currentBand.description}
            </p>
          </div>

          {/* Group 1: Healthy Individuals */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Healthy Persons</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentBand.generalAdvisory}
            </p>
          </div>

          {/* Group 2: Elderly, Pregnant Women & Children */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <Baby className="w-4 h-4 text-amber-600" />
              <span>Elderly, Pregnant & Children</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentBand.vulnerableAdvisory}
            </p>
          </div>

          {/* Group 3: Chronic Lung / Heart Disease */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span>Chronic Lung or Heart Patients</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Avoid strenuous outdoor activity. Have asthma relief medication or inhaler on standby. If feeling unwell, seek medical help immediately.
            </p>
          </div>

          {/* Complete 5-Band NEA Reference Guide */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Singapore NEA PSI Reference Scale
            </span>
            <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                <div className="font-bold">0 – 50</div>
                <div className="text-[9px] mt-0.5 font-sans">Good</div>
              </div>
              <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300">
                <div className="font-bold">51 – 100</div>
                <div className="text-[9px] mt-0.5 font-sans">Moderate</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                <div className="font-bold">101 – 200</div>
                <div className="text-[9px] mt-0.5 font-sans">Unhealthy</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300">
                <div className="font-bold">201 – 300</div>
                <div className="text-[9px] mt-0.5 font-sans">V. Unhealthy</div>
              </div>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300">
                <div className="font-bold">&gt; 300</div>
                <div className="text-[9px] mt-0.5 font-sans">Hazardous</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors hover:bg-slate-800 cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
