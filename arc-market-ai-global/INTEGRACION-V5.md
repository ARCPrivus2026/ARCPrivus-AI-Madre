# V5 — Reconciliación local de solo lectura
Fecha: 2026-11-24. Laboratorio, sin despliegue.

- hotmart-reconciliation-v5.mjs contrasta el informe normalizado de ARC_MARKET_SYNC_V4.cjs con el catálogo V4: ID, nombre, estado ACTIVE, garantía, ausencia de errores y antigüedad máxima de 24 horas.
- run-reconciliation-v5.mjs produce exclusivamente informes nuevos en una carpeta local. Ante un fallo de identidad o datos desactualizados no genera catálogo de vista previa. Los importes de ventas y comisiones se limitan al informe privado; no son saldo disponible, beneficio neto ni ventas atribuidas a una campaña.
- No valida precios/ofertas, disponibilidad de afiliación ni saldos retirables. El envío automático permanece deshabilitado. No usa credenciales de proveedores ni realiza peticiones externas.
- La cuota introducida por CLI es únicamente una hipótesis de planificación. No acredita el límite real de Metricool.

## Pruebas
Se recuperaron de GitHub los módulos V4 y el runner; se ejecutaron las funciones y el runner con un sistema de archivos y proceso simulados. 8 + 14 comprobaciones propias, 7 por cada uno de dos escenarios de exportación y 3 entradas inválidas rechazadas. Se añadieron 17 pruebas de reconciliación y 8 comprobaciones del constructor V5 con informes de ejemplo. No son pruebas de extremo a extremo contra Hotmart, Windows ni Metricool.

## Prueba local
Ejecutar el sincronizador previo ARC_MARKET_SYNC_V4.cjs desde la raíz de la instalación autorizada. Usar el JSON recién generado, no el HTML, como entrada al runner V5:
```
node run-reconciliation-v5.mjs "RUTA_AL_INFORME.json" 2026-12 0
```
El 0 solo representa un supuesto de planificación. Revisar el resultado y no publicar archivos PRIVADO ni VISTA_PREVIA_NO_PUBLICAR. La tienda vigente no se toca.
La activación real y la conexión con el motor multimedia quedan pendientes de validación local y de autorización de publicación.
