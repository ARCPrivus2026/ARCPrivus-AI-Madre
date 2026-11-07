# ARC Affiliate & Commerce Engine — Puertas de confianza (MVP 1.5)

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

## A.2. Identidad y sesiones simuladas — MVP 0.9

**Todo lo siguiente aplica únicamente al esquema MySQL efímero de GitHub Actions.** No está habilitado como servicio web ni como autenticación para clientes.

| Control | Estado |
|---|---|
| Contraseñas ficticias derivadas con `scrypt` y sal por cuenta | Implementado en código CI-only |
| Tokens aleatorios y hash persistido en la base | Implementado en código CI-only |
| Expiración de sesión a los 15 minutos | Implementado en código CI-only |
| Cierre de sesión y revocación al desactivar la cuenta | Implementado en código CI-only |
| Bloqueo temporal tras cinco intentos fallidos | Implementado en código CI-only |
| Identidad de actor derivada de sesión para permisos por pedido | Implementado en código CI-only |
| Login real, MFA, HTTPS, cookies y CSRF | **NO implementados** |
| Rate limiting por IP, supervisión de ataques, verificación de email | **NO implementados** |
| Revisión de seguridad / pruebas de penetración | **NO realizadas** |

La presencia de hashes, contraseñas o sesiones en un demo **no significa autenticación lista para producción**. Está prohibido conectar `mysql-staging-identity.mjs` al servidor web o a R4 antes de una auditoría independiente y de implementar controles de protección web.

## A.3. Segunda verificación de administradores — MVP 1.0

| Protección del laboratorio | Estado |
|---|---|
| Contraseña sola no autoriza `SIM_ADMIN` | Aprobado en CI real |
| TOTP de 6 dígitos por ventana de 30 segundos | Aprobado con vector RFC 6238 |
| Cifrado autenticado AES-256-GCM de semilla en MySQL | Aprobado en pruebas |
| Antirrepetición transaccional de código TOTP | Aprobado en CI real |
| Sesión administrativa exige `mfa_verified=1` | Aprobado en CI real |
| Rotación de semilla revoca sesiones antiguas | Aprobado en CI real |
| Códigos ausentes o inválidos cuentan para bloqueo | Aprobado en CI real |
| MFA de comerciantes y afiliados | **NO implementado** |
| WebAuthn resistente a phishing y recuperación segura | **NO implementados** |
| Exposición pública / credenciales reales / pagos | **NO autorizados** |

La clave de cifrado se crea de forma efímera en el propio proceso de pruebas. Su gestión, rotación y respaldo seguros no están resueltos para operación real. El código de inscripción de usuarios simulados **no valida identidad fuera del proceso de CI**. Un atacante con acceso a las contraseñas y al código TOTP en tiempo real podría suplantar una sesión; WebAuthn y una arquitectura de servidor web deben evaluarse antes de producción.

Referencia de CI: [run 41946428282](https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/actions/runs/41946428282), 46 + 23 ejecuciones de pruebas aprobadas, 0 fallidas en el commit previo a documentación final. Se comprueba bloqueo tras cinco TOTP erróneos y antirrepetición ante dos intentos concurrentes.

## A.4. Aserciones firmadas tipo WebAuthn — MVP 1.1

| Control de CI aislado | Estado |
|---|---|
| Desafío aleatorio, hash persistido y vinculación a sesión | Verificado con MySQL 8.4 de prueba |
| `clientDataJSON`: origen, tipo, desafío, contexto cruzado | Probado con aserciones firmadas sintéticas |
| `rpIdHash`, banderas UP y UV, firma ES256 | Probado con claves P-256 efímeras |
| Contador positivo creciente y prohibición de reutilizar desafío | Verificado en CI |
| Rechazo de firmas desde origen de suplantación | Verificado en CI |
| Reembolso simulado exige contraseña + TOTP + aserción firmada | Verificado en CI |
| Registro WebAuthn real mediante navegador/dispositivo | **NO implementado** |
| Autenticadores sincronizados, contador cero y extensiones | **NO soportados** |
| MFA real, recuperación segura, HTTPS/CSRF, rate limiting por IP | **NO implementados** |
| Pruebas de seguridad independiente y producción | **NO autorizadas** |

