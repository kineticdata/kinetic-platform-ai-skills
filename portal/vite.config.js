import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const removeSecure = str => str.replace(/;\s*Secure/gi, '');
const removeSameSiteNone = str => str.replace(/;\s*SameSite=None/gi, '');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env': env,
    },
    server: {
      port: 3000,
      proxy: {
        '/app': {
          target: env.REACT_APP_PROXY_HOST,
          changeOrigin: true,
          secure: false,
          configure: proxy => {
            proxy.on('error', err => console.log('proxy error', err));
            proxy.on('proxyReq', proxyReq => {
              if (proxyReq.getHeader('origin')) {
                proxyReq.setHeader('origin', env.REACT_APP_PROXY_HOST);
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              const setCookie = proxyRes.headers['set-cookie'];
              if (setCookie && req.protocol === 'http') {
                proxyRes.headers['set-cookie'] = Array.isArray(setCookie)
                  ? setCookie.map(removeSecure).map(removeSameSiteNone)
                  : removeSameSiteNone(removeSecure(setCookie));
              }
            });
          },
        },
      },
    },
  };
});
