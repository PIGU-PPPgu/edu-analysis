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
        // 🚀 Master-Frontend: 改进的代码分割策略
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React核心库
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // 图表库
            if (id.includes('recharts') || id.includes('@nivo') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // UI组件库
            if (id.includes('radix') || id.includes('headless') || id.includes('lucide')) {
              return 'vendor-ui';
            }
            // 工具库
            if (id.includes('lodash') || id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority')) {
              return 'vendor-utils';
            }
            // 路由和状态管理
            if (id.includes('router') || id.includes('query') || id.includes('zustand')) {
              return 'vendor-state';
            }
            // 数据库和API
            if (id.includes('supabase') || id.includes('postgrest')) {
              return 'vendor-db';
            }
            // 其他第三方库
            return 'vendor-misc';
          }
          
          // 应用代码分割
          if (id.includes('/pages/')) {
            return 'pages';
          }
          if (id.includes('/components/analysis/') || id.includes('/components/charts/')) {
            return 'analysis';
          }
          if (id.includes('/components/ai/') || id.includes('/services/ai/')) {
            return 'ai-features';
          }
          if (id.includes('/components/warning/') || id.includes('/services/warning/')) {
            return 'warning-system';
          }
          if (id.includes('/services/')) {
            return 'services';
          }
        },
        // 控制文件名
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop() 
            : 'chunk';
          return `js/${chunkInfo.name}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // 🚀 Master-Frontend: 优化构建性能
    target: 'es2020', // 提升到es2020以支持更多现代特性
    minify: 'esbuild', // 使用 esbuild 而不是 terser
    sourcemap: mode === 'development', // 仅开发环境生成sourcemap
    chunkSizeWarningLimit: 1000,
    // 预加载优化
    modulePreload: {
      polyfill: false, // 禁用polyfill减少bundle大小
    },
    // CSS代码分割
    cssCodeSplit: true,
    // 压缩CSS
    cssMinify: true,
  }
}));
