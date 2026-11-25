# Biblioteca ARNOL RC — integración V1
Estado: laboratorio aislado. No hay ruta montada, migración, despliegue ni acceso real de alumnos.

## Componentes
- academy-center-v1.html: seis fichas propias, dos enlaces de venta autorizados, seis prácticas gratuitas y enlace a la tienda existente. No incluye archivos comerciales ni credenciales.
- academy-access-v1.mjs: política de compra por cuenta, estudiante y producto. Exige registro individual conciliado por un adaptador autorizado, identidad vinculada, estado COMPLETE, sin disputa ni revocación y evidencia reciente (máximo 1 hora). Estado interno normalizado, no asumir equivalencia directa con un campo de webhook.
- academy-library-v1.mjs: servicio de lectura con adaptadores inyectados para autenticación y búsqueda de compras verificadas. No recibe identificadores de estudiante del cliente ni concede archivos. Ante fallos devuelve estado bloqueado.

## Contrato previo al montaje
1. Revisar el mecanismo real de sesión del backend ARNOL RC y aplicar autorización por cuenta y estudiante en servidor. Nunca aceptar authenticated, identityVerified, estado de compra o cuenta desde un cuerpo de petición del navegador.
2. Vincular una compra a un usuario únicamente mediante un procedimiento autorizado que compruebe la identidad de comprador y el control de la cuenta; un código de transacción, correo escrito o captura no bastan. No divulgar datos de compradores.
3. Obtener la comprobación individual vigente a través de una integración de Hotmart autorizada. Los informes V6 agregados no sirven para conceder accesos. Los eventos existentes en arc_market_provider_events no contienen una vinculación verificada con el estudiante. No deducir titularidad ni vigencia de un único evento. Ante reembolso, disputa, datos antiguos o incongruencia bloquear y conciliar.
4. Diseñar almacenamiento separado para la vinculación y revocación, con control de acceso, retención mínima, eliminación y auditoría. Validar consultas parametrizadas y aislamiento entre cuentas antes de cualquier migración.
5. Montar una ruta autenticada de solo lectura con Cache-Control: no-store, TLS, límites de solicitudes y protección de sesión. El reloj y las dependencias deben venir del servidor. El token de ejemplo en pruebas no es una credencial.
6. Por ahora Hotmart es el canal de entrega. No alojar PDF/XLSX/ZIP de pago en páginas públicas ni emitir enlaces directos de descarga. La entrega propia futura requiere permisos de distribución y un sistema de autorización y revocación probado.
7. Ejecutar pruebas de integración real en Windows, con cuentas de prueba autorizadas, incluyendo expiración, cancelación, reembolso, concurrencia, fallos del proveedor y revisión de privacidad. Solo después solicitar aprobación para un despliegue separado.

## Pruebas ejecutadas
22 comprobaciones de política y 12 del servicio con adaptadores simulados; no se ejecutaron peticiones HTTP de producción ni consultas MySQL reales. El enlace de la academia a la tienda se agregó en la rama de desarrollo. No se modificó Cloudflare, Hotmart, campañas ni servidor principal. No se generaron gastos.
