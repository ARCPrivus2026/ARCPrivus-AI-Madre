# ARC Privus — Natalia: correlación real texel/píxel y estado de morph

Fecha del informe local: 2026-11-07, tras auditoría de 50 rayos de \`Mesh_0_1\`.
Este protocolo conserva el laboratorio \`R5_ATRIBUCION_CAPAS_FACIALES\`;
NO crea R6 y NO vuelve a ejecutar barridos R3, R4 o R5.

## Hallazgos de partida
- 25 rayos sobre franja y 25 sobre piel sana, mismos objetos glTF reales.
- 9 candidatos a costuras UV en la franja, 10 en piel control:
  presencia similar, sin causalidad demostrada.
- No se detectaron discontinuidades de normales en los vértices duplicados
  ni intersecciones de triángulos distintos muy próximos en las muestras.
- Persisten tres hipótesis: imagen de albedo/sus UVs; sombreado/iluminación
  y deformación facial. Se necesitan colores de la textura y del fotograma
  en el MISMO píxel/UV, NO otro barrido de materiales.

## Código nuevo
\`r5-face-texel-pixel-evidence.mjs\`:
- \`evaluateFaceTexelPixelEvidence\`: recibe por cada muestra de las ROI
  \`{region,rayId,faceIndex,pixel,uv,albedoRgb,renderedRgb,textureUuid,
  actualTexelSampled:true,actualPixelReadback:true}\`.
- \`compareFaceMorphAnchors\`: contrastes en estado neutral vs una
  expresión facial, enlazando ANCLA UV/triángulo en vez de asumir que
  dos fotogramas deformados usan exactamente los mismos píxeles.
- Rechaza resultados sin metadata de firma de pose/cámara, RGBA de
  lectura real, colorSpace, origen superior izquierdo y UUID de textura.
- Presenta razones de contraste y candidatos, jamás \`ROOT_CAUSE\`.

## Integración exclusiva con el visor Three.js existente

1. Abrir SOLO los artefactos ya generados en:
\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R5_ATRIBUCION_CAPAS_FACIALES\`.
Cargar desde su última sesión \`triangle-uv-evidence.json\`,
\`triangle-hits.csv\` y \`MANIFEST_SHA256.txt\`.
2. Validar que \`Mesh_0_1\` realmente tiene su material facial y
\`material.map\` original. Para comparar color usar \`material.map\`
(por ejemplo Image_0 del visor, si la asociación es confirmada), NO
\`Image_1\` que pertenece a metallic/roughness y no es el albedo.
Registrar \`material.map.uuid\`, colorSpace y transformaciones UV reales.
3. Usar los 25+25 rayos/samples previamente guardados si tienen
\`faceIndex\`, coordenada de píxel (x,y), UV y el mismo tiempo de pose.
Si no se guardó un dato esencial, recuperar solo las 50 muestras
geométricas en el visor con cámara/pose congeladas.
4. Muestrear localmente el texel de \`material.map\` correspondiente a
cada UV real. Respetar \`texture.matrix\`/\`transformUv\`,
\`flipY\`, wrapping, formato y origen de imagen, \`colorSpace\`,
mip/filtrado cuando sea necesario. Verificar que el origen de
lectura y orientación sean correctos. Si la imagen no puede leerse
(por CORS o comprimida), informar BLOQUEO; no asignar valores inventados.
5. Leer el píxel WebGL de exactamente la misma coordenada y fotograma
a través del capturador R5 existente. Mantener la orientación
\`top-left\`, exposición, salida sRGB, luces y pose. No confundir
un albedo sin iluminación con el píxel final sombreado: comparar
diferencias relativas entre franja y piel control, no esperar igualdad RGB.
6. Guardar tabla de las 50 muestras reales en JSON o CSV:
\`rayId,region,faceIndex,pixel,uv,textureUuid,albedoRGB,renderedRGB\`.
Guardar evidencia de procedencia del muestreador, firmas de escena
y del renderer. No subir texturas privadas a GitHub.
7. Pasar las muestras reales a \`evaluateFaceTexelPixelEvidence\`.
Interpretación orientativa:
   - Si albedo tiene la banda, \`ALBEDO_BAND_CANDIDATE\`:
     investigar textura/UV con revisión independiente.
   - Si albedo es uniforme pero WebGL tiene la banda:
     investigar deformación, material, iluminación y composición.
   - Si ambos tienen banda: no asumir que basta con retocar textura.
8. SOLO si el resultado de albedo no explica el problema, realizar una
comparación mínima con los shape keys: neutral y una expresión de
referencia en copias en memoria; conservar cámara y material. Capturar
píxeles mediante anclas UV/triángulo correspondientes tras re-proyección;
NO comparar píxeles fijos si el rostro se desplaza. Restaurar pesos de
morph originales en \`finally\`.
9. No modificar originales, no crear dientes/lengua artificiales y no
recolorear la sonrisa grabada sin una fuente validada. Verificar
SHA-256 de Natalia y Arnold RC antes/después y regresión mínima.

## Modo de uso (solo el comparador)
\`\`\`js
import {
  evaluateFaceTexelPixelEvidence
} from "./r5-face-texel-pixel-evidence.mjs";

const result=evaluateFaceTexelPixelEvidence({
  frame:{
    width:CAPTURE_WIDTH,height:CAPTURE_HEIGHT,
    cameraSignature:FIRMA_CAMARA_REAL,
    sceneSignature:FIRMA_POSE_REAL,
    textureUuid:MATERIAL_NATALIA_MAP_UUID,
    textureColorSpace:TEXTURE_COLORSPACE_REAL,
    rendererColorSpace:RENDERER_COLORSPACE_REAL,
    samplingMethod:METODO_VERIFICADO,
    readbackOrigin:"top-left"
  },
  samples:MUESTRAS_REALES_DE_R5
});
\`\`\`
Todas las variables en MAYÚSCULAS deben obtenerse del visor. No son
constantes proporcionadas por el repositorio. No reemplazar
\`actualTexelSampled\`/\`actualPixelReadback\` por \`true\` a menos que
ambas lecturas se hayan realizado; la herramienta no puede comprobarlo
independientemente.

## Entrega mínima
- \`reports/r5-face-layers/TEXEL_PIXEL_FINAL_REPORT.md\`
- \`reports/r5-face-layers/texel-pixel-evidence.json\`
- \`reports/r5-face-layers/texel-pixel-evidence.csv\`
- Comparativa visual de región de franja y piel con texel/imagen
  de color vs render, sin publicarla fuera del laboratorio.
- Informe neutral/morph solo si se necesita, con anclas reales.
- Hashes originales pre/post; estado de Messenger/MySQL intacto.

**Dictamen por defecto: CAUSA_NO_DEMOSTRADA.** No aplicar
correcciones permanentes. El resultado debe identificar si hay
justificación para un experimento correctivo MINIMO, o declarar un
bloqueo específico (lectura de textura, UV transform, render pose, etc.).
