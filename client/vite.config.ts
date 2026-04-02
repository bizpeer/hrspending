import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Root URL 배포를 위해 base를 '/'로 설정
  base: '/',
})
