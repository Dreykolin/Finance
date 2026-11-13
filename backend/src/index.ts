import 'dotenv/config'
import { app } from './app.js'
import { initDb } from './db.js'
import { initCartolasDb } from './cartolas/repositorio.js'

const PORT = process.env.PORT ?? 3000

initDb()
  .then(() => initCartolasDb())
  .then(() => {
    app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('Error conectando a la base de datos:', err.message)
    process.exit(1)
  })
