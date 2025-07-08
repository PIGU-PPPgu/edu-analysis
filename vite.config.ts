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
  build: {
    rollupOptions: {
      output: {
        // 处理动态导入
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('recharts') || id.includes('@nivo')) {
              return 'charts';
            }
            if (id.includes('lodash') || id.includes('date-fns')) {
              return 'utils-lib';
            }
            return 'vendor';
          }
        }
      }
    },
    // 优化构建
    target: 'es2015',
    minify: 'esbuild', // 使用 esbuild 而不是 terser
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  }
}));
