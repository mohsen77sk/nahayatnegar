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
