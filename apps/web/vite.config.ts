import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

import { pwaManifestPlugin } from "./vite-plugin-pwa-manifest";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    pwaManifestPlugin(),
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "manifest.webmanifest"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    host: true,
  },
  resolve: {
    conditions: ["development", "import", "module", "browser", "default"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
