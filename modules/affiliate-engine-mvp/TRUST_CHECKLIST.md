# ARC Affiliate & Commerce Engine — Puertas de confianza (MVP 0.8)

**Estado:** PILOTO LOCAL CON DINERO SIMULADO. Ninguna sección de este documento autoriza operar una plataforma pública ni recibir fondos de clientes.

## A. Controles implementados y verificables

| Control | Estado | Prueba |
|---|---|---|
| 10 % de ARC sobre comisión comercial | En código | `engine.test.mjs` |
| COP enteros, redondeo de comisión y desglose | En código | `engine.test.mjs` |
| Solicitudes idempotentes y rechazo de atribución contradictoria | En código | `engine.test.mjs` |
| Enlaces exclusivos producto/afiliado y contador sin cookies/IP | En código | `engine.test.mjs` |
| Reversos de ventas de prueba | En código | `engine.test.mjs` |
| Migración de columna de atribución sin perder ventas antiguas | En código | `engine.test.mjs` |
| Conciliación básica: integridad SQLite, llaves foráneas, sumas, eventos | En código | `engine.test.mjs` y `GET /api/integrity` |
| Escrituras bloqueadas si falla conciliación | En código | `server.mjs` |
| Escucha solo en 127.0.0.1 + filtro Host/Origin/Sec-Fetch + JSON | En código | `http.test.mjs` |
| CSP, estilos y scripts locales, sin dependencias web remotas | En código | `http.test.mjs` |
| Activación de cobros reales | **NO** | No existe implementación de cobro |
| Disponibilidad pública / seguridad multiusuario | **NO** | Sin autenticación ni autorización |

Las verificaciones locales no constituyen auditoría independiente. Aunque la conciliación dé `ok: true`, **no** demuestra que los datos sean verdaderos ni que un administrador con acceso al archivo no pueda alterar los registros. Las ventas son inventadas en el modo de simulación.

## A.1. Avances en MySQL 8.4 de CI (NO aptos para usuarios reales)

| Control de prueba | Estado | Evidencia |
|---|---|---|
| Persistencia MySQL separada del R4 local | Aprobado en contenedor temporal | `mysql-staging-store.integration.test.mjs` |
| Pedido+comisión+auditoría en transacción InnoDB | Aprobado en pruebas | `mysql-staging-store.integration.test.mjs` |
| Asientos balanceados (débito/crédito) e inverso al reembolso | Aprobado en pruebas | `mysql-staging-security.integration.test.mjs` |
| Detección de un asiento manualmente alterado | Aprobado en pruebas | `mysql-staging-security.integration.test.mjs` |
| Roles ficticios y permiso por producto/afiliado | Aprobado en pruebas | `mysql-staging-access.test.mjs`, `mysql-staging-security.integration.test.mjs` |
| Autenticación real y MFA | **NO** | Pendiente de implementar |
| Libro contable inmutable y conciliación independiente | **NO** | Pendiente de implementar |
| Cobro, retención y pago reales | **NO** | Prohibidos en esta etapa |

La política de roles es un **mecanismo interno de autorización para identidades ficticias**. No verifica identidades reales y sus métodos directos no deben publicarse como endpoints. La simulación del dinero se limita a asientos ficticios, sin representar fondos depositados o liquidaciones.

### Verificación
La ejecución oficial [41941908374](https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/actions/runs/41941908374) completó **50 ejecuciones de pruebas aprobadas, 0 fallidas** para la lógica del MVP 0.8 (39 generales + 11 MySQL). Las 10 pruebas omitidas en el trabajo general se reservan para el trabajo especializado.

## B. Condiciones bloqueantes antes de lanzar un comercio real

- [ ] **Legal Colombia:** opinión jurídica documentada sobre modalidad comercial, no mercadeo multinivel por reclutamiento, tributación, facturación, garantía, retracto y deberes frente al consumidor.
- [ ] **Contratos:** términos para comerciantes, compradores y afiliados; acuerdos de comisión que aclaren el 10 %, devoluciones, saldo pendiente, plazos, gastos de transacción e impuestos.
- [ ] **Protección de datos:** finalidades, aviso de privacidad, base legal, retención, eliminación, incidentes y ejercicio de derechos; cumplimiento local y de cada mercado objetivo.
- [ ] **Registro:** sistema de cuentas y autorización individual por vendedor, comprador y afiliado; MFA para administradores; registros de sesión y revocación.
- [ ] **Aprobación de productos:** prueba de titularidad/permiso para comerciarlos, criterios de calidad, rechazo de productos prohibidos, revisión de reclamaciones y publicidad.
- [ ] **Publicidad:** IA y contenido comercial revisables; prohibidos resultados económicos ficticios, testimonios inventados, cifras manipuladas o ganancias garantizadas.
- [ ] **Pagos:** proveedor habilitado para el modelo marketplace; validación independiente de las liquidaciones; ninguna venta confirmada desde un botón o una petición del navegador.
- [ ] **Webhooks:** firmas verificadas, eventos idempotentes, procesamiento resistente a concurrencia y reintentos, manejo de cobros reversados y disputas.
- [ ] **Contabilidad:** libro inmutable de doble entrada o contabilidad equivalente con control independiente; submayores por vendedor y afiliado y conciliación con el proveedor de pagos.
- [ ] **Dinero de terceros:** no custodiar fondos sin marco legal, estructura y proveedor adecuado. Desembolsos únicamente por proveedor autorizado.
- [ ] **Antifraude:** límites, revisión de transacciones sospechosas, disputas, prevención de autopromoción abusiva, Bots y tráfico inválido.
- [ ] **Seguridad:** secretos fuera de Git, pruebas de penetración, cifrado, respaldos recuperables, monitoreo, rotación de llaves, análisis de dependencias, rate limiting y protección de API.
- [ ] **Operación:** pruebas en Windows R4, MySQL y despliegue, observabilidad, accesibilidad, recuperación de desastres y soporte a reclamaciones.
- [ ] **Piloto supervisado:** compradores y comerciantes reales voluntarios con comprobantes verificables, indicadores de **beneficio neto** (no solo ingresos brutos).

**Prohibido afirmar:** que el software está certificado, que elimina todo riesgo legal o que garantiza rentabilidad.

## C. Significado de `GET /api/integrity`

- `200` y `ok: true`: no encontró anomalías contempladas en el archivo de prueba.
- `503` y `ok: false`: hay diferencias, el prototipo bloquea nuevas escrituras.
- `productionReady: false`: **siempre falso**, incluso con integridad correcta; es un demo.

## D. Procedimiento de aceptación local

En una copia de la rama, dentro de `modules/affiliate-engine-mvp`:

```powershell
node --test engine.test.mjs http.test.mjs
```

No ejecutar un túnel Cloudflare, no publicar el puerto 3197, no ingresar cédulas ni datos bancarios. Si un test falla, no integrar a la plataforma principal ni usar el demo para capturar clientes.

## E. Historia y límites de migración

El motor anterior guardaba la referencia de origen en eventos de auditoría, pero no en la tabla de ventas. Las ventas antiguas se preservan al migrar; su `referralToken` queda nulo. No se inventan atribuciones retrospectivas a partir de registros parciales.

## F. Próximo objetivo técnico

Auditar el árbol local R4/MySQL y diseñar la separación entre `catálogo`, `identidades`, `atribución`, `órdenes`, `comisiones`, `contabilidad` y `conciliación` sin alterar Messenger, Copilot, Natalia ni los servicios de producción.
