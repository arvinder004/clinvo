import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

const isWeb = process.env.TARGET === 'web' || process.env.VITE_TARGET === 'web';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(!isWeb
      ? [
          electron({
            main: {
              // Shortcut of `build.lib.entry`.
              entry: 'electron/index.ts',
              vite: {
                build: {
                  commonjsOptions: {
                    ignoreDynamicRequires: true,
                  },
                  rollupOptions: {
                    external: [
                      'electron',
                      'electron-updater',
                      'node-machine-id',
                      'electron-store',
                      'better-sqlite3',
                      'node:path',
                      'node:fs',
                      'node:module',
                      'node:url',
                      'node:crypto',
                    ],
                  },
                },
              },
            },
            preload: {
              // Shortcut of `build.rollupOptions.input`.
              input: path.join(import.meta.dirname, 'electron/preload.ts'),
            },
          }),
        ]
      : []),
  ],
  server: {
    port: 5174,
  },
})

