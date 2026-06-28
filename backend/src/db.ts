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
      es_general   BOOLEAN NOT NULL DEFAULT FALSE
    );

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
