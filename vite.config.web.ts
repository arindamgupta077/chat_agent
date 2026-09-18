/**
 * Standalone Vite config for web-only development.
 *
 * Usage:
 *   npx vite --config vite.config.web.ts
 *
 * This starts the renderer dev server on http://localhost:1212 and LAN IPs without
 * launching Electron, which is useful for:
 *   - Headless / CI environments where Electron cannot run
 *   - Faster iteration on renderer-only changes
 *   - Web platform testing
 *
 * It reuses the same plugins and settings as the renderer section in
 * electron.vite.config.ts to keep behavior consistent.
 */

import path from 'node:path'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function injectBaseTag(): Plugin {
  return {
    name: 'inject-base-tag',
    transformIndexHtml() {
      return [
        {
          tag: 'base',
          attrs: { href: '/' },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

function injectViewportContent(isDesktop: boolean): Plugin {
  const content = isDesktop
    ? 'width=device-width, initial-scale=1, user-scalable=no'
    : 'height=device-height, width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover'
  return {
    name: 'inject-viewport-content',
    transformIndexHtml(html) {
      return html.replace('%VIEWPORT_CONTENT%', content)
    },
  }
}

function dvhToVh(): Plugin {
  return {
    name: 'dvh-to-vh',
    transform(code, id) {
      if (id.endsWith('.css') || id.endsWith('.scss') || id.endsWith('.sass')) {
        return {
          code: code.replace(/(\d+)dvh/g, '$1vh'),
          map: null,
        }
      }
      return null
    },
  }
}

export default defineConfig({
  root: 'src/renderer',
  plugins: [
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/renderer/routes',
      generatedRouteTree: './src/renderer/routeTree.gen.ts',
    }),
    react({}),
    dvhToVh(),
    injectViewportContent(false),
    injectBaseTag(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    host: process.env.DEV_HOST || '0.0.0.0',
    port: Number(process.env.DEV_PORT) || 1212,
    proxy: {
      '/n8n-mcp': {
        target: process.env.N8N_URL || 'http://localhost:5678',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/n8n-mcp/, ''),
      },
    },
  },
  define: {
    'process.type': '"renderer"',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.CHATBOX_BUILD_TARGET': JSON.stringify(process.env.CHATBOX_BUILD_TARGET || 'unknown'),
    'process.env.CHATBOX_BUILD_PLATFORM': JSON.stringify('web'),
    'process.env.USE_LOCAL_API': JSON.stringify(process.env.USE_LOCAL_API || ''),
    'process.env.USE_BETA_API': JSON.stringify(process.env.USE_BETA_API || ''),
    'process.env.USE_NEWDB_API': JSON.stringify(process.env.USE_NEWDB_API || ''),
    'process.env.USE_LOCAL_CHATBOX': JSON.stringify(process.env.USE_LOCAL_CHATBOX || ''),
    'process.env.USE_BETA_CHATBOX': JSON.stringify(process.env.USE_BETA_CHATBOX || ''),
  },
  css: {
    modules: {
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    postcss: './postcss.config.cjs',
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles/[name].[hash][extname]'
          }
          if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'fonts/[name].[hash][extname]'
          }
          if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(assetInfo.name || '')) {
            return 'images/[name].[hash][extname]'
          }
          return 'assets/[name].[hash][extname]'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['mermaid'],
    esbuildOptions: {
      target: 'es2015',
    },
  },
})
