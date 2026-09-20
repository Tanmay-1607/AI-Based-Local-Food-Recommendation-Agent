import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from both frontend directory and repository root directory
  const envFrontend = loadEnv(mode, __dirname, '')
  const envRoot = loadEnv(mode, rootDir, '')
  const mergedEnv = { ...envRoot, ...envFrontend, ...process.env }

  // Detect VITE_API_URL or any common alias (VITE_BACKEND_URL, VITE_API_BASE_URL, BACKEND_URL, API_URL)
  const rawApiUrl = (
    mergedEnv.VITE_API_URL ||
    mergedEnv.VITE_BACKEND_URL ||
    mergedEnv.VITE_API_BASE_URL ||
    mergedEnv.VITE_SERVER_URL ||
    mergedEnv.BACKEND_URL ||
    mergedEnv.API_URL ||
    ''
  )
    .trim()
    .replace(/^["']|["']$/g, '') // Strip accidental quotes added in dashboard

  return {
    plugins: [react()],
    define: {
      // Injects the resolved URL statically at build time into import.meta.env.VITE_API_URL
      ...(rawApiUrl
        ? {
            'import.meta.env.VITE_API_URL': JSON.stringify(rawApiUrl),
          }
        : {}),
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

