import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Cloudflare Pages 등 일반 배포를 위해 base를 '/'로 다시 설정
  base: '/',
})
