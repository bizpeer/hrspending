import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Cloudflare Pages 등 일반 배포를 위해 base를 '/'로 다시 설정
  base: '/',
})
