# Natalia R5 — prueba dirigida de triángulos, UV, normales y morphs

## Hechos nuevos del informe local de procedencia (7 nov 2026)
Estos datos proceden de una captura aportada por el usuario; el código de
GitHub no ha vuelto a ejecutar por sí mismo el visor Windows.

- Mesh_0_1 = cara principal de Natalia, asociada a glTF mesh 0, primitive 0.
- Geometría informada: 7.974 índices. Material facial reportado:
  ARNOLRC_V17_ROSTRO_MORPHS_PROTEGIDOS.
- Raycasting local en franja y zona control: 50 muestras intersectaron la
  misma superficie Mesh_0_1. No se halló una segunda malla diferente
  para esos rayos. No descarta triángulos de ESA misma malla que se
  proyecten juntos ni errores de UV/normales/textura.
- Ocultar Mesh_0_1 elimina buena parte de la cara y NO es reparación.
- Se preservaron los GLB originales y el dictamen es CAUSA NO DEMOSTRADA.

## Herramienta nueva
\`r5-face-triangle-uv-evidence.mjs\` exporta \`auditFacialHitTriangles\`.
Recibe los objetos Raycaster hit reales (no cadenas de texto, JSON
inventados ni IDs inferidos). Por cada \`hit.faceIndex\` registra:
- índices de los tres vértices del triángulo;
- sus posiciones, normales y coordenadas UV;
- normal geométrica, área y área UV local;
- grupo de dibujo/material asociado cuando exista;
- textura de color y normal y datos de transparencia;
- estado de morph targets y pesos relevantes.
- \`rayId\` y \`pixel\` (si los proporciona el capturador) para relacionar
  varios impactos de una MISMA línea de visión;
- candidatos a triángulos de la misma malla a una distancia casi idéntica
  en el mismo rayo, sin afirmar que eso demuestre geometría defectuosa.

No modifica geometría, materiales, GLB ni original y no guarda archivos.

## Siguiente sesión local única (sin repetir los barridos R3–R5)
Base existente:

\`D:\DESCARGAS\ARNOLRC_ARNOLD_LOTE1_LAB\ARNOLDVERSE_HUMAN_FACTORY_LOTE_MAESTRO_V2\R5_ATRIBUCION_CAPAS_FACIALES\`

Reutilizar el JSON de procedencia ya creado:

\`reports\r5-face-layers\session_1794051491831\runtime-provenance.json\`
y el cruce \`gltf-primitive-crosswalk.json\`.

1. Verificar el ejecutor y el visor real ya funcionales.
2. Reutilizar 50 rayos de la franja y 50 del control si los hits CRUDOS
   aún están en memoria o en el informe; NO reconstruir falsos
   \`THREE.Intersection\` a partir de promedios o nombres.
3. Si faltan \`faceIndex\` y \`rayId\`, lanzar SOLAMENTE un raycast de
   hasta 50 muestras/ROI del mismo fotograma, guardando el pixel y el
   ID de cada rayo. No repetir renderizaciones de siete u ocho modos.
4. Para cada raycast NO deduplicar por objeto antes de registrar TODAS
   las caras intersectadas de \`Mesh_0_1\`. Guardar \`hit.faceIndex\`,
   \`hit.distance\`, \`hit.uv\`, coordenada del pixel y \`rayId\`. Anotar
   cuál hit queda más cerca de cámara y por qué podría diferir del
   pixel sombreado (alpha, material o deformación).
5. Alimentar \`auditFacialHitTriangles\` con esos hits y la malla real
   \`Mesh_0_1\` cargada. Guardar informe JSON completo.
6. Examinar si la franja coincide con (a) triángulos concretos,
   (b) saltos de UV, (c) discontinuidades de normales, (d) dos caras
   de una misma malla casi coplanares, o (e) morph targets activos.
7. NO llamar \`ROOT_CAUSE_IDENTIFIED\` a una coincidencia de triangulo,
   UV o rayo por sí sola. Para afirmar causalidad hace falta una
   comparación pixel/malla, o un cambio mínimo y reversible
   que elimine la franja conservando toda la identidad.
8. Usar el hash de los GLB ya existente como referencia y compararlo
   al final. No subir modelos/texturas faciales privados al repositorio.

## Integración con Raycaster ya disponible (esquema conceptual)
\`\`\`js
import {auditFacialHitTriangles} from "./r5-face-triangle-uv-evidence.mjs";

const stripeHits=[];
const controlHits=[];
for (const region of ["stripe","control"]) {
  for (const {x,y,id} of muestrasPixelReales[region]) {
    raycaster.setFromCamera({
      x:2*x/renderer.domElement.width-1,
      y:1-2*y/renderer.domElement.height
    },camera);
    // Intersectar la malla real; conservar múltiples caras
    const hits=raycaster.intersectObject(meshNataliaFace,false);
    for (const hit of hits) {
      hit.rayId=String(id);
      hit.pixel={x,y};
      (region==="stripe"?stripeHits:controlHits).push(hit);
    }
  }
}
const result=auditFacialHitTriangles({
  mesh:meshNataliaFace,stripeHits,controlHits,maxHits:500
});
console.log(result.verdict,result.uniqueTriangleCount);
\`\`\`

Este ejemplo presupone \`muestrasPixelReales\` y \`meshNataliaFace\`
extraídos del visor auténtico, no implementados en esta guía. Debe
hacerse sobre la copia de laboratorio ya autorizada. El muestreo debe
conservar el estado de pose/cámara y usar las ROI verificadas del R5.
Si falta una dependencia esencial, reportar bloqueo en lugar de inventarla.

## Resultado exigido
- \`reports\r5-face-layers\triangle-uv-normal-evidence.json\`
- Lista de caras detectadas en la franja y en piel de control, con
  \`faceIndex\`, índices, UVs, normales, material y morphs activos.
- Resumen de posibles discontinuidades con su ubicación exacta en
  pantalla. No proclamar reparación a partir de un raycast.
- Hashes GLB pre/post y verificación de que nada en producción cambió.
- Dictamen final basado en evidencia, \`CAUSA_NO_DEMOSTRADA\` si sigue
  sin existir una comparación causal.

La fase no solicita R6, reconstrucción de rostro ni nuevos modelos.
