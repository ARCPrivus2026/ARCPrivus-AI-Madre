# ARC Global Affiliate & Commerce Engine — MVP 0.6 (prueba MySQL aislada)

**Estado: demostración local.** Este módulo se creó de forma aislada en una rama; **NO está conectado** al servidor principal, no vende nada, no realiza cargos, no crea cuentas de clientes reales, no paga comisiones ni soporta acceso público.

## Objetivo
Validar un flujo mínimo y auditable de producto → afiliado → enlace de promoción → visita → venta **simulada atribuida** → reparto → reembolso simulado. Todos los datos en COP enteros.

## Ejecutar en Windows (Node 22.13+ o 24)

Desde el directorio `modules/affiliate-engine-mvp`:

```powershell
node --test *.test.mjs
node server.mjs
```

Abrir **http://127.0.0.1:3197** en el navegador de la misma computadora. Los datos de demostración se guardan en `.local-data/demo.sqlite` (no subir a Git).

## Diagnóstico de compatibilidad R4 (SOLO LECTURA)

`r4-preflight.mjs` inspecciona únicamente estructura, dependencias declaradas y nombres de scripts de la carpeta R4 indicada. No lee archivos `.env`, contraseñas, credenciales ni contenido de bases; no ejecuta software existente.

```powershell
node .\r4-preflight.mjs "D:\ARC\ARNOLRC_PRUEBA_INSTALACION_LIMPIA_FINAL_2026-09-16\ARNOLRC_R4_6_12_13_PREPUBLICACION_WINDOWS_2026-09-16"
```

Se requiere una copia de esta rama en el equipo Windows para usar esa orden. El script no autoriza la integración, incluso si devuelve `blockers: []`. Ver [R4_INTEGRATION_PLAN.md](./R4_INTEGRATION_PLAN.md).

## Prueba MySQL REAL y aislada en GitHub Actions (NO R4)

El workflow `Affiliate MVP tests` incluye un trabajo `mysql-staging-smoke` que crea un **contenedor efímero MySQL 8.4** en un corredor de GitHub. Solo existe durante la prueba y se elimina al acabar.

- Esquema temporal de prueba: `arc_affiliate_staging_ci`.
- Usuario desechable: `arc_aff_ci`, con privilegios delimitados por el contenedor a ese esquema.
- Controlador `mysql2` instalado **solamente** dentro del módulo durante la prueba.
- `mysql-staging-probe.mjs` realiza una única consulta `SELECT DATABASE(), CURRENT_USER(), 1` y libera la conexión y el pool mediante bloques `finally`.
- Una segunda comprobación revisa los permisos declarados por el servidor con `SHOW GRANTS FOR CURRENT_USER()`.
- Las pruebas simuladas verifican que no se conecta por defecto y que los recursos se cierran incluso si ocurre un error.
- No se consulta, crea ni modifica ninguna tabla del entorno ARNOLRC R4. No se usa su configuración, usuario, contraseña ni base.
- **No ejecutar una prueba de red real en Windows R4** ni habilitar `ARC_AFF_STAGING_CONNECT` en su configuración.
- El éxito en CI valida la conectividad exclusiva del contenedor; no constituye migración, prueba de carga, seguridad multiusuario ni autorización comercial.

Archivo de CI: `.github/workflows/affiliate-mvp-tests.yml`.

## Regla comercial demostrativa

Por cada venta de COP 100.000 con comisión comercial pactada de 30 %:
- COP 70.000 para el comerciante (antes de otras deducciones)
- COP 30.000 de comisión comercial, distribuidos:
  - COP 27.000 para afiliado
  - COP 3.000 para ARC (10 % de comisión, **no** de venta)
  
Los cálculos del piloto omiten impuestos, pasarelas, descuentos, retenciones, disputas, comisiones internacionales y reglas fiscales.