La semilla TOTP y clave privada P-256 solo aparecen en los procesos de prueba. El origen `affiliate.example.test` es un dominio ilustrativo, no un servicio que pertenezca a la plataforma. El subconjunto criptográfico no sustituye una implementación WebAuthn mantenida y auditada. Se requiere un sistema de aprovisionamiento seguro de claves y una autenticación vinculada a sesiones reales antes de abrir una interfaz pública.

Referencia de pruebas: [run 42370688792](https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/actions/runs/42370688792), 51 + 27 ejecuciones exitosas, 0 fallidas. Sin acceso a ARNOLRC R4.

## A.5. Registro y autenticación con biblioteca WebAuthn — MVP 1.2

| Control en laboratorio MySQL 8.4 | Estado |
|---|---|
| Uso real de biblioteca mantenida `@simplewebauthn/server` versión fijada | Incorporado |
| Generación oficial de opciones de inscripción y autenticación | Incorporado |
| Verificación criptográfica por biblioteca de registro CBOR sintético | Comprobado en CI |
| Verificación por biblioteca de firma de autenticación sintética | Comprobado en CI |
| Vinculación de RP ID/origen y desafíos a una sesión ficticia | Comprobado en CI |
| Expiración y un solo uso por desafío con bloqueo transaccional | Comprobado en CI |
| Requisito WebAuthn previo para inscripción de una segunda clave | Comprobado en CI |
| Reinicio de autorización de operación sensible tras inscribir otra clave | Comprobado en CI |
| Contrato inyectable para navegador con `@simplewebauthn/browser` | Solo adapter + mocks |
| UI y endpoints de navegador realmente operativos | **NO implementados** |
| Prueba con dispositivo/biometría/llave física real | **NO realizada** |
| HTTPS público, gestión de sesiones/cookies/CSRF y control IP | **NO implementados** |
| Almacenamiento definitivo, recuperación y múltiples usuarios reales | **NO implementados** |
| Pruebas de penetración, conformidad y auditoría externa | **NO realizadas** |

Solo se usan el RP ID `localhost` y el origen `http://localhost:3198` para ilustrar un futuro sitio de pruebas local. **No se inició un servidor en ese puerto ni se instaló el módulo en ARNOLRC R4.**

La evidencia de la biblioteca es un conjunto de registros y firmas fabricados en memoria, verificados con su implementación real, más pruebas contra MySQL. **No acredita la experiencia del usuario en navegador, compatibilidad de dispositivos físicos, accesibilidad ni preparación productiva.** Se mantiene prohibida la conexión a dinero real y la fusión automática de la rama.

## A.6. Aprobación WebAuthn por pedido — MVP 1.3 (solo CI)

| Control de seguridad en simulación | Estado |
|---|---|
| Desafío con sesión y pedido concreto en MySQL | Implementado y bajo pruebas |
| Autorización válida durante un máximo de 60 segundos | Implementado y bajo pruebas |
| Rechazo de uso en pedido diferente o bajo firma inválida | Implementado y bajo pruebas |
| Uso único del permiso en la misma transacción InnoDB que el reembolso | Implementado y bajo pruebas |
| Dos reembolsos simultáneos con un mismo permiso | Bajo pruebas, solo uno debe aceptarse |
| Error inyectado tras consumir permiso: rollback de permiso y pedido | Bajo pruebas |
| Preflight inerte de navegador y origen `http://localhost:3198` | Implementado, sin conexión ni credenciales |
| Prueba WebAuthn en navegador/dispositivo físico | **NO realizada** |
| Garantía de acceso por *todos* los métodos internos del pool | **NO**, existen métodos internos CI directos |
| Backend HTTP de identidad con cookies/CSRF/rate limit/controles de IP | **NO implementado** |
| Producción, cobros y reembolsos financieros reales | **PROHIBIDOS** |

Las pruebas limitan su garantía a la fachada protegida `MysqlStagingIdentity.refundOrder()`. **Un usuario que pudiera llamar directamente a los objetos de almacenamiento internos o al pool MySQL eludiría estas validaciones**, por lo que es imprescindible mantenerlos inaccesibles al exterior y realizar un diseño de privilegios de base de datos y servidor antes de producción.

