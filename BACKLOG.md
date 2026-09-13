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

- [x] **B7 · Gasto duplicado al materializar cargos (condición de carrera).**
  La compra se insertaba *antes* que el cargo. Si el cargo chocaba con su UNIQUE
  (dos peticiones a la vez: StrictMode en desarrollo, o dos pestañas), la compra quedaba
  igual y aparecía un gasto duplicado sin cargo detrás. Ahora el cargo va primero y su
  UNIQUE arbitra: si otra petición ya lo creó, esta no inserta nada.
  *Hecho 2026-09-12.*

- [x] **B8 · Reactivar una suscripción inventaba los meses de baja.**
  `desde` no se movía, así que al reactivar se materializaban todos los cargos del período
  inactivo, con sus gastos — justo lo que dar de baja venía a evitar. Ahora reactivar
  mueve `desde` a la fecha actual.
  *Hecho 2026-09-12.*

- [x] **B9 · Borrar un gasto no avisaba a su origen.**
  `DELETE /compras/:id` era ciego: la cuota seguía contando el pago (3/12 con solo dos
  gastos) y el cargo seguía en 'cobrado' con `id_compra` en NULL. Ahora borrar un gasto
  auto-generado revierte su origen, y el diálogo lo explica antes de confirmar.
  *Hecho 2026-09-12.*

- [ ] **B10 · Cambiar el ciclo de una suscripción deja cargos incoherentes.**
  Al pasar de mensual a anual, los cargos mensuales anteriores siguen ahí y el carril los
  muestra en meses que ya "no aplican". No corrompe datos, pero se lee raro. Falta decidir
  si el cambio de ciclo debe limpiar el futuro, o si el historial viejo es legítimo
  (el servicio *sí* se cobraba así antes).

- [ ] **B11 · El toggle móvil fecha el cargo el día que lo tocas.**
  Usa la fecha de hoy en vez de la fecha de cobro del período, así que el gasto puede
  quedar con un día que no corresponde. Solo afecta a la vista móvil.

- [x] **B12 · La barra de navegación se dibujaba encima de los diálogos.**
  `MobileNav` y `Modal` compartían `z-50`, y la barra se monta después en el árbol: con
  el mismo z-index ganaba ella. El resultado era una barra flotando sobre el fondo
  oscurecido del diálogo, **y además pulsable**. Ahora hay una escala declarada en
  `index.css` (flotante 20 · navegación 30 · diálogo 50) y nadie reparte z-index a ojo.
  *Hecho 2026-09-12.*

- [x] **B13 · Dos diálogos abiertos se pisaban el bloqueo del scroll.**
  En Cuotas, el diálogo de detalle abre el de confirmación. El bloqueo era un booleano,
  así que al cerrar el segundo el fondo volvía a desplazarse con el primero todavía
  abierto. Ahora se lleva por pila, que además decide quién atiende Escape (solo el de
  arriba) y sitúa cada diálogo por encima del anterior.
  *Hecho 2026-09-12.*

- [x] **B14 · Dar de alta un servicio cuyo cobro del mes ya pasó no registraba ese cobro.**
  `desde` se fijaba en la fecha de alta y la materialización exige `fechaCobro >= desde`:
  un servicio con cobro el día 10, registrado el 12, se quedaba fuera por dos días.
  **No se resolvió con una regla automática**: registrar algo que ya tenías y contratar
  algo nuevo hoy son casos opuestos, y dar por hecho el cobro en el segundo inventaría un
  gasto. El formulario pregunta, pero solo cuando hay ambigüedad —el día ya pasó—, con
  "ya lo tenía" por defecto.
  *Hecho 2026-09-12.*

- [x] **B15 · Las celdas que no aplican eran invisibles.**
  Borde `zinc-900` sobre fondo `zinc-900`: los meses anteriores al alta desaparecían y el
  carril parecía desalineado, como si faltaran celdas en vez de no corresponder.
  *Hecho 2026-09-12.*

