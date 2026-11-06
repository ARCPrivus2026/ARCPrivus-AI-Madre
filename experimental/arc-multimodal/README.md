# ARC Multimodal - experimento seguro

Este modulo no esta conectado a la aplicacion principal. No modifica el
motor audiovisual ni el servidor MySQL. No inicia gastos ni genera videos.

- Google Gemini Interactions API: razonamiento con gemini-3.8-flash.
- Google Gemini Omni 1.1 Flash: generacion de video, bloqueada por defecto.
- Solo backend: clave en GEMINI_API_KEY, nunca dentro del navegador.
- ARC_GOOGLE_AI_ENABLED=true habilita solicitudes de razonamiento.
- ARC_GOOGLE_VIDEO_ENABLED=true y approvedSpend=true son necesarios para video.

Plan de integracion: verificar primero el R4 que corre en Windows, registrar
el conector en la capa de proveedores, incorporar presupuesto, verificar
permisos, crear un puente a los clips/morphs del GLB Natalia/Copiloto,
probar latencia y regresiones, y solo entonces habilitar produccion.

Para voz en tiempo real se requiere otro adaptador con Gemini Live, WebSockets
y tokens efimeros; este archivo NO lo implementa. Para movimiento del cuerpo
se requiere rig 3D y clips reales; el video generado no lo sustituye.

Documentacion oficial:
https://ai.google.dev/gemini-api/docs/interactions-overview
https://ai.google.dev/gemini-api/docs/live-api
https://ai.google.dev/gemini-api/docs/omni
https://ai.google.dev/gemma/docs/core/model_card_4

El conector no se desplegara automaticamente ni se mezclara con main.
