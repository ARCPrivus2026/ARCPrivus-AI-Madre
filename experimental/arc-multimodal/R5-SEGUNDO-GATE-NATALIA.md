# ARC Privus R5 — verificar el segundo gate, NO volver a cargar Natalia por horas

## Evidencia real de la consola (9 nov 2026)
La prueba local confirmó:
- Se produjo \`loadActor.ready-set\`.
- \`inspect("natalia").ready\` dio verdadero.
- El segundo gate de la auditoría esperaba:
  \`window.__R5_FACE_LAYER_CONTEXT.state.actors.natalia.gltf.scene\`.
- NO quedó grabado en el informe el valor concreto del contexto ni el
  segmento ausente de esta ruta. No afirmar que esté rota la carga GLB.
- La prueba temporal de invertir el orden de carga no resolvió el gate
  y se revirtió. La identidad GLB no se alteró.
- El ensayo tardó demasiado para una observación de contexto. Debe
  restringirse a una secuencia corta, no volver a ejecutar 5 horas.

## Instrumentación creada
\`r5-face-layer-second-gate.mjs\`
- \`inspectR5FaceLayerContext({browserWindow,inspectNatalia})\`
- \`traceR5FaceLayerGate({readWindow,inspectNatalia,sleepMs,
  checks:3,intervalMs:1000})\`

La función devuelve:
- \`GLOBAL_CONTEXT_MISSING\`
- \`STATE_MISSING\`
- \`ACTORS_MISSING\`
- \`NATALIA_CONTEXT_MISSING\`
- \`GLTF_REF_MISSING\`
- \`GLTF_SCENE_MISSING_OR_INVALID\`
- \`INDEPENDENT_INSPECT_NOT_READY\`
- \`BOTH_GATES_CONFIRMED\`
- \`READ_EXCEPTION\`

\`BOTH_GATES_CONFIRMED\` requiere que inspect sea ready y que la escena
en el contexto sea atravesable. NO crea \`__R5_FACE_LAYER_CONTEXT\`,
NO fuerza \`actor.ready\` y NO relaja gates de textura.

## Instrucción para la única operación local
1. Usar solamente la copia ya existente
   \`R5_AUDITORIA_FACIAL_INTEGRAL\`, no la fuente original ni main.
2. Comprobar el visor realmente abierto: origen, puerto y fotograma de
   Edge. No inspeccionar \`window\` de otra pestaña, iframe o puerto.
3. Ubicar el punto que DEBERÍA asignar
   \`window.__R5_FACE_LAYER_CONTEXT\` en el visor local. Localizar
   quién configura \`state.actors.natalia\`. Si no existe el código,
   documentar el contrato faltante sin inventar objetos GLTF.
4. Conectar el módulo a la ventana real durante una sola carga YA
   permitida, o inspeccionar el estado de la sesión activa sin recargar
   si el runtime continúa disponible. Inyectar \`inspectNatalia\`
   usando la función realmente disponible (ej.
   \`window.ARNOLDVERSE.inspect\` vinculada a su objeto).
5. Ejecutar hasta tres snapshots separados por 1 segundo; no
   esperar indefinidamente. Guardar únicamente las rutas y nombres
   de propiedades, NO serializar mallas o datos privados.
6. Interpretar:
   - \`GLOBAL_CONTEXT_MISSING\`: buscar inicializador no ejecutado,
     export no definido, ventana/iframe equivocado.
   - \`STATE_* / ACTORS_*\`: verificar inicialización de la estructura.
   - \`GLTF_REF_MISSING\`: confirmar si el contexto debe recibir la
     referencia del GLTF ya cargado; revisar cierre y alcance JS.
   - \`GLTF_SCENE_MISSING_OR_INVALID\`: revisar contrato del campo
     escena y si se asignó a otro objeto.
   - \`BOTH_GATES_CONFIRMED\`: reanudar solamente medición texel/píxel,
     sin repetir barridos R3–R5.
7. Si falta el inicializador, proponer y ensayar en copia una unión
   explícita al actor REAL que ya está READY, después de verificar
   el contrato original y sin crear datos falsos. Guardar hashes.
8. Generar un \`R5_SECOND_GATE_FINAL_REPORT.md\` y un
   \`r5-second-gate.json\` realmente escritos y comprobados.
   Dictamen sin causa demostrada: \`SECOND_GATE_UNRESOLVED\`.

## Ejemplo conceptual, adaptar a variables reales
\`\`\`js
import {traceR5FaceLayerGate} from "./r5-face-layer-second-gate.mjs";

const report=await traceR5FaceLayerGate({
  readWindow:()=>window,
  inspectNatalia:name=>window.ARNOLDVERSE.inspect(name),
  sleepMs:ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  checks:3,
  intervalMs:1000
});
console.log(report.status,report.events.map(x=>x.gate));
\`\`\`
Si \`ARNOLDVERSE.inspect\` no existe en el visor, sustituirla por
la función original y no declararla disponible a la fuerza.

**No aplicar correcciones faciales a Natalia hasta que el gate real y
las muestras originales de la textura hayan sido verificados.**
