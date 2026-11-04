/**
 * ARC Affiliate MySQL staging adapter: deliberately disconnected by default.
 * - Never imports R4 config/db.js or opens R4's connection pool.
 * - Does not touch the existing SQLite demo or start any service.
 * - No production payments or user data.
 */
const STAGING_DB = /^arc_affiliate_staging_[a-z0-9_]{1,32}$/;
const DEDICATED_USER = /^arc_aff_[a-z0-9_]{1,24}$/;
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export class AdapterNotEnabledError extends Error {
  constructor() {
    super('ARC Affiliate MySQL: apagado por defecto. No se abrió ninguna conexión.');
    this.name = 'AdapterNotEnabledError';
  }
}

export function inspectMysqlStagingConfig(env = process.env) {
  // Security-first: return NO credentials or secrets, and do not read an .env file.
  const enabled = env.ARC_AFF_STAGING_CONNECT === '1';
  return Object.freeze({
    adapter: 'mysql2/promise',
    mode: 'STAGING_ONLY',
    enabled,
    connected: false,
    integrationEnabled: false,
    paymentProcessingEnabled: false,
    constraints: [
      'Solo host local y esquema exclusivo arc_affiliate_staging_*',
      'Usuario dedicado arc_aff_*; permisos limitados al esquema Affiliate',
      'No reutilizar config/db.js ni compartir pool de R4',
      'Solo conectar con consentimiento explícito y pruebas de staging',
      'No ejecutar migraciones, pagos ni escrituras en R4',
    ]
  });
}

function validRequired(v, name, regex) {
  if (typeof v !== 'string' || !regex.test(v)) throw new Error('Configuración inválida: ' + name);
  return v;
}

export function getStagingPoolOptions(env = process.env) {
  if (env.ARC_AFF_STAGING_CONNECT !== '1') throw new AdapterNotEnabledError();
  if (env.ARC_AFF_STAGING_ONLY !== '1') throw new Error('Falta confirmación de entorno staging');
  if (['ARC_AFFILIATE_LIVE','ARC_LIVE_PAYMENTS','ARC_ENABLE_PAYOUTS']
    .some(name => /^(true|yes|on|1)$/i.test(String(env[name] || '')))) {
    throw new Error('El piloto prohíbe los pagos reales');
  }

  const host = env.ARC_AFF_DB_HOST;
  if (!ALLOWED_HOSTS.has(host)) throw new Error('Host no permitido: solo MySQL local');
  const database = validRequired(env.ARC_AFF_DB_NAME, 'ARC_AFF_DB_NAME', STAGING_DB);
  const user = validRequired(env.ARC_AFF_DB_USER, 'ARC_AFF_DB_USER', DEDICATED_USER);
  const password = validRequired(env.ARC_AFF_DB_PASSWORD, 'ARC_AFF_DB_PASSWORD', /^.{12,256}$/s);

  if (database === env.ARNOLRC_R4_DB_NAME || database === env.DB_NAME ||
      user === env.DB_USER || user === env.MYSQL_USER) {
    throw new Error('No se pueden reutilizar el esquema ni el usuario de R4');
  }
  const port = env.ARC_AFF_DB_PORT === undefined ? 3306 : Number(env.ARC_AFF_DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Puerto MySQL inválido');

  // Keep this in a private function call; do not log or serialize.
  return Object.freeze({
    host, port, user, password, database,
    waitForConnections: false,
    connectionLimit: 2,
    queueLimit: 0,
    connectTimeout: 3000,
    multipleStatements: false,
    decimalNumbers: false,
    namedPlaceholders: false,
    timezone: 'Z'
  });
}

/**
 * Lazy staged pool creation. This is NOT called by server.mjs or R4.
 * Inject a fake factory in unit tests; no network I/O without explicit opt-in.
 */
export async function createStagingPool(env = process.env, mysqlFactory = null) {
  const options = getStagingPoolOptions(env);
  const driver = mysqlFactory ?? (await import('mysql2/promise'));
  if (typeof driver.createPool !== 'function') throw new Error('Controlador MySQL no compatible');
  return driver.createPool(options);
}
