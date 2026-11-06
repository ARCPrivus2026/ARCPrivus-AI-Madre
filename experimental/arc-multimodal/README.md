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


## Director integral audiovisual (nuevo)
`integrated-scene-runtime.mjs` coordina eventos para Natalia y Copiloto en tres
canales independientes: movimiento, rostro y voz. Puede programar a ambos
caminando/corriendo mientras uno habla, parpadea y mira. Requiere inyectar un
adaptador real con `motion`, `face`, `voice`; NO renderiza ni reproduce audio por
si mismo. Si un GLB carece de manos, pies, ojos, clips o morphs necesarios, el
auditor devuelve faltantes y el plan no se ejecuta. Tampoco permite dos
movimientos incompatibles en el mismo instante. El sistema de tiempos necesita
que los adaptadores inicien acciones sin bloquear todo el hilo de la escena.

Prueba integrada para **ambos** avatares (sin internet ni facturacion):
```sh
node --test experimental/arc-multimodal/*.test.mjs
```
Son tests de logica, no de calidad audiovisual. Para emitir una certificacion
visual necesitamos cargar los modelos R4 reales y medir piel, manos, labios,
mirada, sincronizacion, continuidad y tiempos.

## Auditoria automatica de originales Blender/GLB: sin guardar cambios
Con Blender 4.2 LTS disponible en Windows, ejecutar desde la carpeta R4 (usar
nombres y rutas reales; no se crean rutas ficticias):
```bat
blender -b "NATALIA_FASE11Y32_READONLY_COPY.blend" --python "experimental/arc-multimodal/blender-rig-inventory.py" -- --out "audit_natalia.json"
```
Para GLB:
```bat
blender -b --python "experimental/arc-multimodal/blender-rig-inventory.py" -- --asset "COPILOTO.glb" --out "audit_copiloto.json"
```
Si hay varias armaduras, añadir `--armature "NOMBRE_EXACTO"`. Los informes
JSON solo se guardan si se indica `--out`; el original no se guarda.
El nombre de archivo es ilustrativo, comprobar la ruta de cada asset.
Los datos guardados son nombres de huesos, mallas, grupos de vertices, acciones,
morphs y mapeos sugeridos. Nunca contiene ni reproduce material privado de voz.
Los morphs de Blender no sustituyen los visemas temporales de audio.
`voiceEnabled=false` hasta que se compruebe el adaptador real de voz.

## Proximo criterio de salida (sin promesas)
- Inventarios reales Natalia y Copiloto disponibles y revisados.
- Reparacion del brazo/mano faltante y morphs sin alterar el original.
- Adaptador de Three.js / Blender ligado a clips GLB, ojos y movimientos reales.
- Voz en tiempo real con alineacion de visemas y cancelacion de reproduccion.
- Prueba conjunta filmada/reproducible en el R4 activo, con latencia p50/p95,
  registros de fallos y comparativa frente a la referencia.
- La propuesta sigue en borrador hasta aprobar verificaciones. `main` intacta.
