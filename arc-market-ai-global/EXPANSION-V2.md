# ARC Market AI Global — arquitectura de expansión V2
Fecha: 2026-11-23. Rama de laboratorio; no desplegada.

## Módulos y alcance
- Catálogo multicanal: fichas propias, afiliación y coproducción, búsqueda y filtros, importación de hasta 1000 fichas por sesión en el prototipo, exportación JSON. Fuente pública no equivale a autorización ni certificación.
- Red comercial: kits de cuatro canales; borradores, no publicación. Cada afiliado debe conservar sus enlaces autorizados.
- Fábrica de productos: dos originales en products/; requieren edición, revisión profesional y entrega final antes de vender.
- Reconciliación: separar facturación, tarifas de Hotmart, comisiones, devoluciones, impuestos y costos. La función allocation calcula escenarios de reparto, no liquidaciones reales.
- Control de calidad: autorización, derechos, condiciones, revisión fechada, precio y enlace autorizado. Vencimiento del filtro preliminar a 30 días; revisión adicional ante cambios.

## Plataforma objetivo escalable (no implementada)
Node/Express, MySQL, autenticación de IA Madre y aislamiento por organización. Tablas propuestas:
- organizations, members, roles, producer_profiles, affiliate_profiles;
- products, product_versions, categories, localized_offers, evidence, commercial_authorizations;
- affiliate_links (propietario, producto, Hotlink original, vigencia), coproduction_agreements;
- campaigns, creative_versions, consent_records, publication_jobs (idempotency_key, attempts, scheduled_at, state), channel_connections;
- provider_events (unique provider/event ID), sales, commission_entries, adjustments, settlements, support_cases, audit_log.

Índices compuestos por organización/estado/categoría/id, paginación por cursor y búsqueda indexada. Nunca descargar indiscriminadamente el marketplace ni entrenar modelos con información extraída de Hotmart. Cada cuenta conecta únicamente recursos permitidos por su autorización. Los productos públicos se pueden investigar manualmente, sin copiar materiales de terceros.

API planeada: GET /catalog con cursor y filtros; POST /products; POST /products/:id/reviews; POST /campaigns; POST /campaigns/:id/approve; POST /webhooks/hotmart; GET /reports. Cada ruta debe validar autorización de organización y entradas. Secretos cifrados del lado servidor; nada de tarjetas ni credenciales en el repositorio. Webhook: autenticidad según documentación vigente, idempotencia, tratamiento de reembolsos y conciliación posterior. No asumir acceso global por una API de productos del creador.

## Ingresos
Producto propio, afiliación directa, coproducción aceptada y servicios comerciales voluntarios. No cobro por reclutamiento, no comisión universal sobre ventas de terceros, no modificar Hotlinks ajenos. Los afiliados reciben sus comisiones según las reglas y acuerdos de Hotmart. ARC puede cobrar servicios propios con términos claros, o participar como coproductor autorizado. No se afirma asociación oficial.

## Prioridad comercial
Primera cohorte: técnicos de electrodomésticos, emprendedores de servicios y confección. Validar utilidad y demanda con muestras, consultas voluntarias y canales propios. Sin publicidad pagada por defecto. Métricas: visitas medibles, clics, compras confirmadas, devoluciones, margen y satisfacción. Escalar solo cuando se prueben operación segura y economía positiva. No publicar millones de fichas duplicadas ni enviar mensajes masivos no solicitados.

## Fuentes oficiales
https://hotmart.com/es/legal/terminos-de-uso
https://developers.hotmart.com/docs/es/
https://developers.hotmart.com/docs/es/v1/product/product-list/
https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/
https://help.hotmart.com/es/article/208298448//
https://hotmart.com/es/blog/precios

## Abrir laboratorio
Abrir network.html en una copia de la rama. No requiere dependencias. Importaciones en memoria, exportar antes de salir. Los siete registros iniciales están bloqueados por falta de validación o autorización. Se verificaron once casos de lógica en network.js antes de guardar; no se verificó el navegador ni el despliegue. No hay conexión a Hotmart ni procesamiento de pagos.
