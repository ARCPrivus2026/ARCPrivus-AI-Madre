# ARC Market V3 — Activación comercial y primera venta
Fecha: 23 de noviembre de 2026. Código en rama de desarrollo, sin despliegue comercial verificado.

## ARC-TEC-001 — ficha comprobada
https://hotmart.com/es/marketplace/productos/diagnostico-practico-de-neveras-no-frost-y-lavadoras-arc/Y108383080U
Enlace de divulgación previamente compartido por el titular del proyecto: https://go.hotmart.com/Y108383080U
No fue posible verificar el destino actual del Hotlink ni realizar un pago. Antes de usarlo en campañas, abrirlo en sesión privada, comprobar nombre del producto, identidad del vendedor, precio y entrega. No hacer compras de prueba reales sin autorización específica.
La página academy.html dirige a la ficha pública y no contiene cobro propio. Publicar en hosting autorizado una vez probada. No modificar la página raíz.

## Campaña orgánica lista (difusión solo en canales propios autorizados)
### WhatsApp — estado
¿Reparas neveras No Frost o lavadoras y quieres organizar mejor tus diagnósticos? ARC Privus Academy ofrece una guía introductoria en PDF de 6 páginas con cinco casos orientativos y herramientas para registrar síntomas, hipótesis y evidencias. Consulta contenido y precio vigente en Hotmart:
https://hotmart.com/es/marketplace/productos/diagnostico-practico-de-neveras-no-frost-y-lavadoras-arc/Y108383080U

### Facebook — publicación educativa
Una nevera que enfría arriba pero no abajo no necesariamente tiene falta de gas. Antes de concluir, registra temperaturas, condiciones de uso y posibles obstrucciones visibles. En ARC Privus Academy encontrarás una guía introductoria de diagnóstico para estudiantes y técnicos en formación. Incluye cinco casos orientativos y una matriz de evidencias. No es un curso completo ni asesoría personalizada.
Consulta detalles y precio vigente: https://hotmart.com/es/marketplace/productos/diagnostico-practico-de-neveras-no-frost-y-lavadoras-arc/Y108383080U

### Reel — guion de 25 segundos
¿Tu lavadora lava, pero no centrifuga? Un solo síntoma no confirma una tarjeta dañada. Registra si queda agua, el código de error y la etapa donde se detiene. En ARC Privus Academy tenemos una guía introductoria de diagnóstico de neveras y lavadoras, con casos orientativos. Consulta el contenido en Hotmart.
Mostrar solo material propio y demostraciones seguras. Sin testimonios fabricados ni promesas de resultados.

### Ciclo inicial
Día 1: publicar estado y post, cuando el destino esté revisado.
Día 2: publicar Reel educativo.
Día 3: responder consultas recibidas voluntariamente, sin mensajes masivos.
Día 4–7: revisar clics, preguntas y compras confirmadas; ajustar texto según interés real.
Registrar por separado cada canal. Cero presupuesto de anuncios. No asumir que un clic es una venta.

## Servidor inicial
server.mjs: Express aislado, verifica X-HOTMART-HOTTOK mediante comparación de hash en tiempo constante; limita JSON a 128 KB; registra solo datos mínimos del evento y deduplica por cuenta/evento. No almacena compradores. Reporte protegido por token. Los conteos son eventos, no ingresos. Faltan conciliación API, autenticación multicuenta, pruebas de HTTP/MySQL y seguridad de despliegue.

### Configuración local
Desde CMD, en la copia de la rama, verificar Node y dependencias instaladas del proyecto. Ejecutar schema.sql con una cuenta MySQL administradora en una base dedicada; crear usuario con privilegios mínimos. Proporcionar por entorno seguro ARC_MARKET_DB_HOST, ARC_MARKET_DB_USER, ARC_MARKET_DB_PASSWORD, ARC_MARKET_DB_NAME, ARC_MARKET_HOTTOK, ARC_MARKET_ACCOUNT_ID, ARC_MARKET_REPORT_TOKEN (aleatorio, mínimo 32 caracteres); opcional ARC_MARKET_PORT (3215). Nunca pegar valores en chat o GitHub. Arrancar:
node --input-type=module -e "import('./arc-market-ai-global/server.mjs').then(m=>m.startMarket()).catch(()=>{console.error('Configuración o conexión fallida');process.exitCode=1})"
Probar /health local. No exponer /reports a internet. Para producción: TLS, proxy solo para POST /webhooks/hotmart, límites de tráfico, gestión de secretos y validación de entrega de evento desde el panel Hotmart. No habilitar hasta que se comprueben pruebas de reintento, duplicado, fallo DB, credencial inválida y reembolso. Conciliar con API de historial y comisiones antes de registrar ingresos.

Documentación: https://developers.hotmart.com/docs/es/2.0.0/webhook/purchase-webhook/ y https://developers.hotmart.com/docs/es/v1/sales/sales-history

## Pendientes
No se han publicado anuncios en redes ni se ha realizado un despliegue. Ocho casos de normalización del evento superados antes de subir código; falta ejecutar integración real. No se ha verificado ninguna venta. No hay conexión autenticada de Hotmart disponible en esta sesión.
