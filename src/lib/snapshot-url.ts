export function buildSnapshotHref(
  path: string,
  params: { marketDate?: string; ts?: string },
): string {
  const search = new URLSearchParams();
  if (params.marketDate) search.set("market_date", params.marketDate);
  if (params.ts) search.set("ts", params.ts);
  const q = search.toString();
  return q ? `${path}?${q}` : path;
}

export function readSnapshotParams(searchParams: URLSearchParams) {
  return {
    marketDate: searchParams.get("market_date") ?? "",
    ts: searchParams.get("ts") ?? "",
  };
}
