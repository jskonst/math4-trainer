import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  base: '/math4-trainer/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
