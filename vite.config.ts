import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Commented out

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
    hmr: {
      clientPort: undefined,
      path: "/hmr/",
      host: "localhost",
      protocol: "ws",
      timeout: 60000,
      overlay: false,
    },
    watch: {
      usePolling: true,
    },
  },
  define: {
    // 注释掉 __WS_TOKEN__ 定义，看看能否解决问题
    // __WS_TOKEN__: JSON.stringify("ws-hmr-token"),
  },
  plugins: [
    react(),
    // mode === 'development' && // Commented out
    // componentTagger(), // Commented out
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
