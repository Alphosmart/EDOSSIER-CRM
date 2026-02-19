/**
 * geoService.js
 * Wraps the free CountriesNow API (https://countriesnow.space)
 * to provide states/regions and cities by country.
 * All results are cached in memory for the session lifetime.
 */

const BASE = 'https://countriesnow.space/api/v0.1';

// ── In-memory caches ─────────────────────────────────────────────────────────
const _stateCache = {};  // { 'Ghana': ['Greater Accra Region', ...] }
const _cityCache  = {};  // { 'Ghana::Greater Accra Region': ['Accra', 'Tema', ...] }

/**
 * Fetch the list of states / regions / provinces for a given country.
 * Returns an array of state name strings, sorted alphabetically.
 * Returns [] on error so callers can gracefully fall back to free-text.
 */
export async function getStatesByCountry(country) {
  if (!country) return [];
  if (_stateCache[country]) return _stateCache[country];

  try {
    const res = await fetch(`${BASE}/countries/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    });
    const json = await res.json();
    if (json.error || !json.data?.states?.length) {
      _stateCache[country] = [];
      return [];
    }
    const names = json.data.states
      .map(s => s.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    _stateCache[country] = names;
    return names;
  } catch {
    _stateCache[country] = [];
    return [];
  }
}

/**
 * Fetch the list of cities for a given country + state.
 * Returns an array of city name strings, sorted alphabetically.
 * Returns [] on error.
 */
export async function getCitiesByState(country, state) {
  if (!country || !state) return [];
  const key = `${country}::${state}`;
  if (_cityCache[key]) return _cityCache[key];

  try {
    const res = await fetch(`${BASE}/countries/state/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, state })
    });
    const json = await res.json();
    if (json.error || !json.data?.length) {
      _cityCache[key] = [];
      return [];
    }
    const cities = [...new Set(json.data)].sort((a, b) => a.localeCompare(b));
    _cityCache[key] = cities;
    return cities;
  } catch {
    _cityCache[key] = [];
    return [];
  }
}

/** Pre-warm the state list for a country (fire-and-forget). */
export function prewarmStates(country) {
  if (country && !_stateCache[country]) getStatesByCountry(country);
}
