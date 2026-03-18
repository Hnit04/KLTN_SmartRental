import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Fix: sockjs-client dùng biến Node.js 'global' không có trong browser
  define: {
    global: 'globalThis',
  },
})

