import { pool } from '../db.js'
import type { AuthUser } from '../middleware/auth.js'

export const GOOGLE_ISSUER = 'https://accounts.google.com'

export interface Identidad {
  emisor: string
  sub: string
  correo: string
  nombre: string
}

/** Ya existe una cuenta con ese correo, creada con otro proveedor de identidad. */
export class ErrorCuentaExistente extends Error {
  constructor() {
    super('Ya existe una cuenta con ese correo; entra con el método que usaste la primera vez')
    this.name = 'ErrorCuentaExistente'
  }
}

/**
 * Un usuario puede entrar por varios proveedores de identidad (Google, el IdP de
 * su empresa...). Cada forma de entrar es una fila en `identidades`, identificada
 * por (emisor, sub), que es lo único que un IdP garantiza estable y único.
 *
 * Idempotente: corre en cada arranque.
 */
export async function initIdentidadesDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS identidades (
      id          SERIAL PRIMARY KEY,
      id_usuario  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      emisor      TEXT NOT NULL,
      sub         TEXT NOT NULL,
      creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (emisor, sub)
    );

    -- google_id queda como dato heredado: los usuarios nuevos de otros IdPs no lo tienen.
    ALTER TABLE usuarios ALTER COLUMN google_id DROP NOT NULL;

    -- Los usuarios de Google existentes pasan a ser una identidad más.
    INSERT INTO identidades (id_usuario, emisor, sub)
      SELECT id, '${GOOGLE_ISSUER}', google_id FROM usuarios WHERE google_id IS NOT NULL
      ON CONFLICT (emisor, sub) DO NOTHING;

    -- Se guarda el hash del código: quien lea la tabla no puede canjearlos.
    CREATE TABLE IF NOT EXISTS codigos_login (
      hash        TEXT PRIMARY KEY,
      id_usuario  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      expira_en   TIMESTAMPTZ NOT NULL
    );
  `)
}

async function buscarPorIdentidad(emisor: string, sub: string): Promise<AuthUser | null> {
  const { rows } = await pool.query(
    `SELECT u.id, u.nombre, u.correo
       FROM identidades i JOIN usuarios u ON u.id = i.id_usuario
      WHERE i.emisor = $1 AND i.sub = $2`,
    [emisor, sub])
  return rows[0] ?? null
}

/**
 * Devuelve el usuario dueño de la identidad, creándolo en el primer login.
 *
 * Nunca vincula por correo: si el correo ya pertenece a otra cuenta, se rechaza.
 * Vincular automáticamente permitiría que un IdP mal configurado (o uno que deja
 * declarar cualquier correo) entre a la cuenta de otra persona.
 *
 * Dos primeros logins simultáneos: la base arbitra con las restricciones UNIQUE
 * y el perdedor relee la identidad que creó el ganador.
 */
export async function buscarOCrearUsuario(identidad: Identidad): Promise<AuthUser> {
  const { emisor, sub, correo, nombre } = identidad

  const existente = await buscarPorIdentidad(emisor, sub)
  if (existente) return existente

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const creado = await client.query(
      `INSERT INTO usuarios (nombre, correo, google_id) VALUES ($1, $2, $3)
       ON CONFLICT (correo) DO NOTHING
       RETURNING id, nombre, correo`,
      // google_id se sigue llenando para Google: si hubiera que volver a la versión
      // anterior del login, esos usuarios seguirían encontrándose.
      [nombre, correo, emisor === GOOGLE_ISSUER ? sub : null])

    if (creado.rowCount === 0) {
      await client.query('ROLLBACK')
      const ganador = await buscarPorIdentidad(emisor, sub)
      if (ganador) return ganador
      throw new ErrorCuentaExistente()
    }

    const usuario: AuthUser = creado.rows[0]
    await client.query(
      'INSERT INTO identidades (id_usuario, emisor, sub) VALUES ($1, $2, $3)',
      [usuario.id, emisor, sub])
    await client.query(
      'INSERT INTO reservas (id_usuario, nombre, es_general) VALUES ($1, $2, TRUE)',
      [usuario.id, 'General'])
    await client.query('COMMIT')
    return usuario
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    if ((e as { code?: string }).code === '23505') {
      const ganador = await buscarPorIdentidad(emisor, sub)
      if (ganador) return ganador
    }
    throw e
  } finally {
    client.release()
  }
}
