import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      //
      // `.filetopo-sandbox` is application state, never frontend source. The
      // watcher held Windows directory handles on it, which both reloaded the
      // page whenever a proof wrote an index and made a proof's own fixture
      // directory impossible to rename — `TASK-0031` needs to take a synthetic
      // source away to show that opening a brain never reads one.
      ignored: ["**/src-tauri/**", "**/.filetopo-sandbox/**"],
    },
  },
}));
