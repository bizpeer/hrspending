import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Github Pages 레포지토리 이름에 맞게 base 설정
  base: '/hrspending/',
})
