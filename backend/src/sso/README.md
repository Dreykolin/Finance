# Login empresarial (SSO por OpenID Connect)

Además de Google, un usuario puede entrar con el proveedor de identidad (IdP)
de su organización: Microsoft Entra ID, Okta, Google Workspace, Keycloak... Lo
que cambia entre ellos son las variables `SSO_*`, no el código.

## Flujo

```
Navegador          Finance API                         IdP (Keycloak)
   │  GET /auth/sso/login  │                                  │
   │──────────────────────>│ genera state, nonce, PKCE        │
   │  302 + cookie sso_tx  │ (firmados en cookie httpOnly)    │
   │<──────────────────────│                                  │
   │  pantalla de login del IdP ─────────────────────────────>│
   │  302 /auth/sso/callback?code&state <─────────────────────│
   │──────────────────────>│ code + verifier ────────────────>│
   │                       │ ID token firmado <───────────────│
   │                       │ verifica firma, iss, aud, exp,   │
   │                       │ state, nonce → identidad (iss,sub)
   │  302 frontend/?codigo │ código de un solo uso (60 s)     │
   │<──────────────────────│                                  │
   │  POST /auth/canjear   │                                  │
   │──────────────────────>│ → JWT de sesión                  │
```

## Decisiones

| Problema | Decisión | Por qué |
|---|---|---|
| Varios proveedores de identidad | Tabla `identidades` con `UNIQUE (emisor, sub)`; Google pasa a ser una identidad más | `sub` es lo único que el IdP garantiza estable; el correo puede cambiar |
| ¿Vincular cuentas con el mismo correo? | No: si el correo ya existe, se rechaza (`cuenta_existente`) | Un IdP mal configurado, o uno que deja declarar cualquier correo, permitiría tomar la cuenta de otra persona |
| Correo no verificado | Se rechaza solo si el IdP dice `email_verified: false` | Entra ID no envía ese claim; exigirlo dejaría fuera a Microsoft |
| CSRF e inyección de códigos | `state` + `nonce` + PKCE (S256) | Probado en el e2e: un callback de otra sesión o robado se rechaza |
| Estado entre ida y vuelta al IdP | Cookie `httpOnly`, `SameSite=Lax`, firmada, 10 min, se consume en el callback | Sin estado en el servidor; nadie puede alterarla ni reutilizarla |
| El JWT viajaba en la URL (`?token=`) | Código de un solo uso, guardado como hash, canjeado con `DELETE ... RETURNING` | La URL queda en el historial y en logs; el código vencido o usado no sirve |
| ¿Por qué no una cookie de sesión? | Se mantiene el JWT en `Authorization` | Frontend (Vercel) y API (Render) están en dominios distintos: sería una cookie de terceros, que Safari bloquea |
| Primer login simultáneo | `ON CONFLICT` + releer la identidad del ganador | La base arbitra, igual que en el importador de cartolas |
| Activación | Solo con las 4 variables obligatorias; a medias, no arranca | Producción no cambia hasta que se configure; un error de configuración aparece al desplegar, no en el login de un usuario |
| IdP por HTTP | Solo si el emisor es `localhost` | Keycloak local sin TLS; cualquier otro IdP exige HTTPS |

## Tests

| Nivel | Archivo | Qué prueba |
|---|---|---|
| Unitario | `test/unit/sso-*.test.ts` | Configuración y claims → perfil |
| Integración (Postgres) | `test/integracion/identidades.test.ts` | Identidades, migración de usuarios de Google, concurrencia, códigos de un solo uso |
| Integración (rutas) | `test/integracion/sso.api.test.ts` | Cookie de transacción, errores, canje; el cliente OIDC simulado |
| e2e (Keycloak real) | `test/e2e/sso.keycloak.test.ts` | Login con usuario y clave en Keycloak, firma real, `state` y PKCE |

```bash
npm run db:test:up && npm run sso:up
npm test && npm run test:integracion && npm run test:e2e
```

## Probarlo a mano

1. `npm run sso:up` (Keycloak en http://localhost:8080, admin / admin).
2. Descomentar las variables `SSO_*` de `.env.example` en tu `.env`.
3. Levantar API y web; en el login aparece "Entrar con Empresa Demo".
4. Usuaria: `ana` / `ana-demo`.

Para un IdP real (p. ej. Entra ID): registrar una aplicación con redirect URI
`https://<api>/auth/sso/callback` y usar su emisor
(`https://login.microsoftonline.com/<tenant>/v2.0`), client ID y secreto.
