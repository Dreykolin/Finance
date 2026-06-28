import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  id: number
  nombre: string
  correo: string
}

declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token
  if (!token) { res.status(401).json({ error: 'No autenticado' }); return }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '30d' })
}
