# Conectar la cuenta existente de Hotmart a ARC Market AI

## Cuenta ya identificada
- Usuario registrado en Hotmart el **11 de septiembre de 2026**. Acceso con Google.
- Credencial previa: **ARC PRIVUS COMMERCE** (no guardar ni compartir secretos en GitHub).
- La integración Hotmart anterior del entorno Windows R4 puede seguir existiendo **en el PC local**. Este repositorio no ha podido demostrar que la instancia remota esté conectada.
- **No se ha creado un checkout** ni activado ventas desde esta rama.

## Receptor seguro (aislado del resto de ARC)
Archivo: `arc-market/hotmart-webhook.mjs`. Usa Node.js 20+ y solo módulos nativos. Acepta POST `/integrations/hotmart/v2` con el encabezado `X-HOTMART-HOTTOK`, versión 2.0.0 y eventos permitidos. Deduplica por id y registra únicamente información mínima, sin datos personales de compradores. No acredita dinero automáticamente; una compra aprobada no es ingreso disponible neto.

Para levantar en un entorno autorizado y protegido por HTTPS:
```powershell
$env:HOTMART_HOTTOK="(guardar secretamente el hottok obtenido en Hotmart, NUNCA en el repositorio)"
$env:ARC_MARKET_DATA_DIR="D:\ARC_DATA\market_hotmart"
$env:ARC_MARKET_WEBHOOK_PORT="3338"
node arc-market/hotmart-webhook.mjs
```
Exponer **solo** el endpoint del webhook detrás de proxy/Túnel HTTPS con controles y registros. No publicar el puerto directamente. Evitar almacenar secretos en scripts visibles. La configuración anterior no implica que estos valores existan en el entorno actual.

## Pasos en cuenta REAL
1. Entrar a https://app.hotmart.com/ por el método Google usado anteriormente. Completar la sección pendiente de datos comerciales/fiscales si el panel lo pide.
2. Ir a **Productos > Mis productos**. Comprobar si existe algún producto del propio ARC; no asumir que sí.
3. Crear producto digital de ARC-TEC-001 y verificar el contenido técnicamente antes de subirlo. Registrar el precio definitivo, garantía y entrega.
4. Copiar **el enlace oficial de checkout** publicado por Hotmart y sustituir el botón de consulta de la landing. No inventar URL de pago.
5. En **Herramientas > Webhook** obtener el `Hottok` por canal seguro y registrar la URL HTTPS pública que termine en `/integrations/hotmart/v2`. Elegir versión 2.0.0 y eventos compra aprobada, devolución y contracargo. Probar eventos sin considerar pruebas como ventas reales.
6. En **Herramientas > Programa de Afiliados** configurar las comisiones de ARC, materiales y condiciones de aprobación. La sugerencia de 25 % está pendiente de comprobar costos, impuestos y margen real.
7. Hacer una compra de prueba autorizada, validar entrega, reversos y conciliación en el panel real antes de anunciar que el sistema está activo.

## Importante
No copiar tokens, códigos de verificación, Hottok ni Client Secret a chats, archivos públicos, documentación o capturas. Si el equipo anterior sigue apagado, no depender de sus procesos locales. Esta rama no toca `server.js`, MySQL, Messenger ni Natalia.

Fuentes:
- https://developers.hotmart.com/docs/es/2.0.0/webhook/purchase-webhook/
- https://developers.hotmart.com/docs/en/start/app-auth
- https://help.hotmart.com/es/article/210874788/-como-configurar-y-gestionar-mi-programa-de-afiliados-
