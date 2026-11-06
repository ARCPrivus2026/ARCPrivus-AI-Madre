# ARC PRIVUS — auditoría integral R4 Windows (sin alterar modelos)

**Estado:** herramienta experimental en propuesta #38. No modifica producción,
ni los archivos BLEND/GLB, ni conecta APIs externas. No activa Google ni genera
facturas. Se ejecuta una sola auditoría con Natalia + Copiloto.

## 1. Descubrir archivos existentes

Con Node 22+ y la carpeta de desarrollo R4 disponible, desde la raíz del
repositorio que contiene el archivo \`experimental/arc-multimodal\`:

\`\`\`powershell
node .\experimental\arc-multimodal\r4-integral-preflight.mjs --root "C:\RUTA_REAL_DEL_R4"
\`\`\`

Sustituir \`C:\RUTA_REAL_DEL_R4\` por la carpeta real. El comando NO mueve ni
reescribe BLEND/GLB. Imprime JSON con:
- rutas **relativas** de todos los .blend, .glb, .gltf encontrados;
- grupos de posibles versiones de Natalia y Copiloto;
- cantidad de variantes, tamaño y última modificación;
- advertencias sobre búsquedas incompletas.

Si aparecen varias versiones, **ninguna** se elige automáticamente.
La primera operación no requiere Blender ni claves de API.

## 2. Ejecutar inventario de Blender sobre ambos archivos elegidos

Solo tras identificar los dos originales, indicar las rutas RELATIVAS a R4:

\`\`\`powershell
node .\experimental\arc-multimodal\r4-integral-preflight.mjs --root "C:\RUTA_REAL_DEL_R4" --natalia "SUBCARPETA\NATALIA_ORIGINAL.blend" --copiloto "SUBCARPETA\COPILOTO_ORIGINAL.glb" --blender "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" --out "C:\TEMP\arc-r4-diagnostico.json"
\`\`\`

Los nombres en el ejemplo son **marcadores**, no rutas verificadas.
\`--out\` es opcional. Si se usa, debe apuntar a un archivo nuevo:
el programa no sobrescribe informes existentes. También rechaza usar
como informe el mismo archivo original.

La ruta exacta de Blender puede variar. Se recomienda Blender 4.2 LTS
si coincide con el entorno original, evitando cambios de versión.

## 3. Interpretación responsable

- \`estructura_por_verificar_visual\`: se encontraron nombres de huesos,
  grupos de vértices ponderados, morphs y clips exigidos; **NO está certificado**.
- \`incompleto\`: faltan componentes declarados o pesos de deformación detectables.
- \`error\`: fallo al importar o inventariar.
- \`readyForProduction:false\`: se mantiene SIEMPRE hasta validación audiovisual.

Los conteos de pesos **no** demuestran que la mano sea visible, que los
dedos estén correctamente articulados o que camine de forma natural.
Los nombres de clips tampoco prueban animaciones legibles ni calidad.
No se genera un video ni se instalan dependencias.

## 4. ¿Qué hace falta para autorizar el siguiente enlace?

Después de recibir los informes reales de **ambos** personajes: revisar
mallas y pesos, evaluar clipMap, verificar morphs de boca y párpados,
obtener un controlador de mirada basado en huesos reales, y reproducir
una escena conjunta capturando defectos visuales y tiempos CPU/RAM.
El motor principal Messenger/MySQL/R4 permanece sin cambios.

## 5. Pruebas de la herramienta

\`\`\`powershell
node --test .\experimental\arc-multimodal\*.test.mjs
\`\`\`

Estas pruebas usan modelos ficticios en memoria. Verifican que
- no elija versiones ambiguas;
- no siga enlaces fuera de la carpeta;
- no ejecute Blender con un único personaje;
- no destruya reportes preexistentes;
- registre resultados de ambos o errores de importación;
- bloquee una escena incompleta antes de mover alguno de los dos.

La única forma de evaluar los modelos auténticos es ejecutar el escaneo
dentro de la carpeta R4 que los contiene.


## Evidencia nueva: mano con hueso pero sin geometría suficiente

El auditor Blender ahora calcula \`weightedVertexCounts\` para **cada grupo
de vértices** con un peso mínimo de 0,05 y devuelve las señales:
\`visibleInRender\`, \`visibleInViewport\`, \`boundToArmature\` y
\`unboundMeshNames\` (mallas no asociadas a la armadura elegida).

El consolidado \`r4-integral-preflight.mjs\` exige que cada una de las cuatro
extremidades tenga al menos **tres vértices con influencia suficiente** para
reportar una estructura candidata a validación visual. El reporte contiene
para cada personaje, dentro de \`examined\`:

\`\`\`json
{
  "limbs": {
    "rightHand": {
      "hasBone": true,
      "hasInfluence": false,
      "weightedVertices": 2,
      "minimumVertices": 3,
      "minimumWeight": 0.05
    }
  },
  "quantitativeWeightEvidence": true,
  "status": "incompleto"
}
\`\`\`

Este JSON es un **ejemplo de diagnóstico**, no es un resultado de Natalia
ni del Copiloto originales. Si hay un nombre de hueso pero no hay suficientes
vértices asociados, la auditoría lo denuncia. Si una malla de mano está oculta
para renderizar, vacía o aparece desconectada del esqueleto, se añade a
\`issues\` y/o \`warnings\`.

Los números son un criterio preliminar conservador, **no una garantía de
función anatómica**; una mano requiere geometría visible, topología,
materiales, pesos correctos, articulaciones y animaciones revisadas en
Blender y en Three.js. Los modelos originales no se han ejecutado desde
esta rama de GitHub.

### Validación automatizada de ambos lenguajes

\`\`\`powershell
node --test .\experimental\arc-multimodal\*.test.mjs
python -m unittest discover -s experimental/arc-multimodal -p "test_*.py" -v
\`\`\`

GitHub Actions también realiza las comprobaciones sin invocar Blender de
forma interactiva ni hacer peticiones a Google. Queda pendiente la ejecución
en el computador que contiene la carpeta R4 real.
