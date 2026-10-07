/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Singapore Air Quality & Geocoding API Health Monitor
 * File: /api/health.js
 * 
 * Verifies real-time connectivity, latency, and response validity for:
 * 1. NEA PSI Real-Time API (v2) - https://api-open.data.gov.sg/v2/real-time/api/psi
 * 2. NEA PM2.5 Real-Time API (v2) - https://api-open.data.gov.sg/v2/real-time/api/pm25
 * 3. Data.gov.sg PSI API (v1 Fallback) - https://api.data.gov.sg/v1/environment/psi
 * 4. Singapore OneMap Postal Geocoding API - https://www.onemap.gov.sg/api/common/elastic/search
 */

const ENDPOINTS = [
  {
    id: 'psi_v2',
    name: 'NEA PSI v2 API',
    url: 'https://api-open.data.gov.sg/v2/real-time/api/psi',
    description: 'National Environment Agency 24-hr PSI & sub-indices',
    critical: true,
    validator: (data) => data && data.code === 0 && Array.isArray(data.data?.items) && data.data.items.length > 0,
  },
  {
    id: 'pm25_v2',
    name: 'NEA PM2.5 v2 API',
    url: 'https://api-open.data.gov.sg/v2/real-time/api/pm25',
    description: 'National Environment Agency 1-hr PM2.5 concentrations',
    critical: true,
    validator: (data) => data && data.code === 0 && Array.isArray(data.data?.items) && data.data.items.length > 0,
  },
  {
    id: 'psi_v1',
    name: 'Data.gov.sg PSI v1 (Fallback)',
    url: 'https://api.data.gov.sg/v1/environment/psi',
    description: 'Legacy Singapore Open Data PSI endpoint with 5-region metadata',
    critical: false,
    validator: (data) => data && Array.isArray(data.region_metadata) && Array.isArray(data.items),
  },
  {
    id: 'onemap_geo',
    name: 'Singapore OneMap API',
    url: 'https://www.onemap.gov.sg/api/common/elastic/search?searchVal=178902&returnGeom=Y&getAddrDetails=Y&pageNum=1',
    description: 'Singapore Land Authority OneMap 6-digit postal code resolver',
    critical: false,
    validator: (data) => data && Array.isArray(data.results) && data.results.length > 0,
  },
];

const startTime = Date.now();

/**
 * Checks the status of a single API endpoint with a timeout
 */
async function checkEndpoint(endpoint, timeoutMs = 8000) {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint.url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SGAirQualityMonitor/1.0 (+https://data.gov.sg)',
      },
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        status: 'DOWN',
        httpStatus: res.status,
        latencyMs,
        critical: endpoint.critical,
        error: `HTTP ${res.status} ${res.statusText}`,
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await res.json();
    const isValid = endpoint.validator(data);

    let sampleMetadata = null;
    if (endpoint.id === 'psi_v2' && data.data?.items?.[0]) {
      const item = data.data.items[0];
      sampleMetadata = {
        readingTimestamp: item.timestamp,
        updatedTimestamp: item.updatedTimestamp,
        regionsAvailable: data.data.regionMetadata?.map(r => r.name) || [],
        psiNationalSample: item.readings?.psi_twenty_four_hourly?.central ?? null,
      };
    } else if (endpoint.id === 'pm25_v2' && data.data?.items?.[0]) {
      const item = data.data.items[0];
      sampleMetadata = {
        readingTimestamp: item.timestamp,
        pm25CentralSample: item.readings?.pm25_one_hourly?.central ?? null,
      };
    } else if (endpoint.id === 'onemap_geo' && data.results?.[0]) {
      sampleMetadata = {
        testPostal: '178902',
        resolvedAddress: data.results[0].ADDRESS || data.results[0].ROAD_NAME,
      };
    }

    return {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      status: isValid ? 'UP' : 'DEGRADED',
      httpStatus: res.status,
      latencyMs,
      critical: endpoint.critical,
      error: isValid ? null : 'Schema validation failed (unexpected structure)',
      metadata: sampleMetadata,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    return {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      status: 'DOWN',
      httpStatus: null,
      latencyMs,
      critical: endpoint.critical,
      error: err.name === 'AbortError' ? `Request timed out after ${timeoutMs}ms` : (err.message || 'Network connection failed'),
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Executes health checks on all registered Singapore government air quality & geocoding APIs.
 */
export async function getHealthStatus() {
  const results = await Promise.all(ENDPOINTS.map(ep => checkEndpoint(ep)));

  const total = results.length;
  const upCount = results.filter(r => r.status === 'UP').length;
  const degradedCount = results.filter(r => r.status === 'DEGRADED').length;
  const downCount = results.filter(r => r.status === 'DOWN').length;

  const criticalDown = results.some(r => r.critical && r.status === 'DOWN');
  const criticalDegraded = results.some(r => r.critical && r.status === 'DEGRADED');

  let overallStatus = 'healthy';
  let message = 'All Singapore air quality APIs are operating normally.';

  if (criticalDown) {
    overallStatus = 'unhealthy';
    message = 'Critical Singapore PSI/PM2.5 API is unreachable or returned an error.';
  } else if (criticalDegraded || downCount > 0) {
    overallStatus = 'degraded';
    message = 'One or more non-critical API services or validation checks reported issues.';
  }

  const averageLatency = Math.round(
    results.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / (total || 1)
  );

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    summary: {
      totalServices: total,
      operational: upCount,
      degraded: degradedCount,
      down: downCount,
      healthScorePercent: Math.round(((upCount + degradedCount * 0.5) / total) * 100),
      averageLatencyMs: averageLatency,
      message,
    },
    services: results,
  };
}

/**
 * Standard HTTP handler for Connect / Express / Vite dev middleware
 */
export default async function healthHandler(req, res) {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'unhealthy' ? 503 : (health.status === 'degraded' ? 200 : 200);

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.statusCode = statusCode;
      res.end(JSON.stringify(health, null, 2));
    }
    return health;
  } catch (err) {
    const errorPayload = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message || 'Internal health check failure',
    };
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify(errorPayload, null, 2));
    }
    return errorPayload;
  }
}

// CLI direct run support: `node /api/health.js`
if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && process.argv[1].endsWith('health.js'))) {
  console.log('[Health Monitor] Running Singapore Air Quality API checks...');
  getHealthStatus().then(report => {
    console.log(JSON.stringify(report, null, 2));
  }).catch(err => {
    console.error('[Health Monitor Error]', err);
    process.exit(1);
  });
}
