import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173, // Vite 的默认端口
    allowedHosts: [
      'debate.austcircle.top',
      'localhost'
    ],
    proxy: {
      '/api': {
        target: 'http://121.37.176.64:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 10000, // Add timeout
        configure: (proxy, _options) => {
          let retryCount = 0;
          const maxRetries = 3;
          
          proxy.on('error', (err, req, res) => {
            console.error('Proxy Error:', err);
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retry attempt ${retryCount}...`);
              setTimeout(() => {
                proxy.web(req, res);
              }, 1000 * retryCount);
            } else {
              console.error('Max retries reached');
              if (!res.headersSent) {
                res.writeHead(502, {
                  'Content-Type': 'application/json',
                })
                res.end(JSON.stringify({ 
                  error: 'Proxy Error',
                  message: 'Service temporarily unavailable',
                  details: err.message
                }))
              }
            }
          });

          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Connection', 'keep-alive');
            console.log('Proxying Request:', {
              method: req.method,
              url: req.url,
              targetUrl: proxyReq.path
            });
          });

          proxy.on('proxyRes', (proxyRes, req, _res) => {
            retryCount = 0; // Reset retry count on successful response
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Add this to ensure proper chunk handling
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus'],
          'vue': ['vue', 'vue-router']
        }
      }
    }
  },
  // 更新生产环境配置
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
})
