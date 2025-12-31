#!/bin/bash
# Script para actualizar el branch Main con el index.html correcto

echo "=== Script de Corrección de GitHub Pages ==="
echo ""

# Verificar que estamos en el repositorio correcto
if [ ! -d ".git" ]; then
    echo "❌ Error: No estás en un repositorio git"
    exit 1
fi

echo "✅ Repositorio detectado"
echo ""

# Obtener el branch actual
CURRENT_BRANCH=$(git branch --show-current)
echo "Branch actual: $CURRENT_BRANCH"
echo ""

# Fetch para asegurar que tenemos la última información
echo "📥 Obteniendo última información del repositorio..."
git fetch origin

# Copiar el index.html correcto del branch main al Main
echo ""
echo "📋 Copiando index.html correcto del branch 'main' al branch 'Main'..."

# Cambiar al branch Main
git checkout Main

# Copiar el archivo
git show origin/main:index.html > index.html

# Crear directorio para workflows si no existe
mkdir -p .github/workflows

# Copiar el workflow
git show origin/main:.github/workflows/static.yml > .github/workflows/static.yml 2>/dev/null || echo "⚠️  Workflow no encontrado en main, creando uno nuevo..."

# Si el workflow no existe en main, crear uno nuevo
if [ ! -f .github/workflows/static.yml ]; then
    cat > .github/workflows/static.yml << 'EOF'
# Simple workflow for deploying static content to GitHub Pages
name: Deploy static content to Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ["main", "Main"]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
# However, do NOT cancel in-progress runs as we want to allow these production deployments to complete.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # Single deploy job since we're just deploying
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          # Upload entire repository
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF
fi

# Verificar cambios
echo ""
echo "📊 Cambios detectados:"
git status --short

# Agregar archivos
echo ""
echo "➕ Agregando archivos..."
git add index.html .github/workflows/static.yml

# Hacer commit
echo ""
echo "💾 Creando commit..."
git commit -m "Corregir index.html y configurar GitHub Pages deployment

- Actualizar index.html con contenido completo y funcional
- Agregar workflow para deployment automático en GitHub Pages
- Configurar para activarse en branches main y Main
- Solucionar problema de página en blanco en GitHub Pages

Fixes deployment issue where Main branch had placeholder content."

# Mostrar el estado
echo ""
echo "✅ Commit creado exitosamente"
echo ""
echo "📤 Para hacer push ejecuta:"
echo "   git push origin Main"
echo ""
echo "O si prefieres usar la interfaz web de GitHub:"
echo "   1. Ve a tu repositorio en GitHub"
echo "   2. Compara y crea un Pull Request"
echo "   3. Mergea los cambios al branch Main"

# Volver al branch original
git checkout $CURRENT_BRANCH

echo ""
echo "✅ Script completado. Regresado al branch: $CURRENT_BRANCH"
