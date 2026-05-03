import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import { assetpackPlugin } from "./scripts/assetpack-vite-plugin";

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [wasm(), assetpackPlugin(), cloudflare()],
  server: {
    port: 8080,
    open: true,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
});
