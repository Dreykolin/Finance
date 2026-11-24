import 'dotenv/config'
import { app } from './app.js'
import { initDb } from './db.js'
import { initCartolasDb } from './cartolas/repositorio.js'
import { initIdentidadesDb } from './identidades/repositorio.js'
import { leerConfigSso } from './sso/config.js'

const PORT = process.env.PORT ?? 3000

// Una configuración SSO a medias debe impedir el arranque, no fallar en el
// primer login de un usuario.
const sso = leerConfigSso(process.env)
console.log(sso ? `Login empresarial habilitado (${sso.issuer.href})` : 'Login empresarial deshabilitado')

initDb()
  .then(() => initCartolasDb())
  .then(() => initIdentidadesDb())
  .then(() => {
    app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('Error conectando a la base de datos:', err.message)
    process.exit(1)
  })
