/**
 * ARC Affiliate staging connectivity probe.
 * Explicitly opt-in. Performs ONE SELECT only; always releases connection and ends its own pool.
 * Not used by the R4 server, the Affiliate demo, or any production application.
 */
import { createStagingPool, getStagingPoolOptions } from './mysql-staging-adapter.mjs';

export async function probeIsolatedMysql(env = process.env, driver = null) {
  const options = getStagingPoolOptions(env); // refuses connection unless staging opted in
  let pool;
  let connection;
  try {
    pool = await createStagingPool(env, driver);
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT DATABASE() AS active_schema, CURRENT_USER() AS authenticated_user, 1 AS probe_ok'
    );
    const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!row || row.active_schema !== options.database ||
        typeof row.authenticated_user !== 'string' ||
        !row.authenticated_user.startsWith(options.user + '@') ||
        Number(row.probe_ok) !== 1) {
      throw new Error('MySQL no confirmó el esquema y usuario exclusivos de Affiliate');
    }
    return Object.freeze({
      status: 'PASSED',
      mode: 'STAGING_PROBE_ONLY',
      activeSchema: row.active_schema,
      dedicatedUserConfirmed: true,
      writesPerformed: false,
      paymentsEnabled: false,
      productionReady: false
    });
  } finally {
    try {
      if (connection) connection.release();
    } finally {
      if (pool) await pool.end();
    }
  }
}
