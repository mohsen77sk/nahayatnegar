import assert from "node:assert/strict";
import { test } from "node:test";
import { sendContactMessage } from "../src/services/contact.service.ts";

const message = { name: "کاربر آزمایشی", email: "test@example.com", message: "پیام آزمایشی" };

for (const status of [200, 201, 204]) {
  test(`sends the contact fields as JSON and accepts HTTP ${status} without requiring a response body`, async (t) => {
    const request = t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, "https://landing-api.nahayatnegar.com/contact-us");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), message);
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(null, { status });
    });
    t.after(() => request.mock.restore());
    await sendContactMessage(message);
    assert.equal(request.mock.callCount(), 1);
  });
}

for (const status of [400, 422, 429, 500]) {
  test(`rejects HTTP ${status} so the form can display an error toast`, async (t) => {
    const request = t.mock.method(globalThis, "fetch", async () => new Response(null, { status }));
    t.after(() => request.mock.restore());
    await assert.rejects(sendContactMessage(message), new RegExp(`HTTP ${status}`));
  });
}

for (const error of [new TypeError("Failed to fetch"), new DOMException("Timed out", "TimeoutError")]) {
  test(`propagates ${error.name} so the form can recover from network failures`, async (t) => {
    const request = t.mock.method(globalThis, "fetch", async () => {
      throw error;
    });
    t.after(() => request.mock.restore());
    await assert.rejects(sendContactMessage(message), (caught) => caught === error);
  });
}
