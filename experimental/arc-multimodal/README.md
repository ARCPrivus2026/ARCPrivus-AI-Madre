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


## Nuevo puente Three.js - GLB + voz (sin coste de API)
- \`three-avatar-adapter.mjs\`: usa AnimationMixer/AnimationAction de Three.js.
  Resuelve clips reales Idle/Walk/Run/Sit/Stand o un clipMap explicito.
  Controla morphs jawOpen/eyeBlink y ofrece update(deltaSeconds) para el bucle
  de renderizado. NO guarda ni modifica el archivo GLB original.
- \`browser-avatar-stage.mjs\`: carga dos GLB locales por GLTFLoader.loadAsync y
  conecta el director audiovisual a Web Speech API del navegador.
- El modelo real se carga **solo cuando el R4 tenga sus GLB listos en una ruta
  servida por la aplicacion**; no incluye ni inventa un GLB Natalia/Copiloto.
- Un controlador real de mirada (dependiente de la orientacion de ojos del rig)
  debe implementarse antes de marcar la etapa integral como lista.
- El movimiento de labios basado en ritmo del habla es **aproximado**, no
  sincronizacion de visemas comprobada. La API Web Speech puede depender del
  navegador, voces instaladas o conexion, y puede exigir un gesto del usuario.
- La voz del navegador es generica y NO clona a ninguna persona.

### Ejemplo de conexion en un frontend que YA usa Three.js
Importar desde una aplicacion ESM con dependencias de Three.js configuradas:
\`\`\`js
import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {
  createBrowserSpeechDriver,loadArcAvatarStage
} from "./browser-avatar-stage.mjs";

const voice=createBrowserSpeechDriver({lang:"es-CO"});
const stage=await loadArcAvatarStage({
  THREE,loader:new GLTFLoader(),
  paths:{
    natalia:"/models/natalia-validada.glb",
    copiloto:"/models/copiloto-validado.glb"
  },
  speakers:{natalia:voice,copiloto:voice},
  lookControllers:{
    // REEMPLAZAR con implementaciones reales adecuadas a cada rig.
    // No colocar una funcion vacia ni afirmar mirada funcional.
  }
});
console.log(stage.audits);
if(!stage.ready) throw new Error("Etapa sin auditar completamente");
// Solo tras auditoria y con scene/renderer/camera ya preparados:
scene.add(stage.roots.natalia,stage.roots.copiloto);
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  stage.update(clock.getDelta());
  renderer.render(scene,camera);
});
// Activar reproduccion de audio despues de un click del usuario.
// El director permite comandos simultaneos en canales distintos.
const result=await stage.play([
  {atMs:0,character:"natalia",action:"walk"},
  {atMs:0,character:"copiloto",action:"run"},
  {atMs:100,character:"natalia",action:"speak",text:"Bienvenido a ARC Privus."},
  {atMs:150,character:"copiloto",action:"blink"}
]);
console.log(result);
\`\`\`
El ejemplo es una **plantilla**, no una aplicacion desplegada. No ejecutar
sin los controladores de mirada reales y los GLB originales verificados.
La llamada a play informa el inicio de los eventos, no que el sonido haya
terminado. Para confirmar final de la reproduccion usar waitForVoices().

### Limitaciones y salidas de pruebas
Los tests emplean **GLTF y voz simulados**; no sustituyen una prueba visual
sobre los GLB autenticos. Sin esos originales no podemos certificar mano,
mirada, marcha de 23 anos, ropa, piel, dientes, lengua o lip-sync.
El objetivo es que el sistema no declare exitoso lo que aun no puede probar.
Archivos de motor, base de datos y mensajes en main no se modificaron.


## Auditoría de skinning real (6 de noviembre de 2026)
Los metadatos del esqueleto, por sí solos, **no prueban** que una mano
exista en la malla. El nuevo módulo \`skinning-geometry-audit.mjs\` inspecciona
los atributos \`skinIndex\` y \`skinWeight\` de cada \`SkinnedMesh\` del GLTF
cargado, y cuenta los vértices suficientemente influidos por huesos de
mano izquierda, mano derecha y los dos pies.

Salida adicional del inspector \`inspectLoadedGlb\`:
- \`audit.skinningStatus\`: \`analyzed\` o \`unavailable\`.
- \`skinning.targets.rightHand.vertices\`: número de vértices relacionados
  con esa mano (umbral de peso por defecto: 0,05).
- \`skinning.issues\`: explicación cuando faltan influencias o los datos
  están incompletos.

Si no hay mallas \`SkinnedMesh\` analizables, el modelo **no recibe
certificación de rig preparado**. La protección de \`stage.play()\` bloquea
la escena completa ANTES de arrancar movimientos de Natalia o Copiloto
cuando alguno no supera las auditorías.

Prueba añadida: dos personajes simulados; el Copiloto tiene un hueso
\`RightHand\` presente pero cero vértices asociados; el director debe
rechazar la escena sin ejecutar ni siquiera el movimiento de Natalia.

LIMITACIÓN: contar pesos por hueso no comprueba la silueta de la mano,
la visibilidad de la malla, ni la correcta orientación de muñeca y dedos.
Tampoco acredita una prueba de Three.js con GLB auténticos; sigue
faltando inspección y reproducción visual en el R4 de Windows.

Esta fase es 100% lógica y de solo lectura: ni el GLB ni el blend original
son reescritos. Los tests usan geometrías sintetizadas en memoria.


## NUEVO: Auditoría R4 auténtica de los dos avatares en una sola ejecución

Se agregó \`r4-integral-preflight.mjs\` con una exploración limitada
del árbol real de Windows R4 y pruebas de seguridad:
- descubre todas las versiones BLEND/GLB/GLTF sin descargar ni cambiar nada;
- clasifica candidatos por nombre, pero **nunca selecciona por fecha ni adivina**;
- exige archivos separados de Natalia y Copiloto para la inspección real;
- invoca Blender 4.2 en modo \`-b\` para los dos modelos explícitamente elegidos;
- inspecciona huesos, grupos con peso, morphs y nombres de acciones;
- produce un único informe con los dos resultados y las incidencias;
- nunca declara \`readyForProduction=true\` sin verificación visual posterior;
- sin opción \`--out\`, solo imprime el informe por pantalla;
- con \`--out\`, solo crea un informe nuevo y no sobrescribe originales.

Instrucciones completas: [R4-WINDOWS-AUDITORIA.md](./R4-WINDOWS-AUDITORIA.md).

La copia pública del repositorio no contiene los archivos BLEND/GLB
originales del R4, por lo que el resultado sobre los avatares reales
no puede conocerse desde GitHub sin acceso a esos archivos.


## Diagnóstico geométrico R4 v2: pesos reales de Blender
Actualización 6 nov 2026: \`blender-rig-inventory.py\` ahora calcula
\`weightedVertexCounts\` por grupo (umbral 0,05), enumera mallas ocultas
y separa las mallas no vinculadas a la armadura principal. El auditor
integral exige evidencia cuantitativa y marca como incompletas manos o
pies con menos de 3 vértices suficientemente ponderados. No confundir
este umbral preliminar con certificación visual de dedos o de marcha.

La suite incorpora tests de Python sin Blender: \`test_blender_inventory.py\`.
Ver [R4-WINDOWS-AUDITORIA.md](./R4-WINDOWS-AUDITORIA.md) para ejecución
integral con los dos originales y un único reporte JSON. Nunca se activa
\`readyForProduction\` sin inspección real en Windows R4.


## Prueba visual integral de Natalia + Copiloto (nueva)
Se añadió \`blender-visual-proof.py\` y \`r4-integral-visual.mjs\`.
Sin alterar los originales, la herramienta construye una revisión visual local
en **una única orden**: siete vistas diagnósticas por personaje y una
página comparativa \`index.html\` que coloca Natalia y Copiloto lado a lado.
Incluye informes \`evidence.json\` y hashes SHA-256 de los PNG generados.

Los tests offline comprueban no sobrescribir carpetas, aceptar solo PNG
válidos y nombres esperados, no permitir rutas de originales fuera de R4,
registrar controles/acciones faltantes y escapar contenido no confiable
en el informe HTML. Las pruebas NO ejecutan Blender real en GitHub Actions.

\`blender-visual-proof.py\` trabaja con Blender Workbench a 512 px, máximo
dos hilos, y \`--disable-autoexec\`; las imágenes son evidencia geométrica
preliminar, no animación realista, videos ni voces. El script no guarda
archivos .blend/.glb/.gltf y no altera la rama principal.

**Uso completo:** [R4-PRUEBA-VISUAL-INTEGRAL.md](./R4-PRUEBA-VISUAL-INTEGRAL.md).
Los modelos originales siguen sin estar disponibles para esta sesión.


## Motor creativo universal + ARC Consciousness V4 (6 nov 2026)
Se incorporó una arquitectura opcional para conectar el ARC Consciousness
Engine V4.0.0 aportado por el propietario con un estudio editorial y
audiovisual reutilizable. Este proyecto admite proyectos de video,
película, serie, novela, programa y futuros copilotos. Integra:
creative-universe.mjs, consciousness-creative-bridge.mjs,
creative-arc-preset.mjs y local-creative-planner.mjs.

La prueba piloto planifica conjuntamente Natalia y Arnold RC, pero el
presupuesto, permisos biométricos, archivos originales y render real
siguen bloqueados o pendientes. El planificador local solo entrega
guiones y storyboards estructurados, sin generación multimedia.

**Guía:** [ARC-CREATIVE-STUDIO-V4-INTEGRATION.md](./ARC-CREATIVE-STUDIO-V4-INTEGRATION.md).

El archivo V4 original no se copia al repositorio público. La
compatibilidad de la cola cognitiva se ensayó localmente contra el archivo
compartido; CI usa un simulador de su interfaz. Este PR sigue sin
desplegarse al R4 principal ni fusionarse a main.


## R4: aislamiento PBR de la franja de Natalia (posterior al informe R3)
Se añade \`pbr-facial-channel-isolation.mjs\` para distinguir por separado
la textura metálica (B) y de rugosidad (G) \`Image_1\` detectada en R3,
y \`pbr-facial-channel-isolation.test.mjs\` para verificar restauración de
materiales aun ante errores. Funciona exclusivamente como ayuda diagnóstica
en un visor Three.js **real del laboratorio aislado de Windows**: la CI
prueba solamente materiales y capturas simulados, NO los modelos reales.

Guía de puesta en práctica local:
[R4-PBR-NATALIA-CANAL-ISOLATION.md](./R4-PBR-NATALIA-CANAL-ISOLATION.md).

R3 ya completó Blender pero NO demostró la causa de la franja. Nunca
confundir éxito de tests con identidad corregida. Los materiales originales
se preservan y tampoco se modifican \`main\` ni Messenger.


## R5 Natalia - iluminación, normales y profundidad (posterior a R4)
R4 reportó siete capturas PBR sin corregir la franja. Desactivar
metalnessMap redujo tanto la franja como la piel sana; no era una mejora.
Se incorpora \`r5-light-normal-depth-audit.mjs\`, una comparación aislada
mediante materiales temporales de Lambert suave/plano, PBR plano,
visualización de normales y profundidad. Incluye medidas ROI con
validación de coordenadas y una barrera para evitar declarar mejoras
basadas solamente en oscurecimiento global.

[Instrucciones para el laboratorio local Windows R5](./R5-NATALIA-LUZ-NORMALES-PROFUNDIDAD.md).

Los tests GitHub usan Three.js y fotogramas simulados: NO son evidencia
de que la franja facial haya sido corregida ni certificación anatómica.
Los GLB de producción siguen sin acceso desde este repositorio. 


### R5 — sesión reproducible y control de deriva
Se sumaron \`r5-evidence-session.mjs\` y \`r5-scene-fingerprint.mjs\`.
R5 permite ahora congelar un visor de laboratorio, capturar las siete
variantes más un baseline final de control, exigir PNG verificables,
comparar medianas de zonas de franja y piel sana, y rechazar la sesión si
cambian cámara, luces, pose, resolución o los valores de referencia.
\`PARTIAL_VISUAL_REVIEW_REQUIRED\` no implica rostro reparado.

[Guía para ejecutar una sola sesión con capturas auténticas en R5
Windows](./R5-SESION-EVIDENCIA-REPRODUCIBLE.md).

Los datos de CI son simulados: falta correrlo sobre la copia de Windows,
producir los ocho PNG y verificar SHA-256 de los originales. El módulo no
realiza escrituras GLB ni acredita hash de archivos locales.
