import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 빌드 및 개발용 기본 경로를 /hr/ 로 설정
  // 이 설정을 통해 하위 디렉토리(domain.com/hr/)에서 앱이 안전하게 구동됩니다.
  base: '/hr/',
})
