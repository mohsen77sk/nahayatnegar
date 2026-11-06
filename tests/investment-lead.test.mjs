import assert from "node:assert/strict";
import { test } from "node:test";
import { sendInvestmentLead } from "../src/services/investment-lead.service.ts";

const lead = { phoneNumber: "09123456789", name: "کاربر آزمایشی", subject: "درخواست مشاوره" };

for (const status of [200, 201, 204]) {
  test(`posts investment lead fields as JSON and accepts HTTP ${status} with an empty body`, async (t) => {
    const request = t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, "https://landing-api.nahayatnegar.com/investmentLead");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), lead);
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(null, { status });
    });
    t.after(() => request.mock.restore());
    await sendInvestmentLead(lead);
    assert.equal(request.mock.callCount(), 1);
  });
}

test("sends an empty optional subject", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(JSON.parse(options.body).subject, "");
    return new Response(null, { status: 204 });
  });
  t.after(() => request.mock.restore());
  await sendInvestmentLead({ ...lead, subject: "" });
});

for (const status of [400, 422, 429, 500]) {
  test(`rejects HTTP ${status} for the error toast`, async (t) => {
    const request = t.mock.method(globalThis, "fetch", async () => new Response(null, { status }));
    t.after(() => request.mock.restore());
    await assert.rejects(sendInvestmentLead(lead), new RegExp(`HTTP ${status}`));
  });
}

for (const error of [new TypeError("Failed to fetch"), new DOMException("Timed out", "TimeoutError")]) {
  test(`propagates ${error.name} for recovery and an error toast`, async (t) => {
    const request = t.mock.method(globalThis, "fetch", async () => {
      throw error;
    });
    t.after(() => request.mock.restore());
    await assert.rejects(sendInvestmentLead(lead), (caught) => caught === error);
  });
}
