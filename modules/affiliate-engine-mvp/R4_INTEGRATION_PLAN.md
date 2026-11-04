# Plan de integración segura ARC Affiliate ↔ ARNOLRC R4

**Fecha de revisión:** 2026-11-04  
**Estado:** preparado para evaluar compatibilidad. **NO conectado a R4.** No hay pagos, clientes reales ni autorización para publicar.

## Sistemas a conservar

- ARNOLRC R4 (referencia de trabajo del usuario): Windows, Node.js 24, servicio local conocido por puerto 3100, base de datos MySQL de staging.
- Motores existentes: Messenger, Copilot, IA Madre, Studio audiovisual, Natalia, comunicaciones voz/video TURN, SMTP y Cloudflare Tunnel.
- Este MVP: servicio **aislado** que, cuando se abre manualmente, atiende solo `127.0.0.1:3197` y usa **su propio archivo de simulación SQLite**.
- La documentación de `main` no equivale a una auditoría del árbol R4: el repositorio incluye archivos SQLite y código heredado, mientras que el entorno del usuario usa MySQL en staging. **No asumir equivalencia de árboles.**

## Reglas que no se pueden romper

1. No cambiar `server.js`, `package.json`, `config/db.js`, `database/db.js` ni la configuración de producción/R4 desde esta rama.
2. No importar el servidor de afiliados dentro del arranque de Messenger, IA Madre o Copilot; no reservar el puerto 3100.
3. No reutilizar contraseñas, sesiones, cuentas, API keys ni conexiones de base de datos de otros módulos. Hacer primero una auditoría de autenticación; no compartir sesiones heredadas.
4. No alterar tablas MySQL existentes, hacer migraciones, transferir registros personales ni iniciar pagos en esta etapa.
5. No exponer el prototipo SQLite por Cloudflare Tunnel, Vercel, proxies, rutas públicas ni red local.
6. La variable de activación comercial debe **permanecer desactivada**. Integrar identidad, pagos, antifraude y conciliación solo después de cumplir `TRUST_CHECKLIST.md`.
7. Los enlaces de demo no pueden anunciarse como enlaces que cobran o remuneran en dinero real.

## Secuencia de integración, por puertas

### Puerta 0 — Auditoría de solo lectura (se permite ahora)
`r4-preflight.mjs` lee *solo* `package.json` y metadatos de rutas concretas. No lee `.env`, claves, correos, contraseñas ni tablas MySQL. No ejecuta comandos del proyecto ni abre puertos.

Ejemplo de uso cuando el repositorio con esta rama esté disponible en Windows:

```powershell
node .\modules\affiliate-engine-mvp\r4-preflight.mjs "D:\ARC\ARNOLRC_PRUEBA_INSTALACION_LIMPIA_FINAL_2026-09-16\ARNOLRC_R4_6_12_13_PREPUBLICACION_WINDOWS_2026-09-16"
```

El informe JSON `integrationEnabled: false` es deliberado. Una salida sin `blockers` **no significa que la integración sea segura**; solo que hay estructura mínima para una siguiente auditoría.

### Puerta 1 — Pruebas
- GitHub Actions debe mostrar resultado `success` para el commit exacto que se pretenda integrar.
- Reproducir la batería en Node 24 de Windows y validar carga, reinicio, respaldos de la base **de prueba**, y revertir sin pérdida.
- Levantar R4 de forma separada en staging solo cuando la inspección del proyecto sea satisfactoria; comprobar que el MVP no interactúa con él.

### Puerta 2 — Contrato de integración SIN conexión operativa
- Diseñar contratos versionados `catalog`, `affiliate`, `attribution`, `order`, `commission`, `reconciliation`, y `audit`.
- Crear interfaz de servicio interna con autenticación fuerte propia, separación por roles y ambiente, y desactivación rápida, **no** una dependencia directa en el servidor principal.
- Definir esquema MySQL nuevo y aislado en staging, **sin ejecutar migraciones en R4**.
- Redactar políticas comerciales y revisar obligaciones en Colombia antes de registrar clientes.

### Puerta 3 — Piloto real (aún prohibido)
- Solo con revisión jurídica y contrato de proveedor de pagos apto para marketplace.
- Confirmaciones exclusivamente desde el proveedor de pago por webhook firmado, reconciliado e idempotente.
- Separar comisiones devengadas, retenidas, liberadas, revertidas y pagadas; controles de disputas y fraude.
- Auditabilidad y protección de información personal, validación independiente y métricas netas (no promesas de rentabilidad).

## Criterios de reversibilidad

- Antes de habilitar integración: **cero modificaciones** del servidor R4 y MySQL existente; cerrar el proceso local termina la prueba sin afectar ningún motor.
- Para futuras integraciones: cada cambio requerirá revisión, respaldo, rama propia, pruebas, y un plan de reversión documentado.
- Un fallo de los módulos comerciales nunca debe apagar Messenger, Copilot, Natalia ni audio/video.

## Puntos de bloqueo detectados en revisión de código de `main`

Se observaron implementaciones de servidor y mecanismos de acceso heterogéneos; no existe todavía validación técnica de que la versión de GitHub sea idéntica al entorno R4 activo. Es obligatorio revisar la seguridad de la autenticación **antes de reutilizarla** para afiliados o pagos.

## Estado de CI observado

El pipeline de GitHub Actions fue creado pero sus trabajos permanecían **`queued`**, con `runner_id: null`, sin conclusiones. El estado de Vercel por sí solo no certifica estas pruebas. Se redujeron eventos duplicados y se configuró cancelación de ejecuciones obsoletas; todavía se requiere resultado final verificable.