- [x] **B17 · La migración de B16 tumbó el despliegue.**
  `invalid reference to FROM-clause entry for table "c"`: PostgreSQL no permite que un
  `LATERAL` del `FROM` referencie la tabla que el `UPDATE` está modificando. `initDb()`
  lanzaba, el proceso salía con código 1 y Render marcaba el despliegue como fallido.
  Reescrito con un CTE, que calcula aparte y luego se aplica.
  Se corrigió además el orden: el re-fechado corría antes de rellenar `fecha_primer_cobro`,
  así que en el primer arranque no habría reparado nada.

  **Lo estructural:** las reparaciones de datos salieron del bloque de esquema y ahora
  tienen su propio manejo de errores. Que las tablas existan es condición para arrancar;
  re-fechar gastos históricos no lo es. Una corrección que falla ya no deja el servicio
  abajo — lo registra y sigue.
  *Hecho 2026-09-13.*

- [x] **B16 · Los gastos de cuota se fechaban el día de registro, no el del cobro.**
  `POST /cuotas/:id/marcar` usaba `new Date()`, así que ponerse al día con un producto
  antiguo amontonaba todas sus cuotas en el mes en curso y lo inflaba — un notebook en 24
  cuotas con 8 pagadas metía $240.000 en septiembre. Ahora cada gasto se fecha en
  `fecha_primer_cobro + (n-1) meses`, respetando fin de mes.
  Además: el alta acepta cuotas ya pagadas y el `PATCH` genera los gastos que faltan al
  subir el contador, en vez de obligar a pulsar "marcar" doce veces.
  **Incluye reparación de los datos ya creados**, que se re-fechan al arrancar el backend
  leyendo el número de cuota del propio detalle.
  *Hecho 2026-09-13.*

- [ ] **T19 · El calendario de cuotas está escrito dos veces.**
  `web/src/lib/cuotas.ts` y las funciones nuevas de `backend/src/routes/cuotas.ts` calculan
  lo mismo. Es deliberado por ahora (no hay código compartido entre ambos proyectos), pero
  si una cambia y la otra no, las fechas dejan de coincidir en silencio.

---

## T — Técnico / deuda

- [ ] **T1 · `GET /reservas` se pide dos veces en la página de Ahorros.**
  `useAhorros` y `useMetas` (`web/src/store/useAhorros.ts`) cargan la misma lista por separado. Unificar en un solo hook/contexto.

- [ ] **T2 · Duplicación desktop/mobile.**
  Hay dos árboles de páginas completos (`pages/*` y `pages/mobile/*`) con lógica repetida. Decidir: ¿converger en responsive, o asumir la separación como deliberada y compartir solo la capa de datos?

- [ ] **T3 · `fecha_limite` de suscripciones quedó obsoleta.**
  La reemplazaron `ciclo` + `dia_cobro` + `mes_cobro`. Solo se usa una vez, para derivar
  el día de cobro inicial al migrar los registros antiguos. Se puede borrar tras el primer despliegue.

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

- [x] **T13 . Mismo tratamiento de layout para Gastos desktop.**
  Dos columnas como Ahorros: analisis a la izquierda (fijo al scrollear), movimientos a la derecha. **Se quitaron las pestanas Analisis/Historial**: existian por el ancho del movil, y en escritorio ambas vistas caben a la vez. La fila del historial recorta la descripcion a una linea y la muestra completa al abrirla, junto al metodo y el borrar; los gastos automaticos muestran su origen (Cuotas / Suscripciones) en lugar de un metodo vacio.
  *Hecho 2026-09-12.*

- [ ] **T14 . Navegacion por mes en el historial de escritorio.**
  Mobile permite moverse entre meses y muestra el avance del presupuesto; el escritorio sigue con una lista plana de 12 + "ver todos", sin forma de mirar el mes pasado. Es el hueco funcional mas grande que queda en desktop.

