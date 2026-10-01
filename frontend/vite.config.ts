/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 分割後も Firebase SDK だけで約 510kB あり、これ以上は分けられないため警告の基準を上げる
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // 大きなライブラリを別ファイルにし、ページのコードを変えてもキャッシュが効くようにする
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
          if (id.includes('/chart.js/') || id.includes('/react-chartjs-2/')) return 'charts';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/react-router') || id.includes('/scheduler/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
