import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchFundChart } from "../src/services/fund-chart.service.ts";
import { getApiErrorMessage } from "../src/utils/api-error.ts";
import { prepareFundChartData } from "../src/utils/fund-chart.ts";

const apiBase = "https://api.example.com";
const first = 1735689600;
const second = first + 86400;
const third = second + 86400;
const point = (event_date, turnover) => ({ event_date, turnover });

test("aligns unsorted series on a shared timeline while preserving zero, negative, and missing values", () => {
  const input = {
    items: {
      naab: [point(third, 12), point(first, 0)],
      index: [point(second, -2), point(third, null)],
    },
    data: { naab: "ناب", index: "شاخص" },
  };
  const original = structuredClone(input);
  const result = prepareFundChartData(input);
  assert.deepEqual(
    result.series.map((series) => series.values),
    [
      [0, null, 12],
      [null, -2, null],
    ],
  );
  assert.deepEqual(
    result.series.map((series) => series.label),
    ["ناب", "شاخص"],
  );
  const formatter = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" });
  assert.deepEqual(
    result.labels,
    [first, second, third].map((timestamp) => formatter.format(timestamp * 1000)),
  );
  assert.equal(result.axisLabels.length, 3);
  assert.deepEqual(input, original);
});

test("deduplicates timestamps, uses the last point, and supports unknown symbols", () => {
  const result = prepareFundChartData({ items: { unknown: [point(first, 1), point(first, 2)] }, data: {} });
  assert.equal(result.labels.length, 1);
  assert.deepEqual(result.series[0].values, [2]);
  assert.equal(result.series[0].label, "unknown");
  assert.equal(result.series[0].color, "#9ca3af");
  assert.deepEqual(prepareFundChartData({ items: {}, data: {} }), { labels: [], axisLabels: [], series: [] });
});

test("fetches fund and index in parallel and encodes query parameters", async (t) => {
  const calls = [];
  const releases = [];
  const request = t.mock.method(globalThis, "fetch", (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/assetDailyInfo");
    assert.equal(parsed.searchParams.get("timeFrame"), "MONTHLY6");
    assert.ok(options.signal instanceof AbortSignal);
    const symbol = parsed.searchParams.get("fund");
    calls.push(symbol);
    return new Promise((resolve) =>
      releases.push(() =>
        resolve(
          Response.json({
            items: { [symbol]: [point(first, 2)] },
            data: { [symbol]: symbol },
          }),
        ),
      ),
    );
  });
  t.after(() => request.mock.restore());
  const pending = fetchFundChart("fund & name", "MONTHLY6", undefined, `${apiBase}///`);
  assert.deepEqual(calls, ["fund & name", "index"]);
  releases.forEach((release) => release());
  const result = await pending;
  assert.deepEqual(Object.keys(result.items), ["fund & name", "index"]);
});

test("does not fetch the index twice when it is the requested symbol", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => Response.json({ items: {}, data: {} }));
  t.after(() => request.mock.restore());
  await fetchFundChart("index", "YEARLY", undefined, apiBase);
  assert.equal(request.mock.callCount(), 1);
});

test("does not issue requests without the API base URL or fund", async (t) => {
  const request = t.mock.method(globalThis, "fetch", () => assert.fail("Unexpected request"));
  t.after(() => request.mock.restore());
  await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, ""), /required/);
  await assert.rejects(fetchFundChart(" ", "YEARLY", undefined, apiBase), /required/);
});

test("preserves API problem details and aborts the companion request on failure", async (t) => {
  let siblingSignal;
  const request = t.mock.method(globalThis, "fetch", async (url, { signal }) => {
    if (new URL(url).searchParams.get("fund") === "naab") {
      return Response.json({ detail: "اطلاعات صندوق یافت نشد." }, { status: 400 });
    }
    siblingSignal = signal;
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
    );
  });
  t.after(() => request.mock.restore());
  await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, apiBase), (error) => {
    assert.equal(getApiErrorMessage(error, "fallback"), "اطلاعات صندوق یافت نشد.");
    return true;
  });
  assert.equal(siblingSignal.aborted, true);
});

test("cancels both requests when the component cancels its signal", async (t) => {
  const signals = [];
  const request = t.mock.method(globalThis, "fetch", (_url, { signal }) => {
    signals.push(signal);
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
    );
  });
  t.after(() => request.mock.restore());
  const controller = new AbortController();
  const pending = fetchFundChart("naab", "YEARLY", controller.signal, apiBase);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(signals.length, 2);
  assert.ok(signals.every((signal) => signal.aborted));
});

test("rejects malformed points and responses before rendering", async (t) => {
  let payload;
  const request = t.mock.method(globalThis, "fetch", async () => Response.json(payload));
  t.after(() => request.mock.restore());
  for (const invalid of [
    null,
    { items: [], data: {} },
    { items: { naab: {} }, data: {} },
    { items: { naab: [{ turnover: 1 }] }, data: {} },
    { items: { naab: [point(first, "invalid")] }, data: {} },
    { items: { naab: [point(1e20, 1)] }, data: {} },
    { items: {}, data: { naab: {} } },
  ]) {
    payload = invalid;
    await assert.rejects(fetchFundChart("naab", "YEARLY", undefined, apiBase), /Invalid fund chart/);
  }
});
