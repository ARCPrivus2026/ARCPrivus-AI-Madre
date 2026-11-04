# ARC Global Affiliate & Commerce Engine — MVP 0.1

**Estado: demostración local.** Este módulo se creó de forma aislada en una rama; **NO está conectado** al servidor principal, no vende nada, no realiza cargos, no crea cuentas de clientes reales, no paga comisiones ni soporta acceso público.

## Objetivo
Validar un flujo mínimo y auditable de producto → afiliado → venta **simulada** → reparto → reembolso simulado. Todos los datos en COP enteros.

## Ejecutar en Windows (Node 22.13+ o 24)

Desde el directorio `modules/affiliate-engine-mvp`:

```powershell
node --test engine.test.mjs
node server.mjs
```

Abrir **http://127.0.0.1:3197** en el navegador de la misma computadora. Los datos de demostración se guardan en `.local-data/demo.sqlite` (no subir a Git).

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
| GET | `/api/summary` | Resumen de ventas simuladas vigentes |
| GET/POST | `/api/products` | Lista/crea productos de prueba |
| GET/POST | `/api/affiliates` | Lista/crea afiliados de prueba |
| GET | `/api/sales` | Lista hasta 100 operaciones |
| POST | `/api/demo-sales` | Simula venta con `productId`, `affiliateId`, `requestId` único |
| POST | `/api/demo-sales/:id/refund` | Revierte simulación contable |
| GET | `/api/audit` | Trazabilidad básica (no inmutable) |

## Protección

- Solo escucha en 127.0.0.1. No colocar Cloudflare Tunnel, proxy ni puerto público.
- No hay autenticación, autorización por roles ni prevención de acceso indebido, por eso **estrictamente local**.
- No introducir nombres reales, documentos, datos bancarios ni información sensible.
- El registro de auditoría en SQLite es modificable por quien tiene acceso al archivo: no es todavía evidencia contable a prueba de manipulaciones.
- No existen ventas monetarias reales, aprobación de productos ni cálculo de ganancias garantizadas.
- No se paga por reclutamiento ni por inscripción. Las cuentas de prueba no tienen saldo.
- No activar conexiones con marketplaces externos sin permisos contractuales y revisión de su modelo de comisiones.

## Camino hacia producción (NO implementado)

1. Aprobar modelo jurídico para Colombia (incluye consumidor, datos, comercio electrónico, tributación y revisión de normas sobre multinivel), contratos con vendedores y afiliados y políticas de reembolsos.
2. Implementar cuentas reales, doble factor, permisos por vendedor/afiliado/admin, antifraude, protección de datos y consentimiento.
3. Persistencia robusta MySQL/PostgreSQL con libro contable de doble entrada e historial inmutable, conciliación y pruebas de concurrencia.
4. Conectar una pasarela compatible con marketplaces; cobros confirmados solo por webhooks firmados e idempotentes; conciliación y ventanas de devoluciones.
5. Ofrecer catálogo real con moderación y evidencia de titularidad; enlaces de atribución consentidos y control de cookies.
6. Integrar Copilot/Studio IA para marketing honesto, sin afirmaciones de rentabilidad no verificadas.
7. Desplegar por fases tras pruebas de carga, accesibilidad y seguridad, auditoría externa y piloto con compradores reales.

**Importante:** El proyecto del repositorio puede diferir del entorno R4 local. Este MVP no modifica ningún archivo existente del sistema principal; su integración deberá decidirse después de auditoría.
