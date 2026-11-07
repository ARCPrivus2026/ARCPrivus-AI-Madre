# Natalia — atribución de capas faciales tras la comparativa R5

**Inicio:** imagen real \`comparativa_8_capturas.png\` aportada por el
propietario. La franja forma una banda de bordes definidos desde la
región de nariz hacia ambas mejillas. En los pases de normales/profundidad
de R5, fragmentos alrededor de la boca siguen texturizados aunque una
malla amplia de cabeza/rostro adopta el material diagnóstico.

Esto hace prioritaria la hipótesis de **más de una superficie o malla
contribuyendo al aspecto del rostro**, pero NO certifica duplicación ni
permite identificar qué objeto pinta cada pixel solo desde la imagen.

El raycasting NO interpreta perfectamente materiales transparentes,
\`alphaTest\`, descarte fragmentos ni \`renderOrder\`. Puede dar
intersecciones múltiples sobre un solo objeto por triángulos compartidos.
El módulo deduplica cada objeto por rayo, pero el resultado sigue siendo
**una lista de candidatos geométricos**, no un diagnóstico concluyente.

## Herramienta disponible
\`experimental/arc-multimodal/facial-layer-attribution.mjs\`

- \`auditFaceLayers\`: inventario de mallas, propiedades de transparencia,
  \`depthTest\`, \`depthWrite\`, orden de render, y dos rejillas de rayos
  sobre franja y piel sana. Reporta mallas de superficie y distancias.
- \`runFaceVisibilityProbes\`: captura baseline y después oculta **una
  única malla expresamente nombrada** por fotografía. Restaura siempre
  cada \`visible\`, incluso tras fallar una captura.
- Ninguna función modifica o exporta GLB, altera texturas ni toca MySQL
  o Messenger. Se ejecutan SOLO en una copia del laboratorio.

## Una única prueba localizada (NO repetir R3/R4/R5)

1. Partir de la copia R5 existente y crear un sublaboratorio aislado
   \`R5_ATRIBUCION_CAPAS_FACIALES\` sin tocar R1–R5 originales.
2. Reutilizar el cargador GLB, visor Three.js, capturador WebGL, ROIs
   validadas, firma de pose/cámara y verificación SHA-256 de R5.
3. Congelar animaciones, labios, cámara, luz y exposición.
4. Obtener inventario de **TODAS** las mallas de Natalia, no solo
   \`Mesh_0\`. Inspeccionar nombres de mallas de rostro, mandíbula,
   boca, ojos, vestuario y superficies copiadas o superpuestas.
5. \`auditFaceLayers\` con \`root\` = grupo completo de Natalia, no una
   malla aislada, y ROIs de franja y piel sana tomadas del MISMO
   fotograma del canvas WebGL. Guardar rayos y configuración de
   materiales en JSON. Rechazar coordenadas fuera del canvas.
6. Usar el inventario para seleccionar hasta cinco mallas candidatas
   a superposición. No ocultar todas a la vez. Ejecutar
   \`runFaceVisibilityProbes\` con baseline y un archivo PNG independiente
   por candidato. Cada captura debe guardar el estado de visibilidad
   original; el navegador no debe cambiar la escena en paralelo.
7. Medir (a) franja, (b) piel circundante, (c) permanencia de ojos, boca,
   pómulos y nariz. Si al ocultar \`Mesh_0\` desaparece toda la cara,
   eso NO es una corrección y NO permite atribuirle el defecto.
8. Inspeccionar las PNG a tamaño completo. Una malla candidata queda
   implicada solo si la desaparición de la franja es local y mantiene
   la anatomía; verificar segundo ángulo/pose bajo condiciones
   comparables antes de afirmar causalidad.
9. Restaurar todas las mallas, comprobar hashes de ambos GLB y
   ejecutar regresión breve de Arnold RC. No guardar cambios de
   visibilidad dentro de GLB o proyecto de producción.

### Ejemplo conceptual Three.js; adaptar a los objetos reales del R5

\`\`\`js
import {
  auditFaceLayers,runFaceVisibilityProbes
} from "./facial-layer-attribution.mjs";

// El visor R5 debe proporcionar una pausa real de render/animación
// y captura validada. No reemplazar por funciones vacías.
const resume=await detenerEscenaRealR5();
try {
  const report=auditFaceLayers({
    THREE,
    root:gltfNatalia.scene,
    camera,
    width:renderer.domElement.width,
    height:renderer.domElement.height,
    stripe:ROI_FRANJA_R5,
    control:ROI_PIEL_R5,
    grid:5,
    nearTolerance:0.002
  });
  console.log(report.inventory);
  console.log(report.stripe.topHits,report.stripe.nearPairs);
  console.log(report.control.topHits);
  // Ajustar nombres únicamente a los que encuentre el informe:
  const candidates=seleccionarCandidatosInspeccionados(report);
  const images=await runFaceVisibilityProbes({
    root:gltfNatalia.scene,
    names:candidates,
    capture:async ({hidden})=>
      guardarYValidarPNG_R5({etiqueta:hidden??"baseline"})
  });
  console.log(images);
}finally{
  await resume();
}
\`\`\`

Las funciones \`detenerEscenaRealR5\`,
\`seleccionarCandidatosInspeccionados\`,
\`guardarYValidarPNG_R5\` y las ROIs son dependencias reales del
visor Windows y **no existen automáticamente** en este repositorio.
El agente local debe conectarlas al código ya probado de R5;
si no están accesibles, detenerse e informar el bloqueo real.

## Entrega requerida
- \`reports/r5-face-layers/inventory.json\`: todas las mallas, materiales
  y propiedades relevantes.
- \`reports/r5-face-layers/raycast-stripe-control.json\`: candidatos
  geométricos de cada ROI con distancias y limitaciones.
- \`reports/r5-face-layers/comparativa_capas.png\`: original vs una malla
  oculta por captura, rótulos de nombre exacto y captura final original.
- \`reports/r5-face-layers/R5_CAPAS_FINAL_REPORT.md\`: conclusiones
  sustentadas y bloqueos. No declarar resultado de raycast como prueba
  visual concluyente.
- \`reports/r5-face-layers/MANIFEST_SHA256.csv\`: hashes de ambos GLB
  antes/después y regresión resumida de Arnold RC.

**Finalizar con \`CAUSA_NO_DEMOSTRADA\` si la superposición no queda
identificada de forma reproducible.** No proponer una R6 general ni
recolorear la cara sin evidencia.
