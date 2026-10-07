/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RegionMetadata, RegionName, RegionalReadingMap } from '../types/nea';
import { getPsiBand } from '../services/neaApi';
import { MapPin } from 'lucide-react';

interface SingaporeMapProps {
  regions: RegionMetadata[];
  selectedRegion: RegionName;
  onSelectRegion: (region: RegionName) => void;
  psiReadings?: RegionalReadingMap;
  pm25Readings?: RegionalReadingMap;
  userCoords?: { lat: number; lng: number } | null;
}

// Visual layout coordinates tailored for 400x260 SVG viewport
const REGION_COORDS: Record<
  RegionName,
  { x: number; y: number; label: string; offset: { x: number; y: number } }
> = {
  west: { x: 105, y: 130, label: 'West', offset: { x: -35, y: 10 } },
  north: { x: 200, y: 68, label: 'North', offset: { x: 0, y: -26 } },
  central: { x: 200, y: 130, label: 'Central', offset: { x: 0, y: 22 } },
  south: { x: 205, y: 185, label: 'South', offset: { x: 0, y: 24 } },
  east: { x: 305, y: 125, label: 'East', offset: { x: 35, y: 8 } },
};

export const SingaporeMap: React.FC<SingaporeMapProps> = ({
  selectedRegion,
  onSelectRegion,
  psiReadings,
  pm25Readings,
  userCoords,
}) => {
  // Convert GPS (lat, lng) to SVG x, y within bounds (lng: 103.60 to 104.04, lat: 1.22 to 1.47)
  const getUserSvgPos = () => {
    if (!userCoords) return null;
    const minLng = 103.6;
    const maxLng = 104.04;
    const minLat = 1.22;
    const maxLat = 1.47;

    const x = ((userCoords.lng - minLng) / (maxLng - minLng)) * 360 + 20;
    const y = ((maxLat - userCoords.lat) / (maxLat - minLat)) * 220 + 20;
    return { x: Math.max(20, Math.min(380, x)), y: Math.max(20, Math.min(240, y)) };
  };

  const userSvgPos = getUserSvgPos();

  return (
    <div className="relative w-full bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner border border-slate-800">
      {/* Background Grid & Ambient Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 400 240"
        className="w-full h-auto select-none overflow-visible"
        aria-label="Singapore Air Quality Regional Map"
      >
        <defs>
          <linearGradient id="mainlandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Singapore Mainland Outline Silhouette */}
        <path
          d="M 60,145 
             C 55,130 65,115 80,105 
             C 100,95 130,90 150,80 
             C 170,70 190,45 220,50 
             C 240,55 255,75 275,80 
             C 295,85 320,90 345,100 
             C 365,110 355,130 330,140 
             C 310,148 290,145 270,155 
             C 250,165 240,185 225,188 
             C 210,190 195,175 180,170 
             C 160,165 140,160 120,162 
             C 95,165 80,170 68,160 Z"
          fill="url(#mainlandGradient)"
          stroke="#334155"
          strokeWidth="1.5"
          className="transition-all duration-300"
        />

        {/* Islands: Jurong Island, Sentosa, Pulau Ubin, Tekong */}
        {/* Jurong Island */}
        <path
          d="M 85,175 C 95,170 115,172 110,185 C 105,195 85,192 85,175 Z"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1"
        />
        {/* Sentosa */}
        <path
          d="M 195,198 C 210,196 220,202 215,208 C 205,212 192,206 195,198 Z"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1"
        />
        {/* Pulau Ubin & Tekong */}
        <path
          d="M 315,70 C 330,68 340,75 335,82 C 325,85 312,80 315,70 Z"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1"
        />
        <path
          d="M 345,75 C 360,72 368,82 360,92 C 350,95 342,88 345,75 Z"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Connecting Boundaries (Subtle Dotted Lines) */}
        <line x1="200" y1="90" x2="200" y2="160" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
        <line x1="145" y1="130" x2="265" y2="130" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />

        {/* User GPS Location Marker (if detected) */}
        {userSvgPos && (
          <g transform={`translate(${userSvgPos.x}, ${userSvgPos.y})`}>
            <circle r="12" fill="#38bdf8" fillOpacity="0.2" className="animate-ping" />
            <circle r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            <text
              y="-10"
              textAnchor="middle"
              className="fill-sky-300 text-[9px] font-semibold tracking-wide"
            >
              YOU
            </text>
          </g>
        )}

        {/* Region Pins & Interactive Targets */}
        {(Object.keys(REGION_COORDS) as RegionName[]).map((regionKey) => {
          const cfg = REGION_COORDS[regionKey];
          const isSelected = selectedRegion === regionKey;
          const psiVal = psiReadings?.[regionKey] ?? 0;
          const pm25Val = pm25Readings?.[regionKey] ?? 0;
          const band = getPsiBand(psiVal);

          // Marker color mapping
          let pinColor = '#10b981'; // Good - emerald
          if (psiVal > 300) pinColor = '#a855f7'; // Hazardous
          else if (psiVal > 200) pinColor = '#f43f5e'; // Very Unhealthy
          else if (psiVal > 100) pinColor = '#f59e0b'; // Unhealthy
          else if (psiVal > 50) pinColor = '#38bdf8'; // Moderate

          return (
            <g
              key={regionKey}
              className="cursor-pointer transition-transform duration-200"
              onClick={() => onSelectRegion(regionKey)}
            >
              {/* Pulsing ring for selected region */}
              {isSelected && (
                <circle
                  cx={cfg.x}
                  cy={cfg.y}
                  r="24"
                  fill="none"
                  stroke={pinColor}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  className="animate-spin opacity-80 origin-center"
                  style={{ transformOrigin: `${cfg.x}px ${cfg.y}px` }}
                />
              )}

              {/* Pin Bubble */}
              <circle
                cx={cfg.x}
                cy={cfg.y}
                r={isSelected ? 18 : 15}
                fill={isSelected ? pinColor : '#0f172a'}
                stroke={pinColor}
                strokeWidth={isSelected ? 3 : 2}
                className="transition-all duration-200 filter drop-shadow-md"
              />

              {/* PSI Reading Number */}
              <text
                x={cfg.x}
                y={cfg.y + 4}
                textAnchor="middle"
                className={`font-mono text-xs font-bold tabular-nums pointer-events-none ${
                  isSelected ? 'fill-slate-950 font-extrabold' : 'fill-white'
                }`}
              >
                {psiVal > 0 ? psiVal : '—'}
              </text>

              {/* Region Label Pill */}
              <g transform={`translate(${cfg.x}, ${cfg.y + (cfg.offset.y > 0 ? 25 : -24)})`}>
                <rect
                  x="-30"
                  y="-8"
                  width="60"
                  height="16"
                  rx="8"
                  fill={isSelected ? '#0284c7' : '#1e293b'}
                  fillOpacity="0.9"
                  stroke={isSelected ? '#38bdf8' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  className={`text-[9px] font-semibold tracking-wider uppercase ${
                    isSelected ? 'fill-white font-bold' : 'fill-slate-300'
                  }`}
                >
                  {cfg.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Map Legend */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-sky-400" />
          <span>Tap any region to focus</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 0-50
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> 51-100
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 101-200
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> &gt;200
          </span>
        </div>
      </div>
    </div>
  );
};
