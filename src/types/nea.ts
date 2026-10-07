/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RegionName = 'north' | 'south' | 'east' | 'west' | 'central';

export interface LabelLocation {
  latitude: number;
  longitude: number;
}

export interface RegionMetadata {
  name: RegionName;
  labelLocation: LabelLocation;
}

export type RegionalReadingMap = Record<RegionName, number>;

export interface PsiReadings {
  psi_twenty_four_hourly: RegionalReadingMap;
  pm25_twenty_four_hourly: RegionalReadingMap;
  pm25_sub_index: RegionalReadingMap;
  pm10_twenty_four_hourly: RegionalReadingMap;
  pm10_sub_index: RegionalReadingMap;
  so2_twenty_four_hourly: RegionalReadingMap;
  so2_sub_index: RegionalReadingMap;
  co_eight_hour_max: RegionalReadingMap;
  co_sub_index: RegionalReadingMap;
  o3_eight_hour_max: RegionalReadingMap;
  o3_sub_index: RegionalReadingMap;
  no2_one_hour_max: RegionalReadingMap;
}

export type PsiMetricKey = keyof PsiReadings;

export interface PsiItem {
  date: string;
  updatedTimestamp: string;
  timestamp: string;
  readings: PsiReadings;
}

export interface PsiApiResponse {
  code: number;
  data: {
    regionMetadata: RegionMetadata[];
    items: PsiItem[];
    paginationToken?: string;
  };
  errorMsg: string;
}

export interface Pm25Readings {
  pm25_one_hourly: RegionalReadingMap;
}

export type Pm25MetricKey = keyof Pm25Readings;

export interface Pm25Item {
  date: string;
  updatedTimestamp: string;
  timestamp: string;
  readings: Pm25Readings;
}

export interface Pm25ApiResponse {
  code: number;
  data: {
    regionMetadata: RegionMetadata[];
    items: Pm25Item[];
    paginationToken?: string;
  };
  errorMsg: string;
}

export type AirQualityBand = 'Good' | 'Moderate' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';

export interface AirBandInfo {
  band: AirQualityBand;
  rangeLabel: string;
  colorName: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  ringClass: string;
  description: string;
  generalAdvisory: string;
  vulnerableAdvisory: string;
}

export interface ApiHealthServiceResult {
  id: string;
  name: string;
  url: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  httpStatus: number | null;
  latencyMs: number;
  critical: boolean;
  error: string | null;
  metadata?: any;
  lastChecked: string;
}

export interface ApiHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  summary: {
    totalServices: number;
    operational: number;
    degraded: number;
    down: number;
    healthScorePercent: number;
    averageLatencyMs: number;
    message: string;
  };
  services: ApiHealthServiceResult[];
}