La vinculación criptográfica del desafío al pedido se hace de manera **servidor-lateral** mediante su asociación persistente con el pedido; todavía hace falta una interfaz confiable que muestre al administrador el pedido exacto antes de aprobarlo. No se ha demostrado resistencia total contra engaños del usuario ni comprometimiento de sesión.

## A.7. Laboratorio local de passkeys — MVP 1.4

| Control | Estado |
|---|---|
| Servidor de demostración opt-in exclusivo de `127.0.0.1:3198` | Implementado, no ejecutado en Windows R4 |
| Interfaz en español con identificador, valor y comisiones ficticias | Implementada |
| Confirmación visual previa de un pedido concreto | Implementada en UI |
| Registro WebAuthn de laboratorio voluntario y explícito | Implementado; sin prueba de dispositivo físico |
| Doble confirmación visible del reembolso SIMULADO | Implementada en UI |
| Restricción del backend por Host, Origin y clave temporal | Implementada |
| CSP, no-cache, antiframing y tamaño de solicitudes limitado | Implementado |
| Biblioteca `@simplewebauthn/browser` servida desde el módulo | Implementado (sin CDN externo) |
| Prueba HTTP de firmas sintéticas y expiración | Automática en CI aislado |
| Dispositivo físico / lector biométrico probado | **NO** |
| Autenticación humana real, login, recuperación, cookies seguras | **NO** |
| Inmunidad ante un proceso local malicioso o sesión comprometida | **NO** |
| Dinero, reembolso bancario, pagos y habilitación comercial | **PROHIBIDOS** |

El servidor local usa una clave aleatoria temporal, no una sesión de usuario autenticada. En caso de iniciar voluntariamente un ensayo real de passkeys, el dispositivo o gestor del navegador podría guardar un registro para `localhost`. Cerrar el servidor borra el estado del laboratorio, pero no borra por sí mismo las credenciales del dispositivo.

**No arrancar esto en el entorno R4 de producción/pruebas vigentes, no abrir puertos de LAN/WAN y no enlazar Cloudflare Tunnel.** Debe operarse en una máquina aislada, con revisión técnica, consentimiento y sin datos reales.

## A.8. Catálogo promocional y campañas locales — MVP 1.5

| Componente comercial | Estado |
|---|---|
| Tres propuestas editoriales de diagnóstico de No Frost, lavadoras y asesoría | BORRADORES de laboratorio |
| Precio y comisión configurados | Valores ficticios, no aprobados comercialmente |
| Fichas con titular, público, resumen y puntos de contenido | Implementadas en SQLite local |
| Control de versiones para impedir sobreescritura editorial | Implementado y comprobado |
| Landing de prueba por token de afiliación | Implementado, solo localhost |
| Borrador de texto promocional orgánico | Implementado; nunca publicado automáticamente |
| Visitas de prueba, ventas simuladas, reembolsos y totales por token | Comprobados; no hay compradores reales |
| Entrega automática del contenido digital terminado | **NO implementada** |
| Programa de afiliados real con contratos, identidad y pagos | **NO implementado** |
| Información legal, garantías, privacidad, impuestos y facturación aprobados | **NO implementados/verificados** |
| Plataforma de cobro real o cuenta Hotmart conectada | **NO implementada ni verificada** |
| Publicación de páginas, campañas reales o anuncios | **NO autorizada** |
| Soporte postventa y capacidad de asesoría remota | **Pendiente de definir/validar** |

La tabla SQLite `marketing_drafts` es completamente independiente del MySQL del servidor R4. Los valores de `marketing.overview()` derivan de eventos de **prueba**, no de compradores, depósitos bancarios o datos de publicidad real. El cociente de pedidos ficticios por 100 visitas no puede usarse para afirmar una tasa de conversión real.

La prueba HTTP integral valida borradores, enlace, conteo de visitas, venta simulada y reversión, sin cambiar R4. La aprobación del código **no representa aprobación de lanzamiento comercial**; deben satisfacerse los controles de entrega, cumplimiento, pagos y atención al comprador antes de cualquier anuncio o cobro.

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