- [x] **T8 · Paridad móvil.**
  Las cuatro pantallas de `/mobile/*` estaban seis iteraciones atrás, y **Gastos tenía su
  propia copia de la paleta con los colores que habían fallado la validación** — crédito y
  débito indistinguibles. Ahora: donut y paleta compartidos con clasificación por origen,
  carril de suscripciones apilado (celdas de ~40px en vez de <20px), edición y deshacer en
  cuotas, método de pago en ambas altas, indicadores en las cuatro, y **gráfico de evolución
  en Ahorros**, que no tenía ninguno. La lógica del carril vive en `lib/cargos.ts` y la
  consumen las dos plataformas.
  *Hecho 2026-09-12.*

- [x] **T18 · Movimiento con criterio, no por defecto.**
  Dos duraciones y dos curvas en `index.css`, con la salida siempre más rápida que la
  entrada. Los diálogos ahora **se cierran animados** (antes el fondo se desvanecía y la
  ventana desaparecía de golpe), suben como hoja en el teléfono y crecen en su sitio en
  escritorio. Las filas que se despliegan animan su altura con la retícula en lugar de
  saltar. Se respeta `prefers-reduced-motion`: quien lo pide recibe el cambio de estado
  sin el trayecto.
  *Hecho 2026-09-12.*

- [ ] **T17 · El zoom del gráfico de tendencia sigue siendo solo móvil.**
  Es el único elemento que el escritorio no tiene y el teléfono sí (ver T10). Lo dejé
  así: depende de gestos táctiles y su equivalente con ratón es otro desarrollo.

- [ ] **T9 · Donut duplicado.**
  `components/Donut.tsx` (nuevo, compartido) convive con el donut original embebido en `pages/mobile/Gastos.tsx`. Al hacer T8, migrar mobile al compartido y borrar el local.

- [ ] **T10 · Zoom temporal solo en mobile.**
  El gráfico con pinch-zoom y granularidad mes→día vive solo en mobile. El desktop tiene un Chart.js plano. Equivalente natural: rueda para zoom, arrastre para pan.

---

## F — Features / ideas

- [ ] **F1 · Presupuesto mensual vive en `localStorage`.**
  `fin_presupuesto` no se sincroniza entre dispositivos ni sobrevive un borrado de datos. Moverlo al backend (tabla `configuracion` o columna en `usuarios`).

- [x] **F2 . Suscripciones: de booleano a cargos por periodo.**
  `pagado` no sabia a que mes correspondia y el reseteo manual borraba la historia. Ahora cada suscripcion declara ciclo (mensual/anual) y dia de cobro, y cada cobro es una fila en `cargos_suscripciones` con periodo, monto congelado y estado. Los cargos vencidos se materializan solos al listar (sin cron) y se dan por cobrados, generando el gasto; el usuario marca los que no ocurrieron. Carril de 7 meses navegable en desktop. Se elimino el boton de reseteo (backend y ambas plataformas).
  Se agrego **dar de baja** (`activa`): sin eso, el modo optimista seguiria inventando gastos de un servicio ya cancelado.
  *Hecho 2026-09-12.*

- [x] **F3 · Editar cuotas (incluidas las ya pagadas).**
  `PATCH /cuotas/:id` con validaciones, más formulario de edición integral en el modal de detalle y un atajo *Deshacer última cuota*. Bajar `cuotas_pagadas` revierte los gastos generados (ver B6). El formulario avisa antes de confirmar.
  *Hecho 2026-09-12 — solo desktop, ver T8.*

- [x] **F4 · Múltiples líneas de meta en el gráfico de Ahorros.**
  Una línea por meta pendiente, ordenadas por cercanía, con color y leyenda propios; el eje Y se estira para que la meta más alta entre en el área visible. La tarjeta de saldo muestra la brecha explícita hacia la próxima meta.
  *Hecho 2026-09-12 — desktop.*

- [x] **F12 · Métricas y gráficos en los cuatro módulos.**
  Fila de indicadores en cada pantalla y un gráfico nuevo en Cuotas (carga mensual
  proyectada a 12 meses: cada escalón hacia abajo es una deuda que termina).
  Gastos: gastado, proyección de cierre, comprometido, promedio de meses cerrados.
  Ahorros: ritmo mensual y plazo estimado a la próxima meta.
  Suscripciones: costo anualizado y acumulado histórico por servicio.
  *Hecho 2026-09-12 — escritorio.*

