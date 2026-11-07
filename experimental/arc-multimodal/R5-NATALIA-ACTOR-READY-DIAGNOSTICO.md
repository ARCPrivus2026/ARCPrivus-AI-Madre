# Natalia R5 — diagnóstico único del gate de carga (actor.ready)

## Resultado local que provoca este paso
El informe del laboratorio R5 de 2026-11-07 describe dos intentos de
comparar texel/píxel; ninguno inició la captura porque Natalia nunca fue
observada en estado ready. El servidor sirvió los GLB y las texturas con
respuestas HTTP, pero NO se registraron \`actor.ready\`, \`actor.gltf\`,
la alerta del panel, presencia de \`v22RestPatch\`/\`v22MouthInsert\` ni
la excepción interna de \`loadActor\`. NO se puede deducir si falló
la red, parseo, GLB, un paso V22 o una condición de readiness.

**Prohibido** forzar \`actor.ready=true\`, desactivar el gate o marcar
\`gltf\` como válido a partir de HTTP 200. NO repetir el experimento
texel/píxel hasta tener un actor cargado y una captura estable.

## Módulo listo para insertar en laboratorio aislado
\`experimental/arc-multimodal/r5-actor-load-gate-audit.mjs\`
- \`createActorGateRecorder({readState})\`
- \`recorder.observe(phase)\` guarda un snapshot de estado.
- \`recorder.wrapLoader(fn)\` registra entrada, resolución y error
  REAL de la función de carga; relanza el mismo error, sin ocultarlo.
- \`recorder.attachWindow(window)\` observa \`error\` y
  \`unhandledrejection\`; devuelve una función para retirar listeners.
- \`recorder.getReport()\` genera un JSON de solo lectura. NO guarda
  nada hasta que el agente Windows lo escriba y verifique en disco.
- Son pruebas de instrumentación con estados simulados, no cargas
  del GLB original en GitHub.

## Solo una ejecución controlada en Windows
Laboratorio: \`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\
ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\
R5_ATRIBUCION_CAPAS_FACIALES\`.

1. Inspeccionar \`ERROR_DOCUMENTED.json\` de los dos intentos,
   \`TEXEL_PIXEL_BLOCKED_REPORT.md\`, la ruta real del entrypoint
   y dónde están declarados \`actor\`, \`loadActor\`, \`v22RestPatch\`,
   \`v22MouthInsert\` y el elemento que presenta \`#alert\`
   (no asumir que \`#alert\` es el selector correcto).
2. Habilitar solo en la copia de laboratorio una captura de eventos
   alrededor del \`loadActor\` auténtico. No reemplazar con una
   función ficticia. Si el loader no es async, preservar su contrato
   y utilizar \`observe\` en sus puntos reales de entrada/salida.
3. Conectar el lector de estado a las variables reales en la misma
   zona de código; no interpretar \`Boolean(actor)\` como glTF
   parseado: exigir \`actor.gltf?.scene\` o equivalente verificado.
   Registrar nombres reales de parches V22 y el texto del aviso,
   estados \`undefined\` como desconocidos y no como confirmados.
4. Capturar snapshots al iniciar, tras la resolución/rechazo del
   loader, y luego a los 5 y 15 segundos si continúa pendiente.
   NO alterar el valor de \`actor.ready\`, la temporización del
   render ni la lógica de creación del personaje.
5. Recoger errores \`window.error\`, \`unhandledrejection\` y
   \`loadActor.catch\` con nombre, mensaje y stack, manteniendo
   el script con estructura de archivo .mjs en vez de
   \`node -e $payload\` de PowerShell.
6. Verificar el JSON en disco, la secuencia cronológica y el
   hash SHA-256 de los GLB; preservar la sesión local existente.
7. Si \`actor.gltf?.scene\` existe, pero ready es falso, localizar
   la comprobación concreta que impide cambiar el flag:
   V22, escena, animación, excepción o estado de UI. **No**
   saltarse ninguna comprobación sin causa demostrada.
8. Si el loader no termina o rechaza, conservar la excepción
   original y el paso exacto que falló. No ejecutar más intentos
   automáticos de 49 minutos; cerrar con un diagnóstico utilizable.

## Ejemplo de integración (adaptar a variables que EXISTAN)
\`\`\`js
import {createActorGateRecorder} from "./r5-actor-load-gate-audit.mjs";

const recorder=createActorGateRecorder({
  readState:()=>({
    actorReady:actor?.ready === true,
    gltfPresent:Boolean(actor?.gltf?.scene),
    restPatchPresent:typeof v22RestPatch === "function",
    mouthInsertPresent:typeof v22MouthInsert === "function",
    activeActor:"natalia",
    alertText:obtenerTextoRealDelAviso()
  })
});
const disposeErrors=recorder.attachWindow(window);

// Si el loader actual es async y está disponible para envolver:
const loadWithEvidence=recorder.wrapLoader(loadActor);
// Sustituir la llamada en un SOLO punto de entrada de la copia.
// Tras ejecutar y hacer snapshots pendientes:
console.log(recorder.getReport());
// Guardar JSON mediante el backend del laboratorio y validar archivo.
// Al finalizar: disposeErrors().
\`\`\`

\`obtenerTextoRealDelAviso\` es una dependencia que Codex debe localizar
en el visor existente; NO es una función del repositorio. El propio
\`actor\` puede ser otra estructura: adaptar sin falsear variables.
No registrar identificadores privados ni compartir stacks con
rutas locales, modelos o correos en un repositorio público.

## Entrega
- \`reports/r5-face-layers/ACTOR_LOAD_GATE_FINAL_REPORT.md\`
- \`reports/r5-face-layers/actor-load-gate-events.json\`
- La etapa exacta de carga que falla, el mensaje y/o stack original
  cuando exista, estado \`actor.ready\`, \`gltf\`, V22 y alerta.
- Los hashes de Natalia/Arnold RC y estado de Messenger intactos.
- Dictamen \`ACTOR_NOT_READY_ROOT_CAUSE_PENDING\` si no se identifica
  el bloqueo exacto. No marcar \`texel/pixel comparison complete\`.

**La prioridad es depurar una sola vez el gate de carga antes de
volver a muestrear colores de Natalia.**
