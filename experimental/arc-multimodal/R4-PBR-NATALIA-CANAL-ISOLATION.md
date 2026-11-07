# ARC Privus - Aislamiento R4 de canales PBR de Natalia

## Situacion de partida (informe local R3; no verificado en esta sesion)
- Blender R3 termino 34 renders, sin traceback. La franja oscura permanece en WebGL.
- El nodo Image_1 alimenta Metallic (azul, B) y Roughness (verde, G).
- Pruebas de cambiar valores numericos en Blender **sin desconectar los links**
  no son evidencia causal: el valor final sigue dependiendo de la textura.
- Unlit elimina la franja, pero NO prueba la causa raiz ni autoriza modificar
  geometria, piel, albedo, normal o identidad del personaje.

## Proposito
Separar experimentalmente los factores metalicos y de rugosidad de la
textura PBR, sin guardar GLB ni cambiar el material fuente. La captura
debe hacerse en el navegador REAL del laboratorio R3 de Windows, si
este usa Three.js. No se afirma que el codigo ya se haya ejecutado ahi.

## Archivo de prueba
\`pbr-facial-channel-isolation.mjs\`

\`runPBRVariants({root,meshNames,capture})\` requiere:
1. Una escena GLTF ya cargada con \`root.traverse()\`.
2. Nombres **exactos** de las mallas faciales (obtenerlos del inventario R3).
   No usar nombres ficticios como si fueran hechos; \`Mesh_0\` es solo el
   nombre reportado en una auditoria anterior.
3. Función \`capture\` que renderice y GUARDE una captura del canvas usando
   el sistema de captura que ya tenga el laboratorio.
4. Renderizado detenido o bajo control exclusivo durante las capturas para
   no intercalar fotogramas con materiales temporales.

### Ejemplo conceptual (Three.js, NO autocontenido)
\`\`\`js
import {runPBRVariants} from "./pbr-facial-channel-isolation.mjs";
// El laboratorio local proporciona: gltf, renderer, scene, camera y captureFrame.
// Reemplazar el nombre por las mallas verificadas en la auditoria R3.
const inventory=await runPBRVariants({
  root:gltf.scene,
  meshNames:["Mesh_0"],
  capture:async ({variant,summary})=>{
    // Misma camara, pose, exposicion, iluminacion y resolucion en todos los casos.
    renderer.render(scene,camera);
    return captureFrame({name:"natalia-pbr-"+variant+".png",summary});
  }
});
console.log(inventory.experiment,inventory.restored,inventory.inventory);
\`\`\`

Si el laboratorio usa otra biblioteca WebGL, NO importar el modulo
literalmente: ejecutar una prueba equivalente con el motor que realmente
use, guardando los materiales originales y restaurandolos en \`finally\`.

## Matriz de capturas controladas
1. \`baseline\` - material original sin tocar.
2. \`metal-map-off\` - desconectar solo metalnessMap (B), factor sin cambios.
3. \`rough-map-off\` - desconectar solo roughnessMap (G), factor sin cambios.
4. \`both-maps-off\` - desconectar ambos mapas.
5. \`metal-factor-zero\` - fuerza factor metalness=0 SIN desconectar su mapa.
6. \`roughness-constant-one\` - desconecta mapa G y aplica roughness=1.
7. \`neutral-skin\` - metalness=0, roughness=1 y desconecta ambos mapas.

Cada configuracion de las filas 2–7 se aplica SOLO a materiales
\`clone()\`; nunca a los objetos materiales fuente, ni a la textura
\`Image_1\`, geometria, huesos o morphs. Todos los materiales originales
se restauran incondicionalmente al salir de cada captura.

**Precaucion causal:** las variantes 6 y 7 cambian dos/cuatro atributos
para producir referencias de iluminacion; no son experimentos de una sola
variable. La clave para aislar factores esta en las filas 2, 3 y 5.
La eliminacion de la franja en alguna variante demostraría una
dependencia de esa configuracion PBR, NO automaticamente una causa
geometrica ni una reparacion anatomica definitiva.

## Criterio de salida
- Capturas PNG no vacias, mismo encuadre y timing, guardar inventario
  \`materialSummary\` por variante; documentar textura, canales y colorSpace.
- Confirmar \`Image_1\` y \`NoColorSpace\` o el espacio de datos equivalente
  para metallicRoughnessTexture. No cambiar colorSpace sin evidencia.
- Registrar una ROI de franja y una ROI de piel sana, con diferencia
  comparable de luminosidad, no solo apariencia subjetiva.
- Confirmar identidades y SHA-256 de GLB antes/despues, sin overwrites.
- Si el resultado no identifica propiedad de forma reproducible, mantener
  dictamen PARCIAL y no modificar las fuentes ni proclamar cara corregida.
- No ejecutar servicios de IA, ni nube, ni compras.

## Estado del modulo
Pruebas GitHub Actions con objetos de material y mallas SIMULADOS.
No se ejecuta Blender, Three.js/WebGL real ni los originales Windows por
estas pruebas. La tarea local de Codex es efectuar las capturas reales.

Referencias:
- Khronos glTF 2.0: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- Three.js MeshStandardMaterial:
  https://threejs.org/docs/pages/MeshStandardMaterial.html
