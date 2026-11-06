import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPageHeader } from "../src/services/page-header.service.ts";

const fixture = () => ({
  id: "header-home",
  page: "home",
  layout: 1,
  theme: "dark",
  text: "Homepage title",
  description: "Homepage description",
  ctas: [{ label: "Courses", link: "/courses", variant: "primary" }],
  slides: [
    { mediaType: "image", desktop: { url: "/uploads/desktop.webp" }, mobile: { url: "/uploads/mobile.webp" } },
    { mediaType: "video", desktop: { url: "https://cdn.example.com/hero.mp4", mimetype: "video/mp4" } },
  ],
  isActive: true,
});

test("without an API URL, uses the local fallback without requesting the API", async (t) => {
  const request = t.mock.method(globalThis, "fetch", () => assert.fail("Unexpected API request"));
  assert.equal(await fetchPageHeader("home", ""), null);
  assert.equal(request.mock.callCount(), 0);
  t.after(() => request.mock.restore());
});

for (const wrapped of [false, true]) {
  test(`loads ${wrapped ? "wrapped" : "direct"} image and video data and resolves upload URLs`, async (t) => {
    const request = t.mock.method(globalThis, "fetch", async (url) => {
      assert.equal(url, "https://api.example.com/v1/page-headers/home");
      const header = fixture();
      return Response.json(wrapped ? { data: header } : header);
    });
    t.after(() => request.mock.restore());
    const header = await fetchPageHeader("home", "https://api.example.com/v1///");
    assert.equal(header.slides[0].desktop.url, "https://api.example.com/uploads/desktop.webp");
    assert.equal(header.slides[0].mobile.url, "https://api.example.com/uploads/mobile.webp");
    assert.equal(header.slides[1].desktop.url, "https://cdn.example.com/hero.mp4");
    assert.equal(header.ctas[0].link, "/courses");
  });
}

test("preserves an inactive header instead of substituting fallback content", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => Response.json({ isActive: false }));
  t.after(() => request.mock.restore());
  assert.equal((await fetchPageHeader("home", "https://api.example.com")).isActive, false);
});

test("rejects HTTP errors instead of silently publishing fallback content", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  t.after(() => request.mock.restore());
  await assert.rejects(fetchPageHeader("home", "https://api.example.com"), /HTTP 503/);
});

test("rejects malformed data, mismatched pages, and missing media", async (t) => {
  let response;
  const request = t.mock.method(globalThis, "fetch", async () => Response.json(response));
  t.after(() => request.mock.restore());
  for (const invalid of [
    null,
    {},
    { ...fixture(), page: "about" },
    { ...fixture(), slides: [{ mediaType: "video" }] },
  ]) {
    response = invalid;
    await assert.rejects(fetchPageHeader("home", "https://api.example.com"), /Invalid/);
  }
});

test("accepts a mobile-only slide and a light theme", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      ...fixture(),
      theme: "light",
      slides: [{ mediaType: "image", mobile: { url: "/mobile.webp" } }],
    }),
  );
  t.after(() => request.mock.restore());
  const header = await fetchPageHeader("home", "https://api.example.com");
  assert.equal(header.theme, "light");
  assert.equal(header.slides[0].mobile.url, "https://api.example.com/mobile.webp");
});
