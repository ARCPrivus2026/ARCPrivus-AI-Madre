# Natalia R5 — corregir bloqueo UUID sin repetir la sesión

## Evidencia local nueva (informe del 9 noviembre de 2026)
La última sesión Windows demostró que:
- \`Natalia.ready = true\`.
- \`__R5_FACE_LAYER_CONTEXT.state.actors.natalia.gltf.scene\` existe
  y se puede recorrer.
- El resultado \`canStartTexelPixel\` estaba en cada **evento** del
  informe del segundo gate, no como propiedad superior del agregado.
- El ejecutor de texel/píxel falló con:
  \`Loaded albedo UUID differs from provenance record\`.
- El UUID que entrega Three.js es identidad del OBJETO en memoria,
  no identidad estable de la misma textura GLB recargada después.
- **No existen muestras texel/píxel en esta ejecución.** No hay
  evidencia de reparación facial.

## Nuevo módulo y contrato
\`r5-texel-session-preflight.mjs\` exporta
\`evaluateR5SamplingPreflight({gate,loaded,frame,prior})\`.

1. Verifica el estado \`BOTH_GATES_CONFIRMED\` y la propiedad
   \`canStartTexelPixel\` del evento real o del snapshot directo.
2. Verifica \`loaded.runtimeTextureUuid === frame.textureUuid\` de
   **esa misma captura y esa misma sesión**.
3. Compara entre sesiones por una procedencia estable verificada:
   - SHA-256 del GLB realmente cargado (comprobado sobre bytes).
   - Índice de material glTF y de la textura albedo glTF.
   - Tipo de origen: \`embedded-glb\` o \`external-file\`.
   - Si es archivo de imagen externo, SHA-256 de ese archivo.
4. Si no existe registro anterior de índices/imagen, permite tomar
   muestras verificadas de la sesión presente y registrar una nueva
   referencia: \`stableProvenance: "not-recorded"\`. No inventar
   una coincidencia con la sesión anterior.
5. Si la procedencia estable entre sesiones difiere, BLOQUEAR,
   incluso si casualmente coincide el UUID.
6. Nunca se considera una diferencia del UUID anterior una
   modificación facial ni un fallo de identidad por sí sola.

**La función no calcula SHA-256 de archivos:** el ejecutor Windows
debe calcular esos digests desde los bytes reales de GLB/imagen y
marcar \`shaVerifiedFromBytes:true\` solo después de verificarlo.
No limitarse a repetir el hash de un manifiesto anterior. Para
\`embedded-glb\`, idéntico SHA de GLB e índices material/texture
identifican la misma fuente; para \`external-file\`, se requiere
además hash de los bytes externos.

## Una sola ejecución local dirigida
Carpeta aislada:
\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R5_AUDITORIA_FACIAL_INTEGRAL\`

1. Reutilizar \`RESOLUCION_SEGUNDO_GATE_NATALIA.md\`, los JSON
   guardados y el ejecutor ya creado.
2. Conectar nuevo preflight a los datos reales del visor. Leer el
   estado \`canStartTexelPixel\` desde el evento correcto. Confirmar
   glTF materialIndex, textureIndex y tipo de recurso del parser real.
3. Calcular digest de la carga actual o verificarlo contra los bytes
   originales ya existentes. Confirmar que \`material.map.uuid\`
   pertenece al render activo, no al objeto de la sesión anterior.
4. Corregir únicamente el comparador del runner. No cambiar el GLB,
   map, morph, textura, rostro, \`ready\` ni la API de producción.
5. Validar \`node --check\` y las pruebas de regresión mínimas.
   Ejecutar el visor UNA vez con un límite corto (p.ej., 60 s de
   espera total de captura, no un proceso de múltiples horas).
6. Si el preflight autoriza la sesión, tomar los 25+25 puntos
   ya conocidos: albedo auténtico de \`material.map\` y píxel
   correspondiente del mismo frame y cámara. Guardar CSV/JSON,
   ubicación UV, textura, hash e imagen comparativa.
7. Los 50 rayos previos sirven como referencia de ubicación; si
   pantalla/pose cambia, reacoplar por UV/triángulo en la nueva
   imagen. No reutilizar píxeles viejos como evidencia nueva.
8. Si hay otro bloqueo, cerrar la sesión con error exacto, evento
   y ruta real; NO relanzar indefinidamente ni sustituir muestras
   reales por simuladas.
9. Verificar hash de ambos GLB antes/después y conservar V1–V8,
   R2–R5, Messenger, MySQL y \`main\` intactos.

## Esquema de integración (valores reales, no datos ficticios)

\`\`\`js
import {evaluateR5SamplingPreflight} from "./r5-texel-session-preflight.mjs";

const preflight=evaluateR5SamplingPreflight({
  gate:secondGateResult, // JSON de eventos real
  loaded:{
    glbSha256:SHA256_CALCULADO_DEL_GLB_ACTUAL,
    gltfMaterialIndex:INDICE_ALBEDO_MATERIAL_REAL,
    gltfTextureIndex:INDICE_GLTF_TEX_REAL,
    textureSourceKind:TIPO_ORIGEN_REAL,
    textureSha256:SHA256_IMAGEN_EXTERNA_SI_APLICA,
    runtimeTextureUuid:actor.gltf.scene /* sustituir por */ && MATERIAL_MAP_UUID_REAL,
    shaVerifiedFromBytes:true // solo si digest realmente calculado
  },
  frame:{textureUuid:TEXTURA_DE_LA_CAPTURA_ACTUAL},
  prior:PROCEDENCIA_ESTABLE_ANTERIOR_O_NULL
});

if(!preflight.canSample) throw new Error(preflight.status);
\`\`\`

Los valores MAYÚSCULOS son dependencias locales que deben localizarse
y verificarse, NO constantes que se puedan copiar tal cual. \`prior\`
es opcional si el informe anterior no guardó los índices necesarios:
la comparación temporal no se convierte en falsa prueba.

## Entrega
\`R5_TEXEL_PIXEL_RECUPERACION_FINAL.md\`,
\`r5-texel-pixel-samples.json\`, \`r5-texel-pixel-samples.csv\`
y comparativa solo si se realizaron lecturas reales; manifiesto SHA.
Mantener dictamen \`CAUSA_NO_DEMOSTRADA\` hasta tener evidencia causal.
