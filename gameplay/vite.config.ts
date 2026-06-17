import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname),
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
