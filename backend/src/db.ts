import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         SERIAL PRIMARY KEY,
      nombre     TEXT NOT NULL,
      correo     TEXT NOT NULL UNIQUE,
      google_id  TEXT NOT NULL UNIQUE,
      creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS compras (
      id          SERIAL PRIMARY KEY,
      id_usuario  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      detalles    TEXT NOT NULL,
      monto       INTEGER NOT NULL,
      metodo_pago TEXT,
      fecha       DATE NOT NULL,
      origen      TEXT NOT NULL DEFAULT 'manual'
    );

    CREATE TABLE IF NOT EXISTS cuotas (
      id               SERIAL PRIMARY KEY,
      id_usuario       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre_producto  TEXT NOT NULL,
      tienda           TEXT NOT NULL,
      cuotas_totales   INTEGER NOT NULL,
      cuotas_pagadas   INTEGER NOT NULL DEFAULT 0,
      monto_cuota      INTEGER NOT NULL,
      fecha            DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suscripciones (
      id           SERIAL PRIMARY KEY,
      id_usuario   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre       TEXT NOT NULL,
      precio       INTEGER NOT NULL,
      fecha_limite DATE,
      pagado       BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS reservas (
      id           SERIAL PRIMARY KEY,
      id_usuario   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre       TEXT NOT NULL,
      monto_meta   INTEGER,
      completada   BOOLEAN NOT NULL DEFAULT FALSE,
      es_general   BOOLEAN NOT NULL DEFAULT FALSE
    );

    ALTER TABLE reservas ADD COLUMN IF NOT EXISTS completada BOOLEAN NOT NULL DEFAULT FALSE;

    -- Vínculo de las compras auto-generadas con su origen.
    -- SET NULL (no CASCADE): si se borra el producto, el pago ya ocurrió y debe
    -- seguir en el historial de gastos; solo pierde la trazabilidad.
    ALTER TABLE compras ADD COLUMN IF NOT EXISTS id_cuota
      INTEGER REFERENCES cuotas(id) ON DELETE SET NULL;
    ALTER TABLE compras ADD COLUMN IF NOT EXISTS id_suscripcion
      INTEGER REFERENCES suscripciones(id) ON DELETE SET NULL;

    -- El medio de pago de un compromiso se declara una vez y lo heredan todos
    -- los gastos que genera: la tarjeta con la que pagas un producto en cuotas
    -- no cambia de una cuota a otra.
    ALTER TABLE cuotas        ADD COLUMN IF NOT EXISTS metodo_pago TEXT;
    ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS metodo_pago TEXT;

    -- ── Suscripciones: de un booleano sin tiempo a cargos por período ────────
    -- 'pagado' no sabía a qué mes correspondía y el reseteo manual borraba la
    -- historia. Ahora cada cobro es una fila con su período y su monto propio.
    ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS ciclo TEXT NOT NULL DEFAULT 'mensual';
    ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS dia_cobro INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS mes_cobro INTEGER;
    ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;
    -- Desde cuándo corre el servicio: evita proyectar cargos hacia un pasado
    -- en el que el usuario todavía no estaba suscrito.
    ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS desde DATE NOT NULL DEFAULT CURRENT_DATE;

    CREATE TABLE IF NOT EXISTS cargos_suscripciones (
      id             SERIAL PRIMARY KEY,
      id_suscripcion INTEGER NOT NULL REFERENCES suscripciones(id) ON DELETE CASCADE,
      periodo        TEXT NOT NULL,                      -- 'YYYY-MM'
      -- Monto congelado: subir el precio del servicio no reescribe el historial.
      monto          INTEGER NOT NULL,
      estado         TEXT NOT NULL DEFAULT 'cobrado',    -- 'cobrado' | 'omitido'
      -- El cargo se asume cobrado al vencer; 'confirmado' distingue lo que el
      -- usuario verificó de lo que la app dio por hecho.
      confirmado     BOOLEAN NOT NULL DEFAULT FALSE,
      fecha          DATE NOT NULL,
      id_compra      INTEGER REFERENCES compras(id) ON DELETE SET NULL,
      UNIQUE (id_suscripcion, periodo)
    );

    CREATE INDEX IF NOT EXISTS idx_cargos_suscripcion ON cargos_suscripciones (id_suscripcion);

    -- Migración del booleano anterior: lo que estaba marcado como pagado pasa a
    -- ser un cargo confirmado del mes en curso. Idempotente por el UNIQUE.
    INSERT INTO cargos_suscripciones (id_suscripcion, periodo, monto, estado, confirmado, fecha)
    SELECT id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'), precio, 'cobrado', TRUE, CURRENT_DATE
    FROM suscripciones WHERE pagado = TRUE
    ON CONFLICT (id_suscripcion, periodo) DO NOTHING;

    -- Si había una fecha límite declarada, sirve como día de cobro inicial.
    UPDATE suscripciones
    SET dia_cobro = EXTRACT(DAY FROM fecha_limite)::INTEGER
    WHERE fecha_limite IS NOT NULL AND dia_cobro = 1;

    CREATE TABLE IF NOT EXISTS depositos_reservas (
      id          SERIAL PRIMARY KEY,
      id_reserva  INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
      detalles    TEXT,
      monto       INTEGER NOT NULL,
      es_retiro   BOOLEAN NOT NULL DEFAULT FALSE,
      fecha       DATE NOT NULL
    );
  `)
}
