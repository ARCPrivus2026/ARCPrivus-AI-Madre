# GitHub Pages Deployment Documentation

## Overview
This document describes the GitHub Pages deployment setup for the ARC Privus AI Madre project.

## Site URL
The site is deployed at: `https://arcprivus2026.github.io/ARCPrivus-AI-Madre/`

## Deployment Configuration

### GitHub Actions Workflow
The site uses GitHub Actions for automatic deployment via `.github/workflows/static.yml`.

**Workflow Trigger:**
- Automatically runs on push to the `main` branch
- Can be manually triggered from the Actions tab

**Deployment Process:**
1. Checks out the repository
2. Sets up GitHub Pages
3. Uploads the site artifact
4. Deploys to GitHub Pages

### Files Included in Deployment
- `index.html` - Main landing page
- `README.md` - Project documentation
- `core/` - Core JavaScript files
- `ai/` - AI module descriptions

### Files Excluded from Deployment
The following files are excluded via `.gitignore`:
- Temporary files (`temp.html`, `*.tmp`)
- Build artifacts (`node_modules/`, `dist/`, `build/`)
- Editor files (`.vscode/`, `.idea/`, `.DS_Store`)
- Development files marked for deletion

## Site Features

### Responsive Design
The site is fully responsive and tested on:
- **Desktop:** 1280x720 and larger
- **Tablet:** 768px width
- **Mobile:** 375px width (iPhone SE) and 480px width

### Interactive Features
1. **Registration Form:** Click "Inscribirme Ahora" button to show the registration form
2. **Form Submission:** Fill in user details and click "Confirmar inscripción"

### Performance
- Single HTML file with embedded CSS and JavaScript
- No external dependencies
- Fast load time with minimal network requests

## Browser Compatibility
Tested and working on:
- Chrome/Chromium
- Firefox
- Safari
- Edge

## Validation
- ✓ HTML structure validated
- ✓ JavaScript functionality tested
- ✓ Responsive design verified
- ✓ No console errors
- ✓ All resources load correctly

## Maintenance

### Making Changes
1. Update files in the repository
2. Commit and push to the `main` branch
3. GitHub Actions automatically deploys the changes
4. Changes appear live within 1-2 minutes

### Troubleshooting
If the site doesn't load:
1. Check GitHub Actions workflow runs for errors
2. Verify GitHub Pages is enabled in repository settings
3. Ensure the deployment branch is set to `gh-pages` or the branch used by the workflow
4. Check browser console for any client-side errors

## Contact
For issues or questions about the deployment, contact the repository maintainer.
