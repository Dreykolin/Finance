# Importador de cartolas (Banco de Chile)

Importa la cartola histórica que entrega el Banco de Chile, evita duplicados y
sugiere con qué gasto registrado calza cada cargo (conciliación bancaria).

## Flujo

```
.xls (BIFF8) → leerFilas → interpretarFilas → validarSaldos → conHuellas → guardarMovimientos → sugerenciasPara
   SheetJS        matriz      Cartola tipada     integridad      dedupe        Postgres (UNIQUE)     conciliación
```

Cada paso es una función pura salvo los dos últimos, por eso casi todo se
prueba sin base de datos (`test/unit`). Los tests de `test/integracion` usan un
Postgres real en Docker.

## Decisiones

| Problema | Decisión | Por qué |
|---|---|---|
| El banco entrega un `.xls` binario (Excel 97-2003), no CSV | Leerlo con SheetJS instalado desde su CDN | La versión de npm (0.18.5) está abandonada y tiene vulnerabilidades conocidas |
| La posición de las filas puede cambiar | Ubicar encabezado, emisión y saldo inicial por su texto | Una fila nueva del banco no debe romper la importación |
| Fechas `dd/mm` sin año | Año de la emisión; si el día/mes es posterior, año anterior | El banco solo deja consultar 12 meses, así que no hay ambigüedad |
| Cargos y abonos en columnas separadas | Un solo monto con signo | Simplifica sumas y conciliación |
| ¿Se leyó bien la cartola? | Saldo inicial + movimientos = saldo final, o se rechaza entera | Mejor no importar nada que importar datos que no cuadran con el banco |
| El banco no entrega un ID por movimiento | Huella = fecha + monto + descripción + nº de ocurrencia | Sin la ocurrencia, dos transferencias idénticas el mismo día se fusionarían |
| Reimportaciones e importaciones simultáneas | `UNIQUE (id_usuario, huella)` + `ON CONFLICT DO NOTHING` en una sola sentencia | La base arbitra; no depende de que la aplicación "revise antes" |
| Un gasto conciliado dos veces | Índice único parcial sobre `id_compra` | Misma idea: la regla vive en la base |
| Errores | `ErrorCartola` → 422 con el número de fila y el motivo | El usuario sabe qué falló; los errores nuestros son 500 |
| Zonas horarias | Fechas como texto ISO (`to_char` al leer) | `DATE` de Postgres llega como `Date` local en node-pg y puede correrse un día |

## Supuestos y límites

- Una cuenta por usuario: la huella no incluye el número de cuenta.
- Las cartolas incluyen días completos (necesario para que la ocurrencia
  coincida entre cartolas solapadas).
- La conciliación es voraz y por monto exacto con tolerancia de 3 días; son
  sugerencias que el usuario confirma.
- Las cartolas reales tienen RUT y número de cuenta: nunca se versionan
  (`.gitignore`). Los tests usan `test/fixtures/cartola_ficticia.xls`, generada
  por `scripts/generar-cartola-ficticia.ts`.

## Uso

```bash
npm test                      # unitarios
npm run db:test:up            # Postgres de pruebas en Docker (puerto 5433)
npm run test:integracion
npm run db:test:down
```

```bash
curl -X POST http://localhost:3000/cartolas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/vnd.ms-excel" \
  --data-binary @cartola.xls
```