- [x] **F13 · Paleta de datos corregida y verificada.**
  El verificador de visión cromática encontró que **Crédito y Débito eran casi
  indistinguibles** (ΔE 1.3 con daltonismo deutan; 12.0 con visión normal, bajo el
  piso de 15) — justo la distinción que el módulo existe para mostrar. Paleta nueva
  verificada sobre la superficie oscura, y los segmentos del donut pasaron a **orden
  canónico fijo**: ordenarlos por magnitud volvía variable qué colores quedaban
  contiguos y anulaba la garantía de separación.
  *Hecho 2026-09-12.*

- [x] **T16 · Sistema visual unificado.**
  Seis iteraciones habían dejado deriva: dos botones primarios distintos para la misma
  acción, dos de cuatro títulos que no coincidían con su entrada del menú, icono de
  cabecera en solo dos pantallas, tres rellenos de tarjeta y cinco definiciones del
  mismo campo de formulario. Ahora hay primitivos en `components/ui.tsx` — Card,
  CardHeader, SectionLabel, PageHeader, Button, IconButton, INPUT y LABEL — y las
  cuatro pantallas los usan.
  *Hecho 2026-09-12 — escritorio.*

- [ ] **T15 · Nada de esto se ha visto renderizado.**
  Verificado: tipos, build, geometría de los gráficos en sus límites (1 a 12 columnas,
  colisión de etiquetas, desbordes) y la paleta con el verificador. **No verificado:**
  cómo se ve de verdad en pantalla. Falta levantar la app contra la base y recorrer
  las cuatro pantallas.

- [ ] **F16 · Bandeja de transacciones importadas.** *(la línea grande)*
  Importar la cartola del banco y clasificar cada línea en lugar de teclearla. Ataca la
  debilidad estructural del producto: hoy **todo** depende de que el usuario registre a mano,
  y ese es el motivo por el que las apps así se abandonan a las tres semanas.

  **Flujo:** cartola (CSV que el banco ya exporta) → transacciones crudas → conciliación
  automática → bandeja con lo no reconocido → el usuario decide: gasto directo, cargo de
  una suscripción (existente o nueva), cuota de un producto (existente o nuevo, rellenando
  cuántas van), o ignorar. **El efectivo se sigue registrando a mano**, y está bien: no es
  un defecto, es el estado actual sobreviviendo mientras el resto se automatiza.

  **La pieza que decide si funciona: la regla se aprende una vez.** Si cada mes hay que
  volver a identificar el mismo cargo, el esfuerzo es constante y no se ganó nada.
  Identificado una vez, se guarda el patrón y a partir de ahí llega conciliado. El trabajo
  es alto el primer mes y tiende a cero.

  **El cierre del círculo:** el campo `confirmado` de los cargos existe porque nadie podía
  verificarlos. La cartola *es* esa verificación — lo que aparece se confirma solo, lo que
  no aparece se marca como no cobrado y su gasto se borra. "Por revisar" deja de ser una
  tarea del usuario.

  **Lo difícil de verdad:**
  1. *Duplicados* — un gasto anotado a mano que además viene en la cartola. Emparejar por
     monto y fecha aproximada, y decidir cuál gana.
  2. *El descriptor es inestable* — `GOOGLE *YOUTUBE` / `GOOGLE*YOUTUBEPREMIUM`, con sufijos
     variables. Emparejar por patrón normalizado, nunca por texto exacto.
  3. *Cuotas* — muchas cartolas chilenas traen `CUOTA 3/12` en la glosa: si está, el producto
     se crea con su progreso; si no, lo rellena el usuario.

  **No requiere Open Finance** (ver F17): el CSV del banco basta, y deja construido el motor
  que Open Finance necesitaría igual.

