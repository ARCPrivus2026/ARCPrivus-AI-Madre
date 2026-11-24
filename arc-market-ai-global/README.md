# ARC Market AI Global — V1 laboratorio
Fecha: 2026-11-23. Estado: prototipo, no producción.

## Ejecutar
Desde CMD, en una copia del repositorio que contenga esta rama, abrir `arc-market-ai-global/index.html` en el navegador. No requiere npm, credenciales, ni IA pagada. Los datos se conservan en almacenamiento local del navegador, no se sincronizan. Exportar JSON antes de cerrar si el almacenamiento no está disponible. No introducir datos personales ni secretos en este módulo público.

## Alcance implementado
- Ficha editable de una oportunidad comercial y evidencia de demanda.
- Filtro preliminar de requisitos comerciales, derechos, revisión y enlaces Hotmart. No certifica autenticidad ni es una barrera de seguridad.
- Tres borradores locales por plantillas: Facebook, WhatsApp y video corto. Sin publicación automática.
- Registro manual COP, referencias únicas, ingresos, devoluciones, tarifas, anuncios, costos e impuestos; cálculo de resultado neto y ROAS agregado orientativo.
- Exportación de borradores y registros.
- Semilla ARC-TEC-001 con precio hipotético COP 29.000; no es una oferta activa. Sin pagos ni ventas conectados.

## Estrategia de negocio
Primero validar una necesidad; luego entregar una muestra útil, comprobar calidad y derechos, definir precio, garantía y soporte, publicar una ficha transparente, medir visitas y compras reales y ajustar. No copiar contenido, marcas ni anuncios de terceros. No fabricar reseñas, urgencia, escasez, autoridad o cifras. No hacer spam. Divulgar afiliación y respetar permisos de cada canal. Sin publicidad pagada en la validación inicial.

### Piloto ARC-TEC-001
Público: técnicos y aprendices de refrigeración y línea blanca.
Problema: evitar cambios de piezas por ensayo y error.
Propuesta: guía de diagnóstico por síntomas, diagramas de decisión, hojas de registro, ejercicios y precauciones.
Contenido previsto: 1. seguridad y datos de placa; 2. flujo de aire y escarcha en No Frost; 3. deshielo, sensores y control; 4. llenado, drenaje, bloqueo y centrifugado en lavadoras; 5. casos prácticos y límites del diagnóstico.
No afirmar que el producto completo existe ni ofrecer venta hasta revisión técnica y entrega real.

Muestra educativa original: nevera No Frost con congelador frío y compartimento inferior templado. Registrar temperaturas y modelo, comprobar si las rejillas están bloqueadas, observar patrón de escarcha accesible sin retirar paneles energizados, verificar cierre de puertas. Si persiste, revisar ventilación, deshielo y sensores de acuerdo al manual del fabricante por técnico capacitado. Desconectar antes de retirar cubiertas; no puentear protecciones ni manipular refrigerante sin formación. Un síntoma aislado no demuestra una falla de tarjeta o falta de gas.

### Campaña orgánica de prueba (sin venta)
Día 1: pregunta educativa sobre diagnóstico por síntomas, registrar respuestas voluntarias.
Día 2: compartir la muestra educativa en canales propios donde esté permitido.
Día 3: explicar qué incluiría la guía; pedir opinión voluntaria, sin captar información sensible.
Día 4: video corto demostrando una comprobación segura.
Día 5: revisar interés real y corregir contenido.
Día 6: validar ficha de entrega, términos y precio con material terminado.
Día 7: si todos los requisitos están completos, publicar una oferta honesta mediante el enlace autorizado. Si no, mantener el producto bloqueado.
Métricas: alcance, clics, consultas, compras confirmadas, reembolsos, costos, margen neto. Sin inventar tasas objetivo como resultados. No pagar anuncios hasta conocer margen y demanda.

## Integración futura
1. Backend aislado con autenticación, autorización por propietario, MySQL, registro de eventos y pruebas. No modificar rutas principales sin integración comprobada.
2. Catálogo multitenant, evidencias fechadas, revisión humana y control de versiones de contenidos.
3. Generación con IA mediante API autorizada del servidor, presupuesto y revisión de fuentes. Sin secretos en cliente.
4. Hotmart: comprobar identidad, productos y afiliación; usar API y webhook autorizados, validar autenticidad, idempotencia y conciliación, considerar reembolsos y moneda. No almacenar tarjetas.
5. Conectores de redes por OAuth y permisos oficiales; cola de publicación, límites, consentimiento y parada de emergencia. No automatizar mensajes no solicitados.
6. Soporte, accesibilidad, localización, devoluciones y auditoría. Prueba de seguridad y privacidad antes de exponer datos o habilitar cobros.
7. Despliegue separado, pruebas de extremo a extremo y activación gradual.

## Fuentes oficiales
- https://hotmart.com/es/legal/terminos-de-uso
- https://help.hotmart.com/es/article/4403617024013/descubre-las-api-de-hotmart
- https://suportehotmart.zendesk.com/hc/es-es/articles/360001491352
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=es

## Validación
Se ejecutaron ocho verificaciones de las funciones de auditoría, afiliación, enlace, afirmaciones prohibidas y cálculos antes de subir core.js. No se ejecutó prueba de navegador, despliegue ni integración externa. No se ha generado ninguna venta.
