# ARC Privus R5 — diagnóstico causal de luz, normales y profundidad

**Estado:** módulo experimental, no aplicado al R4 de Windows. No se conocen
aquí las rutas internas exactas del visor ni se han recibido los PNG de R4.

## Antecedente verificable del informe R4 (aportado por usuario)
La franja seguía en las siete variantes PBR; quitar solo metalnessMap
redujo simultáneamente el brillo de la franja de 38,91 a 0,00 y el brillo
de piel sana de 137,44 a 55,46 (medianas en imagen); es oscurecimiento
global, no corrección. Image_1 tiene canales B metálico y G rugosidad.
Los originales GLB y Messenger quedaron sin modificaciones.

**Decisión:** detener el barrido de metalness/roughness y no aplicar
cambios cosméticos permanentes a la identidad de Natalia.

## Objetivo R5
Distinguir, SIN guardar modificaciones, si la franja procede de:
- iluminación difusa dependiente de normales y superficie;
- normales interpoladas vs normales por cara;
- geometría/profundidad y posibles superficies superpuestas;
- interacción de material PBR que no reproduce Lambert.

Ninguna visualización aislada certifica la causa raíz, porque cada shader
de diagnóstico cambia la interpretación de la geometría. Exigir cotejo
de capturas + ROI sobre la cara, siempre en el mismo fotograma.

## Arquitectura
Archivo: \`r5-light-normal-depth-audit.mjs\`

\`runR5LightingIsolation({THREE,root,meshNames,capture})\` instala materiales
TEMPORALES en las mallas faciales de nombre exacto, lanza la captura y restaura
la referencia a cada material original en un bloque \`finally\`.
No sustituye geometría, texturas, huesos, morphs ni GLB en disco.

Modos:
1. \`baseline\`: material PBR original.
2. \`lambert-smooth\`: color y albedo originales, luz difusa sin metalicidad PBR,
   normales suaves.
3. \`lambert-flat\`: misma luz difusa, normales planas por triángulo.
4. \`pbr-flat\`: original PBR clonado con normales planas.
5. \`normal-smooth\`: visualización de orientación normal suave.
6. \`normal-flat\`: visualización de orientación normal por cara.
7. \`depth\`: visualización de profundidad.

**Nota sobre Lambert:** sustituye el modelo de reflexión, no una sola
variable. Comparar Lambert suave con Lambert plano, y PBR original con
PBR plano, ayuda a localizar discontinuidades de normales, pero no prueba
por sí solo qué modificación convendría aplicar.

## Experimento operativo integrado para Codex (Windows local)

Origen que ya existe en el informe del usuario:
\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R4_AISLAMIENTO_PBR_NATALIA\`

Crear una COPIA de trabajo:
\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R5_LUZ_NORMALES_PROFUNDIDAD\`

1. Leer \`R4_FINAL_REPORT.md\`, la comparativa de R4, el CSV de ROIs
   validadas y \`MANIFEST_SHA256_R4.csv\`.
2. Identificar la versión REAL de Three.js del visor R4, sus mallas faciales
   y método de captura. Verificar compatibilidad antes de importar.
3. Obtener el módulo desde la rama PR #38, **solo dentro del R5 aislado**:
   https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/blob/feature/arc-multimodal-google-20261105/experimental/arc-multimodal/r5-light-normal-depth-audit.mjs
4. Detener el bucle de render principal durante cada serie; congelar pose,
   morphs, cámara, luces, toneMapping, exposición, resolución y contexto WebGL.
5. Usar nombres de mallas **verificados**, no adivinados. No editar materiales
   fuentes. Capturar siete variantes y restablecer el render normal incluso
   si algo falla.
6. Ejecutar ROIs validadas en las mismas coordenadas, siempre dentro del
   canvas y sin solapamientos; guardar medianas de franja y piel sana.
   \`measureR5Rois\` permite leer \`ImageData.data\` RGBA y bloquear regiones
   fuera de la pantalla. Si la cámara ha cambiado, no comparar numericamente.
7. Usar \`screenStripeCandidates\` para preseleccionar solamente cambios con
   mejor proporción franja/piel **sin oscurecimiento general**.
   Cualquier resultado con status \`candidate-needs-visual-review\` requiere
   evidencia visual independiente; status nunca significa "curado".
8. Inspeccionar las 7 PNG en una comparativa visual. Identificar si la línea
   coincide con un borde de geometría, una discontinuidad de normales,
   la profundidad/solapamiento, o únicamente una respuesta lumínica.
   Comparar sin cambiar la identidad de Natalia.
9. Mantener una sola prueba de regresión corta para Arnold RC como control
   de que los motores de cuerpo, boca y escenario existentes siguen estables;
   no reiniciar todas las pruebas R3/R4 sin evidencia nueva.
10. Comparar SHA-256 de ambos GLB y de materiales originales antes y después.
    NO modificar producción, Messenger, bases de datos ni IA Madre. No
    utilizar proveedores de pago. No crear la versión R6 automáticamente.

## Ejemplo adaptado al visor cuando Three.js ya está cargado

\`\`\`js
import {
  runR5LightingIsolation,measureR5Rois,screenStripeCandidates
} from "./r5-light-normal-depth-audit.mjs";

// Requiere valores reales del visor: THREE, gltfNatalia, renderer, scene,
// camera, captureFrame y nombres de mallas del inventario.
// Si THREE está encapsulado por otra herramienta, adaptar esa interfaz.
const rows=[];
const results=await runR5LightingIsolation({
  THREE,
  root:gltfNatalia.scene,
  meshNames:["Mesh_0"], // SOLO si R4 confirma este nombre
  capture:async ({mode})=>{
    renderer.render(scene,camera);
    // Usar el capturador REAL ya validado en R4. Debe guardar un PNG
    // y devolver ImageData o {width,height,data:RGBA}, leyendo un canvas
    // auxiliar o el PNG. No pedir getContext("2d") al canvas WebGL.
    const imageData=await captureFrame(mode);
    const roi=measureR5Rois({
      width:imageData.width,height:imageData.height,data:imageData.data,
      stripe:ROI_STRIPE_VALIDADA,control:ROI_PIEL_VALIDADA
    });
    rows.push({mode,...roi});
    return {mode,roi}; // Guardar PNG con captureFrame real.
  }
});
console.log(results.restored,screenStripeCandidates(rows));
\`\`\`

El ejemplo NO es ejecutable sin el código de captura R4 y las variables
\`ROI_STRIPE_VALIDADA\`/\`ROI_PIEL_VALIDADA\`. No copiar los ROIs de un
fotograma diferente ni usar \`getContext("2d")\` sobre el canvas WebGL
ya inicializado como sustituto de \`readPixels\`; se recomienda adaptar el
capturador probado en R4.

## Entrega mínima exigida
- \`reports/r5/R5_FINAL_REPORT.md\`
- \`reports/r5/r5-light-normal-depth.json\`: metadatos, resultado de cada modo,
  métricas ROI y dictamen por causa o causa aún no aislada.
- \`reports/r5/comparativa_7_modos.png\`
- \`reports/r5/manifest_sha256_r5.csv\`
- Resumen de regresión Arnold RC, sin fingir voz/lipsync si no se grabó audio.
- Confirmar restauración de material, identidad y GLB originales.
- Si persiste la duda: dictamen \`PARCIAL - ROOT CAUSE NOT ISOLATED\`.

## Limitaciones
Estas pruebas locales en GitHub Actions son simulaciones de objetos
Three.js. No son renders reales ni garantías de corregir la franja.
Nada debe fusionarse a \`main\` sin una prueba visual verificada.
