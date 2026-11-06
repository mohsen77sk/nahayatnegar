import { createApiError } from "../utils/api-error.ts";
import type { FundChartResponse, FundTimeframe } from "../utils/fund-chart.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseResponse(value: unknown): FundChartResponse {
  if (!isRecord(value) || !isRecord(value.items) || !isRecord(value.data)) {
    throw new Error("Invalid fund chart response.");
  }

  for (const points of Object.values(value.items)) {
    if (
      !Array.isArray(points) ||
      !points.every(
        (point: unknown) =>
          isRecord(point) &&
          typeof point.event_date === "number" &&
          Number.isFinite(point.event_date) &&
          !Number.isNaN(new Date(point.event_date * 1000).getTime()) &&
          (point.turnover === null || (typeof point.turnover === "number" && Number.isFinite(point.turnover))),
      )
    ) {
      throw new Error("Invalid fund chart points.");
    }
  }

  if (!Object.values(value.data).every((label) => typeof label === "string")) {
    throw new Error("Invalid fund chart labels.");
  }

  return value as unknown as FundChartResponse;
}

export async function fetchFundChart(
  fund: string,
  timeframe: FundTimeframe,
  signal?: AbortSignal,
): Promise<FundChartResponse> {
  const baseUrl = (import.meta.env?.PUBLIC_API_URL || "https://landing-api.nahayatnegar.com").replace(/\/+$/, "");
  if (!baseUrl || !fund.trim()) throw new Error("Fund chart API URL and fund are required.");

  const controller = new AbortController();
  const requestSignal = AbortSignal.any(
    [controller.signal, AbortSignal.timeout(20_000), signal].filter((value): value is AbortSignal => !!value),
  );

  const fetchSeries = async (symbol: string) => {
    const query = new URLSearchParams({ timeFrame: timeframe, fund: symbol });
    const response = await fetch(`${baseUrl}/assetDailyInfo?${query}`, { signal: requestSignal });
    if (!response.ok) throw await createApiError(response);
    return parseResponse(await response.json());
  };

  try {
    const responses = await Promise.all([...new Set([fund, "index"])].map(fetchSeries));
    return {
      items: Object.assign({}, ...responses.map((response) => response.items)),
      data: Object.assign({}, ...responses.map((response) => response.data)),
    };
  } catch (error) {
    controller.abort();
    throw error;
  }
}
