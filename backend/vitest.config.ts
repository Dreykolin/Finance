import { defineConfig } from 'vitest/config'

// Los tests de integración usan un Postgres desechable en Docker (docker-compose.test.yml),
// nunca la base de producción. La URL apunta al puerto 5433 a propósito.
const TEST_DATABASE_URL = 'postgresql://postgres:test@localhost:5433/finance_test'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'secreto-solo-para-tests',
      // La estrategia de Google se registra al importar las rutas y exige estos
      // valores; en los tests nunca se usa el login real.
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      GOOGLE_CALLBACK_URL: 'http://localhost/auth/google/callback',
    },
    // Los tests de integración comparten una misma base: se ejecutan en serie.
    fileParallelism: false,
  },
})
