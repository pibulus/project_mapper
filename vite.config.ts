import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 8010,
    host: true,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["@google/generative-ai"], // Never bundle AI package client-side
  },
  ssr: {
    noExternal:
      process.env.NODE_ENV === "production" ? ["@google/generative-ai"] : [],
  },
});
