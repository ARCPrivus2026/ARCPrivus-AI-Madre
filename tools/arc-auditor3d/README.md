# ARC Auditor 3D local — versión inicial 0.1

**Estado:** prototipo aislado. **No está integrado todavía a Copilot, Messenger, Blender de Windows ni al panel de ARC**. Se propone como puente verificable de *solo lectura* antes de conectar los motores existentes. No desplegar al servidor de Internet.

## Qué hace realmente

- Un proceso local de Node.js puede recibir una orden `audit natalia` o `audit arnold`.
- Verifica por SHA-256 la fuente antes y después de que Blender la inspeccione.
- Abre un `.blend` o `.glb` en Blender en segundo plano con ejecución automática de Python deshabilitada y registra inventario de mallas, vértices, polígonos, bordes, huesos, shape keys, UV y acciones.
- Escribe un único JSON por auditoría en `%USERPROFILE%\ARC_AUDITOR3D_DATOS\reportes\<personaje>`.
- Usa una API HTTP **solo en 127.0.0.1**, con token obligatorio, para una futura integración de Copilot. Esa integración todavía no existe.
- **No guarda, edita, exporta, sustituye, publica ni elimina ningún modelo.**

## Requisitos

Windows, Node.js 20+ y Blender instalado localmente. Está diseñado para Blender 4.2; otras versiones requieren validación. No necesita npm install, bases de datos ni suscripciones. Las dependencias son las bibliotecas estándar de Node y Python embebido de Blender.

## Una configuración inicial por personaje

Desde CMD en la carpeta del módulo:

```bat
node auditor.mjs status
node auditor.mjs register natalia "D:\DESCARGAS\CARPETA\NATALIA_COPIA_LAB.blend"
node auditor.mjs register arnold "D:\DESCARGAS\CARPETA\ARNOLD_COPIA_LAB.blend"
node auditor.mjs audit natalia
node auditor.mjs audit arnold
```

La ruta de registro debe ser un archivo realmente existente y elegido conscientemente como **copia de laboratorio**. No usar la cabeza manchada V1 ni sustituir modelos productivos. La configuración se guarda **fuera del repositorio** en `%USERPROFILE%\ARC_AUDITOR3D_DATOS\catalogo.json`.

Si Blender no está en la ubicación convencional, define la variable `BLENDER_EXE` con la ruta exacta de `blender.exe`.

## API local (futuro puente Copilot)

No iniciar el servicio sin configurar primero un token secreto de al menos 24 caracteres. La ejecución de API está separada del servidor principal:

```bat
set ARC_AUDITOR_TOKEN=TU_TOKEN_SECRETO_DE_24_O_MAS_CARACTERES
node auditor.mjs serve
```

- `GET /v1/status` con cabecera `Authorization: Bearer <token>`.
- `POST /v1/audits` con el mismo token y JSON `{"character":"natalia"}` o `{"character":"arnold"}`.
- No acepta rutas de modelos proporcionadas por HTTP: solo los dos modelos locales registrados.
- La API es bloqueante para el cliente durante la auditoría y no debe exponerse a Internet ni a Cloudflare Tunnel. Antes de integrarla en el panel hacen falta cola de trabajos, autenticación ligada al usuario y controles de permisos más completos.

## Lo que todavía NO resuelve

El inventario no mide solapamientos triangulares, colisiones, parecido facial, calidad de piel ni sincronización labial. Tampoco sabe recuperar por sí solo las fuentes de Natalia o Arnold desde todas las carpetas de Windows. Esas capacidades requieren rutinas adicionales, pruebas en Blender y aprobación visual. **Un estado de diagnóstico completo no implica una animación aprobada.**

## Seguridad

1. Solo se autorizan `natalia` y `arnold`.
2. Las rutas se registran fuera del repositorio y deben existir.
3. `spawn` de Blender no invoca shell ni ejecuta comandos arbitrarios.
4. Los originales se verifican mediante hash antes y después de la lectura.
5. Todo el código se mantiene separado de `server.js`, Messenger, MySQL y del portal público.
6. Integración a Copilot sujeta a prueba explícita en Windows y revisión del propietario.

## Pruebas

```bat
node --test test.mjs
node auditor.mjs status
```

El archivo de Blender debe ejecutarse en el entorno Blender; no puede validarse mediante Python estándar porque importa `bpy`.