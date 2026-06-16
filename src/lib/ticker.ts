/** Default ticker when GEX_TICKER is unset. */
export const DEFAULT_TICKER = "SPX";

let cachedTicker: string | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

export function configuredTicker(): string {
  return process.env.GEX_TICKER?.trim() || DEFAULT_TICKER;
}

export function setResolvedTicker(ticker: string) {
  cachedTicker = ticker;
  cachedAt = Date.now();
}

export function getResolvedTicker(): string {
  if (cachedTicker && Date.now() - cachedAt < CACHE_MS) {
    return cachedTicker;
  }
  return configuredTicker();
}
