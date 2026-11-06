# Nahayatnegar Financial Group Website

The Persian-language website for Nahayatnegar Financial Group is built with Astro and Tailwind CSS and published as a static site.

## Requirements

- Node.js `22.12.0` or later
- npm

## Getting Started

```sh
npm ci
npm run dev
```

The Astro development server runs at `http://localhost:4321` by default.

## Commands

| Command                | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Start the development server                                  |
| `npm run build`        | Build the static site into `dist/`                            |
| `npm run preview`      | Preview the built site locally                                |
| `npm run format`       | Format Astro, CSS, JavaScript, and TypeScript files in `src/` |
| `npm run format:check` | Check formatting of source files                              |

## Project Structure

- `src/pages/` — Site pages and routes
- `src/components/` — Reusable components
- `src/layouts/` — Page layouts
- `src/assets/` — Images and other assets processed at build time
- `public/` — Files copied to the output without processing

## Deployment

The GitHub Actions workflow in `.github/workflows/astro.yml` runs on pushes to the `master` branch. It installs dependencies with `npm ci`, builds the site, and publishes the contents of `dist/` to the `production` branch.

To build the site under a different base path, set `PUBLIC_BASE_URL`. The default value is `/`.

Set `PUBLIC_SITE_URL` to the deployed site's canonical HTTPS origin (without a path) during production builds. It is used to emit absolute canonical and social URLs.

## Homepage header

Set `PUBLIC_API_URL` to the API base URL in your build environment (for example, `https://api.example.com`). The homepage requests `GET {PUBLIC_API_URL}/page-headers/home` during the static build; visitors do not request this endpoint. Rebuild and redeploy after changing the header in the API.

The response can be the header object directly or wrapped in `{ "data": ... }`. It supports `theme: "dark" | "light"`, plain-text `text` and `description`, CTA links with `primary` or `secondary` variants, and multiple image/video slides. Slides use `desktop` at widths of 1200px and above, and `mobile` below that; either media entry can be omitted to reuse the other. Upload URLs are resolved against the API URL. Supply the correct `mimetype` for video files (for example, `video/mp4`).

`layout: 1` uses the existing centered homepage composition. Other layout numbers currently use the same composition until their designs are defined. An inactive header (`isActive: false`) is omitted. Without `PUBLIC_API_URL`, the existing local video and homepage copy are used. With an API configured, failed requests or invalid responses stop the build to avoid publishing stale fallback content.

Run header service tests with `node --experimental-strip-types --test tests/page-header.test.mjs`.
