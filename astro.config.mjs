// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  base: process.env.PUBLIC_BASE_URL || "/",
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
