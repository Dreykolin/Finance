# Backlog — Finanzas

Cómo se usa: cada ítem tiene un ID corto y estable (`B*` bug, `T*` técnico, `F*` feature, `D*` descartado).
Estado: `[ ]` pendiente · `[~]` en curso · `[x]` hecho.
Las ideas nuevas entran en **Bandeja de entrada** sin pulir; desde ahí se clasifican.

---

## Bandeja de entrada

_(ideas sin clasificar — van llegando acá)_

---

## B — Bugs

- [ ] **B1 · `.env.example` con la variable rota.**
  `backend/.env.example:2` dice `    =postgresql://...`: falta el nombre `DATABASE_URL`. Quien clone el repo no levanta la DB.
  **No afecta producción**: el deploy tiene las 7 variables que el código lee (`DATABASE_URL`, `FRONTEND_URL`, `GOOGLE_CALLBACK_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `PORT`) más `NODE_ENV`. Es solo el archivo de ejemplo.
  Impacto: bajo (solo onboarding local) · Esfuerzo: minutos.

- [ ] **B2 · Errores async no capturados en rutas transaccionales.**
  En Express 4 un `throw` dentro de un handler `async` no llega al error handler.
  `backend/src/routes/cuotas.ts:60` y `backend/src/routes/suscripciones.ts:44` hacen `ROLLBACK` y luego `throw e`: se produce un unhandled rejection y la petición queda colgada sin respuesta (el front espera para siempre).
  Arreglo: wrapper `asyncHandler` + middleware de errores global, o `try/catch` que responda 500.
  Impacto: alto · Esfuerzo: bajo.

- [ ] **B3 · La reserva "General" solo se crea al registrarse.**
  `backend/src/routes/auth.ts` la crea únicamente en el alta del usuario. Si falla ese insert, o el usuario la perdió, `useAhorros` hace `return` en silencio y la pantalla de Ahorros queda vacía sin explicar por qué.
  Arreglo: garantizarla en `GET /reservas` (crear si no existe) en vez de solo al registrarse.

- [ ] **B4 · `POST /auth/logout` limpia una cookie que nunca se setea.**
  El flujo real usa `Bearer` desde `localStorage`. La ruta es decorativa; o se implementa cookie de verdad, o se elimina.

- [x] **B5 · Compras auto-generadas sin método de pago rompían el gráfico de distribución.**
  Las compras insertadas por cuotas y suscripciones no llevan `metodo_pago`; el desktop las acumulaba en una barra con etiqueta vacía. Ahora se clasifican por `origen` como categorías propias (**Cuotas** / **Suscripciones**), separando gasto comprometido de discrecional. Los manuales sin método quedan fuera y se informan al pie.
  *Hecho 2026-09-12 — desktop.*

- [x] **B6 · Revertir un pago dejaba el gasto fantasma en el historial.**
  Destildar una suscripción, o corregir una cuota marcada por error, no borraba la compra ya generada. Se agregaron `compras.id_cuota` y `compras.id_suscripcion` (`ON DELETE SET NULL`), y ambas reversiones ahora borran el gasto asociado dentro de la misma transacción.
  **Ojo:** los pagos marcados *antes* de este cambio no tienen el vínculo, así que no se pueden revertir automáticamente. Quedan como huérfanos históricos.
  *Hecho 2026-09-12.*

---

## T — Técnico / deuda

- [ ] **T1 · `GET /reservas` se pide dos veces en la página de Ahorros.**
  `useAhorros` y `useMetas` (`web/src/store/useAhorros.ts`) cargan la misma lista por separado. Unificar en un solo hook/contexto.

- [ ] **T2 · Duplicación desktop/mobile.**
  Hay dos árboles de páginas completos (`pages/*` y `pages/mobile/*`) con lógica repetida. Decidir: ¿converger en responsive, o asumir la separación como deliberada y compartir solo la capa de datos?

- [ ] **T3 · `fecha_limite` de suscripciones es un campo muerto.**
  El backend lo guarda y lo acepta, pero `web/src/types.ts` no lo expone y ningún form lo llena. O se usa (ver F2) o se borra del esquema.

- [ ] **T4 · Sin índices por `id_usuario`.**
  Todas las consultas filtran por `id_usuario` y no hay índice. Trivial de agregar en `initDb()`.

- [ ] **T5 · CORS con `credentials: true` sin usar cookies.**
  Config inconsistente con el esquema Bearer real. Limpiar o migrar a cookies httpOnly de verdad.

- [ ] **T6 · Token OAuth viaja en la query string.**
  `?token=...` queda en el historial del navegador y en logs de servidores intermedios antes del `replaceState`. Alternativa: fragmento (`#token=`) o cookie httpOnly.

- [x] **T11 . Los graficos escalaban con el ancho de pantalla.**
  Chart.js con `maintainAspectRatio: true` en un contenedor de ~1100px dibujaba un grafico de ~550px de alto. Ahora `ChartContainer` fija la altura (280px por defecto) y los graficos usan `maintainAspectRatio: false`.
  *Hecho 2026-09-12 - Gastos y Ahorros desktop.*

- [x] **T12 . Ahorros desktop en dos columnas.**
  El desktop heredaba el apilado vertical del mobile. Ahora: columna izquierda con saldo, grafico y metas (fija al hacer scroll); columna derecha de 380px con el registro de movimientos. Apilado por debajo de `xl`.
  *Hecho 2026-09-12.*

- [ ] **T13 . Mismo tratamiento de layout para Gastos desktop.**
  Analisis apila tendencia y distribucion en una columna; podrian convivir lado a lado. Historial es una lista plana sin navegacion por mes (ver T8).

- [ ] **T8 · Paridad mobile de lo aplicado en desktop.**
  Quedó pendiente a propósito (se priorizó desktop). Falta en mobile: edición de cuotas + deshacer (F3), donut por `origen` y toggle monto/frecuencia (B5), gráfico de Ahorros con líneas de meta — hoy **mobile no tiene gráfico alguno en Ahorros** (F4).

- [ ] **T9 · Donut duplicado.**
  `components/Donut.tsx` (nuevo, compartido) convive con el donut original embebido en `pages/mobile/Gastos.tsx`. Al hacer T8, migrar mobile al compartido y borrar el local.

- [ ] **T10 · Zoom temporal solo en mobile.**
  El gráfico con pinch-zoom y granularidad mes→día vive solo en mobile. El desktop tiene un Chart.js plano. Equivalente natural: rueda para zoom, arrastre para pan.

---

## F — Features / ideas

- [ ] **F1 · Presupuesto mensual vive en `localStorage`.**
  `fin_presupuesto` no se sincroniza entre dispositivos ni sobrevive un borrado de datos. Moverlo al backend (tabla `configuracion` o columna en `usuarios`).

- [ ] **F2 · Reset automático de suscripciones al cambiar de mes.**
  Hoy el reset es un botón manual. Con `fecha_limite` (T3) o un campo `ultimo_mes_pagado` se podría desmarcar solo, y avisar de vencimientos próximos.

- [x] **F3 · Editar cuotas (incluidas las ya pagadas).**
  `PATCH /cuotas/:id` con validaciones, más formulario de edición integral en el modal de detalle y un atajo *Deshacer última cuota*. Bajar `cuotas_pagadas` revierte los gastos generados (ver B6). El formulario avisa antes de confirmar.
  *Hecho 2026-09-12 — solo desktop, ver T8.*

- [x] **F4 · Múltiples líneas de meta en el gráfico de Ahorros.**
  Una línea por meta pendiente, ordenadas por cercanía, con color y leyenda propios; el eje Y se estira para que la meta más alta entre en el área visible. La tarjeta de saldo muestra la brecha explícita hacia la próxima meta.
  *Hecho 2026-09-12 — desktop.*

- [ ] **F5 · Ingresos en el modelo.**
  Sin ingreso, la app no puede decir si el mes cierra bien: solo compara contra un límite que el usuario inventó. Habilita disponible real = ingreso − comprometido − variable − ahorro. Es la brecha estructural del producto.
  Depende de decidir si la app asume que ya sabés cuánto ganás.

- [ ] **F6 · Metas como sobres con dinero asignado.**
  Hoy las metas son líneas de referencia sobre un saldo único: tres metas de $500k con $500k ahorrados se ven todas al 100%. El esquema ya soporta lo necesario (`depositos_reservas.id_reserva`), pero la UI manda todo a `General`. Decisión de producto pendiente, no solo técnica.

- [ ] **F7 · Editar gastos y suscripciones.**
  Mismo hueco que tenían las cuotas: solo alta y baja. Corregir exige borrar y recrear.

---

## D — Descartado

_(ideas evaluadas y decididas en contra — con el motivo, para no volver a discutirlas)_
