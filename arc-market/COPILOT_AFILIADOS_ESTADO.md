# Copilot de afiliados: primera base verificable

Este módulo es un planificador probado, no un operador externo desplegado.

## Ejecutado
- Evaluación conservadora de productos: evidencia de demanda con fecha y fuente, temperatura, calidad y términos de afiliación.
- Plan por producto con bloqueo explícito de datos pendientes y deduplicación.
- Preparación de piezas solo con afiliación aprobada, enlace registrado y canales permitidos, conectados y autorizados.
- Conciliación en memoria de comisiones por moneda con reversos y eventos duplicados.
- Cinco pruebas con productos y transacciones sintéticos. No son ventas reales.

## Ejecución
Node.js 20 o posterior, sin dependencias:
`node --test arc-market/copilot-affiliates.test.mjs`

Importar las funciones desde `copilot-affiliates.mjs` en el trabajador de Copilot. No se ha conectado este archivo al servidor ni al Copilot Windows: el punto de integración aún no está verificado.

## Límites deliberados
- Los umbrales 50 de temperatura, 4.5 estrellas, 30 reseñas y siete días de vigencia son criterios iniciales propios, no garantías ni recomendaciones oficiales de Hotmart.
- Las fuentes, los enlaces y la marca `verified` deben provenir de adaptadores autenticados que verifiquen los datos. El módulo puro no autentica eventos ni comprueba enlaces por red.
- No publicar la función de conciliación como endpoint sin autenticación. No usar números de coma flotante como contabilidad definitiva: antes de producción se requieren unidades monetarias menores, almacenamiento transaccional y validación de eventos por proveedor.
- El esquema de temperatura y enlace es específico de Hotmart. Otras plataformas requieren adaptadores propios.
- No hay generación de video, subida, publicación, solicitud de afiliación ni compra de anuncios implementadas aquí.
- No hay tareas programadas ni proceso permanente en ejecución.
- Presupuesto pagado: cero. Falta definir límite total autorizado y controles de gasto antes de conectar anuncios.

## Pendientes de conexión
1. Sesión o integración autorizada de Hotmart; verificar una vía admitida para solicitar afiliaciones. No se ha encontrado un endpoint oficial que permita ese trámite.
2. Condiciones de cada programa y aceptación del titular cuando corresponda. La aprobación del productor es externa a Copilot.
3. Proveedor de generación audiovisual, derechos de materiales y revisión de afirmaciones.
4. Cuentas de publicación autorizadas y adaptadores oficiales con confirmación externa de cada publicación.
5. Almacenamiento duradero, cola de trabajos con reintentos e idempotencia, conciliación de ventas y presupuesto compartido entre campañas.

## Candidatos investigados, todavía no habilitados
- Hot Jamin: S58727098T e I105823195X son fichas distintas; verificar cuál corresponde al programa de afiliación vigente. Página de proceso: https://hotjamin.com/nuevos-afiliados . Solicita afiliación en Hotmart, entrenamientos y cuestionario; no se ha completado el proceso ni verificado comisión o temperatura.
- Peluquería para Perros: S42352485X.
- Educanino: P14487113J.
- Crea Accesorios de RESINA: V72822115Y.

Las valoraciones públicas no certifican ventas recientes. Ninguno se debe importar como afiliación aprobada o producto validado automáticamente.

La activación de ventas del producto propio ARC-TEC-001 en Hotmart no demuestra una conexión del motor ARC con Hotmart.
