# ARC PRIVUS R4 — PRUEBA AUDIOVISUAL VISUAL INTEGRAL
**Estado: experimental / solo lectura de modelos, no desplegado.**

Esta herramienta trabaja con **Natalia y el Copiloto en la MISMA ejecución**.
Realiza los inventarios de los dos originales con Blender, obtiene hasta siete
capturas diagnósticas por personaje y crea una página HTML comparativa sin
conexión a internet. Nunca modifica los archivos de origen.

## Requisitos reales
- Windows con **R4 disponible** y los archivos originales .blend/.glb accesibles.
- Node.js 22 o superior.
- Blender 4.2 LTS compatible con los originales, con interfaz de línea de comandos.
- Copia local de esta carpeta experimental de GitHub.
- Una carpeta de salida NUEVA cuyo directorio principal ya exista.
- Sin pagos, claves, Google, MySQL ni instalación adicional de paquetes npm.

Si el PC no inicia, no se podrá comprobar los GLB locales desde GitHub.

## Paso 1: identificar los archivos originales sin adivinar nombres

En PowerShell, desde la carpeta raíz del repositorio:

    node .\experimental\arc-multimodal\r4-integral-preflight.mjs --root "C:\RUTA_VERIFICADA\R4"

Esta búsqueda muestra versiones posibles para cada personaje y archivos
sin identificar. No selecciona automáticamente copias viejas o ambiguas.

## Paso 2: ejecutar UNA prueba integral de los DOS personajes

Sustituir los marcadores por rutas existentes dentro de R4:

    node .\experimental\arc-multimodal\r4-integral-visual.mjs --root "C:\RUTA_VERIFICADA\R4" --natalia "SUBCARPETA\NATALIA_ORIGINAL.blend" --copiloto "SUBCARPETA\COPILOTO_ORIGINAL.glb" --blender "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" --visual-dir "C:\Users\Public\Documents\ARC_EVIDENCIA_R4_001"

Los nombres aquí son **ejemplos**, no archivos confirmados.
No ejecutar hasta saber cuáles son las dos versiones que deben auditarse.

\`--visual-dir\` **NO debe existir**; el programa creará la carpeta nueva. Si
existe, la ejecución se detiene sin sobrescribir nada. La carpeta anterior
("C:\Users\Public\Documents" en el ejemplo) debe existir.

Blender corre en modo sin ventana, con scripts de arranque automático
desactivados y máximo dos hilos de trabajo para limitar el impacto.

## Evidencias generadas

Dentro de \`--visual-dir\`:
- \`index.html\`: comparación local Natalia vs Copiloto, uno junto al otro.
- \`evidence.json\`: inventarios, advertencias e identificadores SHA-256 de
  cada PNG aceptado.
- Hasta **14 PNG**: cuerpo frontal, caminar, correr, boca abierta, parpadeo,
  detalle mano izquierda, detalle mano derecha, siete por personaje.

Si no existe un clip o shape key necesario, la captura correspondiente se
marca como ausente. El programa no inventa un movimiento ni reconstruye la
mano faltante para completar una imagen. Si el render de un personaje falla,
el informe registra el error y conserva la información del otro.

El color y la iluminación son de **Blender Workbench** y sirven para revisar
geometría, no para medir realismo cinematográfico. Las imágenes de caminar
y correr son fotogramas de acciones identificadas por nombre, no videos
que demuestren una marcha correcta. La boca y el párpado se prueban con
shape keys de manera artificial: **no equivalen a sincronización de audio**.

## Qué se revisará después de ejecutar

1. ¿Se ven las dos manos completas? ¿Hay dedos y muñecas reales?
2. ¿La mano derecha del Copiloto aparece tanto en perfil como en detalle?
3. ¿El rostro presenta franja oscura, ojos anómalos o geometría rota?
4. ¿Se visualizan cambios auténticos en caminar, correr y formas faciales?
5. ¿Qué acciones, morphs o grupos con pesos de vértices siguen faltando?
6. ¿Qué diferencias concretas muestran Natalia y Copiloto en la misma tabla?

El informe siempre establece \`readyForProduction:false\`. Una captura no
autoriza la publicación ni el cambio de la rama principal. Los originales
solo se abrirán para inspección; NO se hará \`save\` de .blend, .glb o .gltf.

## Pruebas de desarrollo en GitHub

    node --test experimental/arc-multimodal/*.test.mjs
    python -m unittest discover -s experimental/arc-multimodal -p "test_*.py" -v

Estas pruebas validan el control de procesos, la ausencia de sobreescrituras,
los archivos simulados, el formato de la comparación y la restauración
de shape keys. **No sustituyen una ejecución de Blender 4.2 con los originales.**

Después de ejecutar, compartir \`evidence.json\` y, si se desea, las
capturas concretas de \`index.html\`. No hay necesidad de enviar claves,
base de datos, mensajes privados ni carpetas completas.
