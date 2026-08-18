import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") }
  },
  server: {
    // 5174 para não brigar com o 5173 de outro projeto, nem com o 8088 do app antigo
    port: 5174,
    strictPort: true
  }
});
