// @ts-check
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  base: process.env.PUBLIC_BASE_URL || "/",
  build: {
    assetsPrefix: process.env.PUBLIC_BASE_ASSETS_URL || process.env.PUBLIC_BASE_URL || "/",
  },
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
