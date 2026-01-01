#!/bin/bash
# Script para hacer push del branch Main con las correcciones

echo "🚀 Script de Push Final para GitHub Pages"
echo "=========================================="
echo ""

# Verificar que estamos en el repositorio correcto
if [ ! -d ".git" ]; then
    echo "❌ Error: No estás en un repositorio git"
    exit 1
fi

echo "✅ Repositorio detectado"
echo ""

# Fetch del branch Main
echo "📥 Obteniendo branch Main..."
git fetch origin Main:Main

# Verificar que el fetch fue exitoso
if [ $? -ne 0 ]; then
    echo "❌ Error al obtener el branch Main"
    exit 1
fi

echo "✅ Branch Main actualizado"
echo ""

# Cambiar al branch Main
echo "🔄 Cambiando al branch Main..."
git checkout Main

if [ $? -ne 0 ]; then
    echo "❌ Error al cambiar al branch Main"
    exit 1
fi

echo "✅ En branch Main"
echo ""

# Verificar el último commit
echo "📋 Último commit en Main:"
git log -1 --oneline
echo ""

# Hacer push
echo "📤 Haciendo push al repositorio remoto..."
git push origin Main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Push exitoso!"
    echo ""
    echo "🎉 Las correcciones han sido aplicadas al repositorio remoto"
    echo ""
    echo "📍 Próximos pasos:"
    echo "   1. Ve a: https://github.com/ARCPrivus2026/ARCPrivus-AI-Madre/actions"
    echo "   2. Espera que el workflow 'Deploy static content to Pages' termine"
    echo "   3. Visita: https://arcprivus2026.github.io/ARCPrivus-AI-Madre/"
    echo ""
    echo "⏱️  El deployment tomará aproximadamente 1-2 minutos"
    echo ""
else
    echo ""
    echo "❌ Error al hacer push"
    echo ""
    echo "Si ves un error de autenticación, asegúrate de:"
    echo "   - Tener permisos de escritura en el repositorio"
    echo "   - Estar autenticado correctamente con GitHub"
    echo ""
    exit 1
fi
