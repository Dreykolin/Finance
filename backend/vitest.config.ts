import { defineConfig } from 'vitest/config'

// Los tests de integración usan un Postgres desechable en Docker (docker-compose.test.yml),
// nunca la base de producción. La URL apunta al puerto 5433 a propósito.
const TEST_DATABASE_URL = 'postgresql://postgres:test@localhost:5433/finance_test'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'secreto-solo-para-tests',
    },
    // Los tests de integración comparten una misma base: se ejecutan en serie.
    fileParallelism: false,
  },
})
