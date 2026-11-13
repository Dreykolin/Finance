import { createHash, randomBytes } from 'node:crypto'
import { pool } from '../db.js'
import type { AuthUser } from '../middleware/auth.js'

const hash = (codigo: string) => createHash('sha256').update(codigo).digest('hex')

/**
 * Después del login, el backend redirige al frontend con un código de un solo
 * uso en vez del JWT: la URL queda en el historial y en logs, el código no
 * sirve después de canjearlo ni pasado su plazo. Es la misma idea del
 * "authorization code" de OAuth.
 */
export async function emitirCodigo(idUsuario: number, ttlSegundos = 60): Promise<string> {
  const codigo = randomBytes(32).toString('base64url')
  await pool.query(`DELETE FROM codigos_login WHERE expira_en < NOW()`)
  await pool.query(
    `INSERT INTO codigos_login (hash, id_usuario, expira_en)
     VALUES ($1, $2, NOW() + make_interval(secs => $3))`,
    [hash(codigo), idUsuario, ttlSegundos])
  return codigo
}

/** Canjea y borra el código en una sola sentencia: dos canjes simultáneos no ganan ambos. */
export async function canjearCodigo(codigo: string): Promise<AuthUser | null> {
  const { rows } = await pool.query(
    `WITH canjeado AS (
       DELETE FROM codigos_login WHERE hash = $1 RETURNING id_usuario, expira_en
     )
     SELECT u.id, u.nombre, u.correo
       FROM canjeado c JOIN usuarios u ON u.id = c.id_usuario
      WHERE c.expira_en > NOW()`,
    [hash(codigo)])
  return rows[0] ?? null
}