## API local (sin autenticación — NO exponer)

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/status` | Indica modalidad demostrativa |
| GET | `/api/integrity` | Conciliación de saldos, claves foráneas y eventos de auditoría; HTTP 503 si no cuadra |
| GET | `/api/summary` | Resumen de ventas simuladas vigentes |
| GET/POST | `/api/products` | Lista/crea productos de prueba |
| GET/POST | `/api/affiliates` | Lista/crea afiliados de prueba |
| GET/POST | `/api/referrals` | Lista/crea enlaces de afiliación de prueba (por par producto-afiliado) |
| GET | `/api/referrals/:token` | Consulta detalles del enlace (sin registrar visita) |
| POST | `/api/referrals/:token/visit` | Registra una visita simulada, sin IP/cookie |
| POST | `/api/referrals/:token/demo-sale` | Simula venta atribuida; requiere `requestId` único |
| GET | `/api/sales` | Lista hasta 100 operaciones |
| POST | `/api/demo-sales` | Simula venta con `productId`, `affiliateId`, `requestId` único |
| POST | `/api/demo-sales/:id/refund` | Revierte simulación contable |
| GET | `/api/audit` | Trazabilidad básica (no inmutable) |

## Confiabilidad, seguridad y límites

- Solo escucha en 127.0.0.1. No colocar Cloudflare Tunnel, proxy ni puerto público.
- No hay autenticación ni autorización por roles, por eso **estrictamente local**. Además, el servidor exige el host local, cuerpo JSON y bloqueo de orígenes externos para las operaciones POST; estas defensas no sustituyen controles de producción.
- No introducir nombres reales, documentos, datos bancarios ni información sensible.
- Los enlaces `/?ref=<token>` únicamente son vistas locales de prueba; **no** se deben entregar a clientes ni publicitar.
- La atribución por enlace ahora se guarda en cada venta simulada. No se permite reutilizar una misma solicitud cambiando su enlace de procedencia. Las ventas de la versión anterior conservan su registro, pero su enlace histórico puede quedar vacío.
- Cada apertura o recarga del enlace de prueba incrementa el contador; no equivale a visitantes únicos y no es una medida antifraude.
- Las visitas se cuentan sin guardar IP, user-agent, cookies ni identificadores del visitante, aunque el tráfico HTTP local sigue existiendo mientras el servidor funciona.
- El código de referencia no es una credencial ni un secreto de seguridad y no debe utilizarse como autorización de pagos.
- El registro de auditoría en SQLite es modificable por quien tiene acceso al archivo: no es todavía evidencia contable a prueba de manipulaciones.
- El motor compara saldos, referencias, eventos e integridad SQLite; cuando hay diferencias, el servidor devuelve HTTP 503 y bloquea nuevas escrituras. No se trata de un detector de fraudes completo ni de un mecanismo inviolable.
- El servidor se niega a iniciar si intentan activar flags de pagos reales; una ubicación externa de base `ARC_DEMO_DB` solo se admite con `ARC_DEMO_TEST_MODE=1` para pruebas controladas.
- No existen ventas monetarias reales, aprobación de productos ni cálculo de ganancias garantizadas.
- No se paga por reclutamiento ni por inscripción. Las cuentas de prueba no tienen saldo.
- No activar conexiones con marketplaces externos sin permisos contractuales y revisión de su modelo de comisiones.

## Camino hacia producción (NO implementado)

0. Superar las pruebas unitarias, HTTP y MySQL aislado en CI; revisar el prototipo local y completar la auditoría R4 sin publicar ni fusionar.
1. Aprobar modelo jurídico para Colombia (incluye consumidor, datos, comercio electrónico, tributación y revisión de normas sobre multinivel), contratos con vendedores y afiliados y políticas de reembolsos.
2. Implementar cuentas reales, doble factor, permisos por vendedor/afiliado/admin, antifraude, protección de datos y consentimiento.
3. Persistencia robusta MySQL/PostgreSQL con libro contable de doble entrada e historial inmutable, conciliación y pruebas de concurrencia.
4. Conectar una pasarela compatible con marketplaces; cobros confirmados solo por webhooks firmados e idempotentes; conciliación y ventanas de devoluciones.
5. Ofrecer catálogo real con moderación y evidencia de titularidad; enlaces de atribución consentidos y control de cookies.
6. Integrar Copilot/Studio IA para marketing honesto, sin afirmaciones de rentabilidad no verificadas.
7. Desplegar por fases tras pruebas de carga, accesibilidad y seguridad, auditoría externa y piloto con compradores reales.

### Pruebas de integración
La batería `http.test.mjs` levanta el servidor en un puerto local temporal y verifica interfaz, estilos CSP, bloqueo de orígenes externos, enlaces, atribución, idempotencia y reverso. **No confirma** cumplimiento legal, seguridad de producción ni ingresos reales.

Consultar también [`TRUST_CHECKLIST.md`](./TRUST_CHECKLIST.md) y [`R4_INTEGRATION_PLAN.md`](./R4_INTEGRATION_PLAN.md) para las condiciones obligatorias antes de lanzar un negocio real.

**Importante:** El proyecto del repositorio puede diferir del entorno R4 local. Este MVP no modifica ningún archivo existente del sistema principal; su integración deberá decidirse después de auditoría.