- [ ] **F17 · Open Finance como fuente, después de F16.**
  Sustituiría la importación manual del archivo por conexión automática. En Chile lo rige la
  Ley Fintec (21.521) y el Sistema de Finanzas Abiertas de la CMF; operar directamente exige
  inscripción en registro y obligaciones desproporcionadas para este proyecto, así que la vía
  realista es un agregador ya registrado (Fintoc, Belvo, Floid), con costo por usuario o por
  consulta. **El calendario de implementación del SFA hay que verificarlo en la CMF**: el que
  manejo puede estar desactualizado.

  Empezar por aquí sería pagar por un flujo de datos que todavía no se sabe procesar. Y
  cambia el perfil de riesgo del proyecto: la app pasaría de guardar lo que el usuario
  escribió a custodiar su historial bancario — momento en que T6 (token en la query string)
  y T5 dejan de ser deuda menor.

- [ ] **F5 · Ingresos en el modelo.**
  Sin ingreso, la app no puede decir si el mes cierra bien: solo compara contra un límite que el usuario inventó. Habilita disponible real = ingreso − comprometido − variable − ahorro. Es la brecha estructural del producto.
  Depende de decidir si la app asume que ya sabés cuánto ganás.

- [ ] **F6 · Metas como sobres con dinero asignado.**
  Hoy las metas son líneas de referencia sobre un saldo único: tres metas de $500k con $500k ahorrados se ven todas al 100%. El esquema ya soporta lo necesario (`depositos_reservas.id_reserva`), pero la UI manda todo a `General`. Decisión de producto pendiente, no solo técnica.

- [ ] **F7 · Editar gastos.**
  Solo admiten alta y baja: corregir un gasto exige borrarlo y recrearlo.
  Cuotas y suscripciones ya tienen edición.

- [x] **F9 · Medio de pago en cuotas y suscripciones.**
  El medio es propiedad del compromiso, no del momento: se declara una vez (opcional) y
  lo heredan todos los gastos que genera. Desbloquea saber cuánto del cupo de cada tarjeta
  está comprometido antes de gastar. El donut pasó a tener dos ejes — **método** (con qué pagas)
  y **tipo** (directo / cuotas / suscripciones) — porque son dimensiones ortogonales.
  *Hecho 2026-09-12 — escritorio; el alta móvil lo deja sin declarar.*

- [ ] **F10 · Cuentas y tarjetas concretas, no solo el tipo.**
  Hoy el medio es una categoría genérica ("Crédito"). Si tienes dos tarjetas de crédito,
  la app no las distingue, y el cupo comprometido es por tarjeta, no por tipo. Implicaría
  una tabla de cuentas con cupo y fecha de facturación. Es el paso natural después de F9,
  y también el que acerca a F5 (ingresos) la idea de saldo real.

- [ ] **F11 · Cuotas de casa comercial como medio propio.**
  La lista actual (efectivo, débito, crédito, transferencia) no cubre el crédito de retail
  (CMR, Ripley, Líder), que en Chile es un medio distinto del crédito bancario y muy común
  justamente en compras en cuotas. No lo agregué por mi cuenta: cambia el vocabulario
  compartido con el formulario de gastos.

- [x] **F14 · La celda del mes en curso se puede marcar a mano.**
  Antes solo era pulsable un cargo ya materializado, así que un servicio dado de alta
  tarde no tenía forma de corregirse desde el carril. Ahora alternar un periodo no futuro
  crea el cargo si falta, con su gasto. Resuelve también las suscripciones creadas antes
  de B14, que de otro modo habría que borrar y volver a crear.
  *Hecho 2026-09-12.*

- [ ] **F15 · Declarar desde cuándo tienes un servicio.**
  Hoy el carril solo puede llenarse hacia atrás marcando mes a mes. Un campo "lo tengo
  desde" en el alta poblaría el histórico de una vez — y con él, el acumulado real de
  cuánto llevas pagado.

- [ ] **F8 . Recordatorio de cobros proximos.**
  Ya existe el dato (dia de cobro): falta avisar antes de que ocurra. Hoy el carril solo se mira si entras.

---

## D — Descartado

_(ideas evaluadas y decididas en contra — con el motivo, para no volver a discutirlas)_
