/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutDashboard, Map, Sliders, TrendingUp, Activity } from 'lucide-react';

export type TabId = 'overview' | 'map' | 'pollutants' | 'trends' | 'health';

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  apiHealthStatus: 'healthy' | 'degraded' | 'unhealthy' | null;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  apiHealthStatus,
}) => {
  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: LayoutDashboard },
    { id: 'map' as TabId, label: 'Map', icon: Map },
    { id: 'pollutants' as TabId, label: 'Pollutants', icon: Sliders },
    { id: 'trends' as TabId, label: 'Trends', icon: TrendingUp },
    { id: 'health' as TabId, label: 'API Health', icon: Activity, badge: apiHealthStatus },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-bottom"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] transition-colors relative cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                />
                {tab.id === 'health' && (
                  <span
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                      tab.badge === 'healthy'
                        ? 'bg-emerald-500'
                        : tab.badge === 'degraded'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 bg-sky-600 dark:bg-sky-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
