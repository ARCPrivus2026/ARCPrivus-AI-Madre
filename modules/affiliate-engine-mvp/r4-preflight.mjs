// ARC R4: diagnóstico de compatibilidad estrictamente de SOLO LECTURA.
// No ejecuta código del proyecto objetivo, no instala paquetes y no abre puertos.
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

function fileExists(root, name) {
  const filename = join(root, name);
  try { return existsSync(filename) && lstatSync(filename).isFile(); }
  catch { return false; }
}
function dirExists(root, name) {
  const filename = join(root, name);
  try { return existsSync(filename) && lstatSync(filename).isDirectory(); }
  catch { return false; }
}
export function inspectR4(rootPath) {
  if (typeof rootPath !== 'string' || !rootPath.trim()) throw new Error('Se requiere la ruta explícita del proyecto R4');
  const root = resolve(rootPath);
  if (!dirExists(root, '.')) throw new Error('No existe la carpeta indicada');
  const entries = readdirSync(root).length;
  if (!fileExists(root, 'package.json')) throw new Error('Falta package.json en la carpeta indicada');
  const packageFile = join(root, 'package.json');
  if (lstatSync(packageFile).size > 512_000) throw new Error('package.json demasiado grande');
  const pkg = JSON.parse(readFileSync(packageFile, 'utf8'));
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('package.json inválido');
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const exists = name => fileExists(root, name);
  const directories = ['routes','services','modules','config','db','database','public','copilot','src']
    .filter(name => dirExists(root, name));
  const servers = ['server.js','server.mjs','index.js','app.js','main.js']
    .filter(name => exists(name));
  const databaseDrivers = ['mysql2','mariadb','pg','sqlite3','better-sqlite3','mongoose']
    .filter(name => Object.hasOwn(deps, name));
  const scripts = Object.keys(pkg.scripts || {});
  const hasEnvFile = exists('.env') || exists('.env.local');
  const hasLockfile = exists('package-lock.json') || exists('pnpm-lock.yaml') || exists('yarn.lock');
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const blockers = [];
  if (nodeMajor < 22) blockers.push('Node.js del entorno de diagnóstico no es compatible con el prototipo');
  if (servers.length === 0) blockers.push('No se encontró un archivo de servidor conocido en la raíz');
  if (databaseDrivers.length === 0) blockers.push('No hay controlador de base de datos reconocido en package.json');
  if (databaseDrivers.length > 1) blockers.push('Hay múltiples controladores de bases de datos: seleccionar uno mediante auditoría');
  const report = {
    module: 'ARC Affiliate / preflight R4',
    mode: 'READ_ONLY',
    integrationEnabled: false,
    productionReady: false,
    version: '0.4-preflight',
    targetFolderName: basename(root),
    nodeVersion: process.version,
    packageName: typeof pkg.name === 'string' ? pkg.name : null,
    packageType: pkg.type === 'module' ? 'module' : 'commonjs-or-unspecified',
    rootEntryCount: entries,
    files: {
      packageJson: true,
      lockfile: hasLockfile,
      envPresent: hasEnvFile, // nunca leer ni imprimir el contenido
      serverCandidates: servers,
      configDbJs: exists('config/db.js'),
      databaseDbJs: exists('database/db.js')
    },
    directories,
    databaseDrivers,
    scriptNames: scripts, // solo nombres; jamás comandos/secretos
    blockers,
    warnings: [
      'No se han verificado puertos, credenciales, conexión MySQL ni compatibilidad funcional',
      'Esta herramienta NO incorpora ni modifica módulos R4',
      'No se debe iniciar el motor comercial ni exponer su puerto mediante túneles'
    ]
  };
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = inspectR4(process.argv[2]);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    // Informa bloqueo, pero no reclama autorización de integración.
    if (result.blockers.length) process.exitCode = 2;
  } catch (e) {
    console.error(JSON.stringify({ mode:'READ_ONLY', integrationEnabled:false, error:e.message }));
    process.exitCode = 2;
  }
}
