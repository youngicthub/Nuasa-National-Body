import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const rawPort = process.env.PORT;
const port = rawPort && !Number.isNaN(Number(rawPort)) ? Number(rawPort) : 5173;

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,

  plugins: [
    react(),
    runtimeErrorOverlay(),

    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            })
          ),

          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner()
          ),
        ]
      : []),
  ],

  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets"
      ),
    },

    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },

  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,

    fs: {
      strict: true,
    },

    proxy: {
      "/api": {
        // Use API_PORT / API_URL env-var when running locally so you can
        // match whatever port your local API server listens on.
        target: process.env.API_URL || `http://127.0.0.1:${process.env.API_PORT || 8080}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.API_URL || `http://127.0.0.1:${process.env.API_PORT || 8080}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
