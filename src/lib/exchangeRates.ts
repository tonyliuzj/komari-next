export type RateMap = Record<string, number>;

export type CachedRates = {
  fetchedAt: string;
  base: string;
  rates: RateMap;
  provider: "frankfurter";
};

export type LoadedRates = {
  rates: RateMap;
  fetchedAt: string;
  source: "network" | "cache" | "stale-cache";
  isStale: boolean;
};

type LoadRatesOptions = {
  displayCurrency: string;
  sourceCurrencies: string[];
  now?: Date;
  forceRefresh?: boolean;
};

type FrankfurterRateRow = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

const CACHE_KEY = "remainingValueRatesCacheV1";
const CACHE_TTL_MS = 60 * 60 * 1000;
const API_BASE = "https://api.frankfurter.dev/v2/rates";
const PROVIDER = "frankfurter" as const;
const BASE_CURRENCY = "EUR";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getCachedRates(now: Date = new Date()): (CachedRates & { isFresh: boolean }) | null {
  if (!hasLocalStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedRates;
    const fetchedAtMs = new Date(parsed.fetchedAt).getTime();

    if (parsed.base !== BASE_CURRENCY || !Number.isFinite(fetchedAtMs)) {
      return null;
    }

    const ageMs = now.getTime() - fetchedAtMs;

    return {
      ...parsed,
      isFresh: ageMs >= 0 && ageMs < CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

export function writeRatesCache(cache: CachedRates) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function buildRequestedCurrencies(displayCurrency: string, sourceCurrencies: string[]) {
  return Array.from(new Set([BASE_CURRENCY, displayCurrency, ...sourceCurrencies])).sort();
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: RateMap,
): number | null {
  if (from === to) {
    return amount;
  }

  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    return null;
  }

  return (amount / fromRate) * toRate;
}

async function fetchRates(quotes: string[]): Promise<CachedRates> {
  const url = new URL(API_BASE);
  url.searchParams.set("base", BASE_CURRENCY);
  url.searchParams.set("quotes", quotes.join(","));

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`exchange rates ${response.status}`);
  }

  const rows = (await response.json()) as FrankfurterRateRow[];
  const rates: RateMap = {
    [BASE_CURRENCY]: 1,
  };

  for (const row of rows) {
    if (row.base === BASE_CURRENCY && typeof row.quote === "string" && Number.isFinite(row.rate)) {
      rates[row.quote] = row.rate;
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    base: BASE_CURRENCY,
    rates,
    provider: PROVIDER,
  };
}

export async function loadRates({
  displayCurrency,
  sourceCurrencies,
  now = new Date(),
  forceRefresh = false,
}: LoadRatesOptions): Promise<LoadedRates> {
  const requestedCurrencies = buildRequestedCurrencies(displayCurrency, sourceCurrencies);
  const cached = getCachedRates(now);

  if (
    !forceRefresh &&
    cached?.isFresh &&
    requestedCurrencies.every((currency) => typeof cached.rates[currency] === "number")
  ) {
    return {
      rates: cached.rates,
      fetchedAt: cached.fetchedAt,
      source: "cache",
      isStale: false,
    };
  }

  try {
    const fresh = await fetchRates(requestedCurrencies);
    writeRatesCache(fresh);

    return {
      rates: fresh.rates,
      fetchedAt: fresh.fetchedAt,
      source: "network",
      isStale: false,
    };
  } catch (error) {
    if (cached?.rates) {
      return {
        rates: cached.rates,
        fetchedAt: cached.fetchedAt,
        source: "stale-cache",
        isStale: true,
      };
    }

    throw error;
  }
}
