# R5 — sesión integral de evidencia reproducible (Natalia + regresión Arnold RC)

**Propósito:** ejecutar la batería de siete diagnósticos ya preparada
**en una sola sesión**, con cámara y rostro congelados, ocho capturas PNG
verificadas (la última repite el material original), mediciones ROI y
un resultado honesto. Esta guía no presupone que los modelos auténticos
de Windows estén disponibles en GitHub.

## Archivos ya incluidos en rama experimental PR #38
- \`r5-light-normal-depth-audit.mjs\`: reemplazos temporales para los siete
  modos PBR/Lambert/normales/profundidad. Restaura referencias en \`finally\`.
- \`r5-evidence-session.mjs\`: coordinación de sesión, validación de
  escenas congeladas, PNG únicos y verificados, regiones válidas y control
  de deriva mediante baseline al principio y al final.
- \`r5-scene-fingerprint.mjs\`: firma de cámara, luces, tono, exposición,
  tamaño de canvas, huesos y morphs de los personajes sin modificar nada.
- \`r5-evidence-session.test.mjs\`, \`r5-scene-fingerprint.test.mjs\`:
  ensayos con renderer y capturas falsas, **NO** visualizaciones reales.

## Ruta local reportada
Origen de solo lectura:
\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R4_AISLAMIENTO_PBR_NATALIA\`

Carpeta de trabajo NUEVA:
\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R5_LUZ_NORMALES_PROFUNDIDAD\`

Las rutas se basan en el informe de consola proporcionado por el usuario;
este repositorio no tiene acceso directo al disco Windows.

## Funciones reales que debe proporcionar el visor R4
\`holdScene()\`: suspende el render loop, animaciones y todo cambio de pose;
devuelve una función \`resume()\` que reestablece exactamente el estado
previo. Debe ser un control real del visor; no devolver una función vacía.

\`captureFrame({mode,pass})\`: usa el capturador y el formato WebGL ya
validado por R4. Debe renderizar UNA imagen, guardar PNG y devolver:
\`{width,height,data:Uint8ClampedArray|Uint8Array,imagePath}\`.
\`data\` debe ser RGBA en orden de fila superior a inferior; si se obtiene
por \`readRenderTargetPixels\` invertido verticalmente, convertirlo antes
de calcular regiones. En el navegador no solicitar un contexto 2D del
mismo canvas WebGL existente. El valor \`pass\` es \`series\` o
\`control-final\` para evitar sobrescribir el PNG inicial.

\`verifyArtifact(imagePath)\`: comprobar en el backend local del
laboratorio, mediante \`fs.stat\`, que el PNG existe y contiene bytes.
No aceptar un \`true\` constante ni marcar evidencia inexistente.
No publicar las fotos privadas en un repositorio público.

\`fingerprintThreeScene({renderer,scene,camera,actorRoot})\`: función
de solo lectura. Incluye la pose de Natalia, luces, proyección de cámara,
exposición, resolución y parámetros de presentación. Si el visor contiene
animación de luces o postprocesamiento fuera del renderizador, incluir
también esas fuentes en una firma ampliada. Su omisión puede introducir
falsos resultados.

## Ejemplo de integración para Codex, no copi-and-run
\`\`\`js
import {runR5EvidenceSession} from "./r5-evidence-session.mjs";
import {fingerprintThreeScene} from "./r5-scene-fingerprint.mjs";

const session=await runR5EvidenceSession({
  THREE,
  root:nataliaGLTF.scene,
  meshNames:["Mesh_0"], // Sustituir por los nombres exactos del visor R4.
  stripe:ROI_FRANJA_R4_VALIDADA,
  control:ROI_PIEL_R4_VALIDADA,
  holdScene:async()=>await pausaRealDeEscenaR4(),
  frameSignature:()=>fingerprintThreeScene({
    renderer,scene,camera,actorRoot:nataliaGLTF.scene
  }),
  captureFrame:async ({mode,pass})=>await capturadorWebGLR4({mode,pass}),
  verifyArtifact:async path=>await backendLocalVerificaPng(path)
});
console.log(JSON.stringify(session,null,2));
\`\`\`
Codex deberá resolver los nombres \`pausaRealDeEscenaR4\`,
\`capturadorWebGLR4\`, \`backendLocalVerificaPng\` y los ROI mediante
el código REAL del visor R4. No inventar esas funciones ni usar stubs
vacíos para reclamar éxito. Si no existen, reportar bloqueo.

## Salidas y interpretación
- Capturas en orden: \`baseline\`, \`lambert-smooth\`,
  \`lambert-flat\`, \`pbr-flat\`, \`normal-smooth\`,
  \`normal-flat\`, \`depth\`, \`baseline/control-final\`.
- \`PARTIAL_VISUAL_REVIEW_REQUIRED\`: todas las ocho capturas se aceptaron,
  los PNG se verificaron y la diferencia entre los dos baseline quedó dentro
  de tolerancias. **No** significa que la franja esté corregida.
- \`INVALID_DRIFT\`: la segunda captura base cambió demasiado; no se
  compara la matriz ni se atribuye causalidad.
- \`screenStripeCandidates\`: preselección cuantitativa, \`certified:false\`
  siempre. No cambia materiales definitivos ni sustituye la inspección real.
- \`sourceWriteOperationsByModule:false\`: el módulo no tiene operaciones
  para escribir GLB. \`sourceHashesVerified:false\`: el módulo NO puede
  comprobar desde GitHub los archivos Windows. Comparar SHA-256 antes y
  después fuera de la sesión para certificar esa integridad.
- Si aparece un error GPU, PNG no verificado, región inválida o cambio de
  pose, R5 interrumpe y restablece los materiales y la escena original.

## Entrega de R5 en Windows
Una vez realizado sobre los GLB auténticos, Codex deberá generar:
- \`R5_FINAL_REPORT.md\` con dictamen \`PARCIAL\` o causa demostrada con
  evidencia; no declarar anatomía corregida por un cambio de shader.
- \`r5-evidence.json\`, incluyendo ocho capturas, firmas y métricas.
- \`comparativa_8_capturas.png\` con la referencia inicial/final.
- \`MANIFEST_SHA256_R5.csv\` y comparación con los hashes de R4.
- Informe corto de regresión Arnold RC: funcionamiento corporal/mandíbula,
  sin fingir dientes/lengua, audio real o sincronía labial aún no probados.

No alterar Messenger, MySQL, IA Madre, otras versiones del laboratorio,
GLB fuente ni voces privadas. No recurrir a servicios externos de pago.
No fusionar PR #38 a \`main\` por una prueba simulada.
