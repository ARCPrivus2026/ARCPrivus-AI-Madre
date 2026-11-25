# V4 — Integración comercial aislada
Fecha: 2026-11-24. Estado: laboratorio. No desplegado.

## Componentes
- commerce-pipeline-v4.mjs: inventario de 2 productos propios, 3 afiliaciones y 3 candidatos; catálogo filtrado y generador por plantillas.
- review-evidence-v4.json: evidencia fechada y pendientes. Ante discrepancias de identidad, usar este registro y mantener bloqueado.
- campaign-dec-v4.json: 10 borradores editoriales específicos para cinco redes, con cuatro guiones de video y dos briefs de imagen. No están programados. Los borradores editoriales son independientes del generador por plantillas.
- delivery-guard-v4.mjs: control de entrega manual de borradores, cuota comprobada, revisión y multimedia, deduplicación y parada por defecto.
- run-commerce-v4.mjs: genera una vista previa HTML, JSON público y archivos de auditoría separados. No usa API ni inicia un servidor.

## Prueba local (en una copia de esta rama, no en producción)
Con Node.js, desde arc-market-ai-global: `node run-commerce-v4.mjs 2026-12 0`.
El cero es un supuesto de planificación, no consumo confirmado de Metricool. La cuota debe permanecer no verificada y la entrega bloqueada. No publicar la carpeta PRIVADO. La vista HTML no reemplaza el sitio Pages.
Las 8 pruebas del generador y 14 pruebas de lógica del guard se ejecutaron en un entorno JavaScript antes de guardar sus respectivas funciones. Falta ejecutar el runner completo en Node/Windows.

## Contrato de integración futura
1. Adaptador local del backend autorizado: leer los productos propios con credenciales ya configuradas; nunca copiarlas a estos archivos ni a la tienda.
2. Resolver identidad, destino de HotLink, temario, garantía y derechos de cada afiliado. Registrar muestra y revisión. Un enlace de afiliación no prueba calidad ni habilita publicación.
3. Enlazar el generador con ARC Fábrica de Contenidos. Renderizar recursos originales, revisar formato, voz y derechos; no publicar material sin aprobación. El JSON editorial no contiene imágenes ni videos renderizados.
4. Obtener consumo real del plan de Metricool, revisar calendario y estados publicados; confirmar cuentas, medios, tableros, fecha y hora. Si no hay acceso a la cuota, mantener bloqueado. La referencia de 20 es conservadora, no una confirmación del plan.
5. Persistir la clave de entrega y el estado por red en base de datos, con control de autorización, reserva atómica de cuota, idempotencia y conciliación ante respuestas inciertas. El guard en memoria no es una barrera de seguridad ni un sistema de publicación.
6. Probar con un conector de pruebas y después con un único envío autorizado. Separar programación de publicación efectiva. No contratar anuncios ni usar métodos de pago.
7. Solo después de pruebas en Windows, revisión de seguridad y aprobación de despliegue, integrar con el servicio principal y publicar exclusivamente el catálogo público revisado.

## Solicitudes a productores (borradores no enviados)
Dantec Tutorials: solicitar índice, páginas de muestra, instrucciones de seguridad, garantía, soporte y un banner funcional con permiso de uso.
MasterClasses.La / Lavadoras Xpert: solicitar temario vigente, clase de muestra sobre diagnóstico e inverter, condiciones de soporte y garantía, permisos y materiales de afiliado.
Patronaje Digital Premium: confirmar productor y producto exacto, solicitar clase de muestra, software y licencias requeridas, costos adicionales, formatos de patrones, garantía y permisos de promoción.

No se han enviado mensajes, creado afiliaciones, cambiado campañas, comprado productos ni modificado Cloudflare con esta fase.
