# Natalia R5 — localizar "Runtime GLTF binding mismatch" sin volver a renderizar

**Evidencia de consola del 9-nov-2026:**
- Se validó la sintaxis del JS inyectado en Edge.
- Natalia \`READY\` y segundo gate \`canStartTexelPixel=true\`.
- El ejecutor se detuvo ANTES de leer texel o pixel con:
  \`Runtime GLTF binding mismatch\` en
  \`tests/run-r5-face-texel-pixel-evidence-session.mjs\`
  (alrededor de línea 124 y bloque inyectado en línea 14).
- El mensaje agrupa comprobaciones de mesh, material y texture, sin
  conservar cuál índice difiere. Ninguna medición de color fue hecha.
- Hashes de los originales Natalia, Arnold RC y natalia_01.jpg siguen
  coincidiendo con sus fuentes de referencia.
- En pantalla, Codex advierte que tiene menos del 5% del límite
  de uso de cinco horas: evitar gastar la cuota en sesiones Edge
  que todavía tienen un validador ambiguo.

## Instrumento añadido en PR #38
\`experimental/arc-multimodal/r5-gltf-binding-diagnostics.mjs\`

\`diagnoseFaceGLTFBinding({gltf,meshName:"Mesh_0_1",materialSlot:0,expected})\`
lee **en memoria y sin cambios**:
- \`gltf.parser.associations.get(mesh).meshes\` y \`.primitives\`;
- \`associations.get(material).materials\`;
- \`associations.get(material.map).textures\` cuando existe;
- \`parser.json.meshes[meshIndex].primitives[primitiveIndex].material\`;
- \`parser.json.materials[materialIndex].pbrMetallicRoughness.baseColorTexture.index\`.

Devuelve para cada propiedad \`runtime\`, \`source\`, \`expected\`,
\`runtimeCheck\`, \`sourceCheck\`, \`associationVsSource\`.
Los posibles valores son \`MATCH\`, \`MISMATCH\`, \`UNKNOWN\`, y
\`NOT_REQUESTED\` si no hubo valor de referencia. No inventa índices
faltantes. Diferencias de UUID entre cargas NO se usan como identidad
del recurso.

NOTA: \`GLTFLoader\` puede clonar materiales/texturas y perder
\`parser.associations\` de ese objeto. En ese caso el estado será
\`MISSING_ASSOCIATION_OR_EXPECTATION\`, no \`MATCH\`. Se debe
averiguar el vínculo real por procedencia (GLB/imagen hash, índice
glTF y ruta de creación) antes de permitir el muestreo. Los grupos
\`geometry.groups\` no son índices de primitivas certificados.

## Única operación recomendada en la copia existente
1. Trabajar en
\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R5_AUDITORIA_FACIAL_INTEGRAL\`
sin editar GLB fuente, R4, producción, Messenger o MySQL.
2. Abrir las líneas reales 112–135 del ejecutor y el JavaScript
inyectado alrededor del \`Runtime GLTF binding mismatch\`.
**Antes de iniciar Edge otra vez**, separar la validación agrupada en
cuatro comparaciones con nombres y mensajes concretos.
3. Obtener \`expected\` del JSON de glTF realmente verificado y
de los informes de procedencia, no de un UUID ni de números inferidos
de \`Mesh_0_1\`. Confirmar materialSlot que se dibuja y que
\`material.map\` es el mapa de COLOR (no metallic/roughness).
4. Inyectar el nuevo auditor en el mismo punto donde el runtime ya
tiene acceso a \`actor.gltf\`. Registrar campos por separado. Guardar
\`reports/R5_GLTF_BINDING_DIAGNOSTIC.json\` con las cuatro filas.
5. Si el desajuste es una expectativa de índice obsoleta y el origen
actual verifica el índice correcto por bytes y parser JSON,
corregir solamente esa EXPECTATIVA en el runner.
Si un vínculo runtime no existe por clonación, reconstruir de manera
comprobable el enlace al recurso REAL, sin reemplazar imágenes.
6. \`node --check\` sobre el ejecutor y también sobre el JS que
inyectará al navegador. Ejecutar un único preflight de asociación.
Si falla, detenerse y emitir campo, actual, esperado y origen.
NO iniciar el muestreo ni insistir en 25+25 hasta que quede claro.
7. Solamente tras resolver los cuatro campos y comprobar la identidad
SHA-256 del GLB/albedo, reanudar UNA sola sesión controlada de
lectura real de 50 puntos; guardar valores RGB albedo/imagen WebGL
y resultados. Si aparece error, registrar el mensaje concreto sin
relanzamientos.
8. Comparar hashes de GLB antes/después. Mantener el diagnóstico
\`CAUSA_NO_DEMOSTRADA\` hasta obtener evidencia visual causal.

## Ejemplo de inspección del runtime REAL

\`\`\`js
import {diagnoseFaceGLTFBinding} from "./r5-gltf-binding-diagnostics.mjs";
const report=diagnoseFaceGLTFBinding({
  gltf:actor.gltf, // la referencia REAL y ya READY del visor R5
  meshName:"Mesh_0_1",
  expected:{
    gltfMeshIndex:INDICE_DE_MALLA_VERIFICADO,
    primitiveIndex:INDICE_DE_PRIMITIVA_VERIFICADO,
    gltfMaterialIndex:INDICE_DE_MATERIAL_VERIFICADO,
    gltfTextureIndex:INDICE_DE_TEXTURA_COLOR_VERIFICADO
  }
});
console.log(report.status,report.comparisons);
\`\`\`

El código usa nombres simbólicos; no se debe copiar como si fueran
constantes reales. El resultado se considera DIAGNÓSTICO, no una
autorización automática para omitir los controles.

### Entrega
- \`R5_GLTF_BINDING_DIAGNOSTIC.json\` realmente guardado.
- Tabla de 4 campos con \`runtime\`, \`expected\`, \`source\`.
- Referencia a los hashes calculados de los recursos reales.
- Si procede, cambio mínimo del ejecutor y un único test de
  navegación. No volver a repetir 60 o 120 minutos de pruebas.
- Informe claro: **qué vínculo falló** o qué información adicional
  falta para demostrarlo.
