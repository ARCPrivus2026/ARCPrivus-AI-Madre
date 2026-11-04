import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagingPool, getStagingPoolOptions } from './mysql-staging-adapter.mjs';
import { probeIsolatedMysql } from './mysql-staging-probe.mjs';

// This file is harmless outside the isolated CI MySQL service: tests skip unless
// explicitly enabled. It never connects to the user's Windows R4 database.
const enabled = process.env.ARC_AFF_MYSQL_CI_TEST === '1';

test('MySQL real: conexión local de Affiliate, consulta y cierre del pool', { skip: !enabled }, async () => {
  const report = await probeIsolatedMysql(process.env);
  assert.equal(report.status, 'PASSED');
  assert.equal(report.mode, 'STAGING_PROBE_ONLY');
  assert.equal(report.activeSchema, 'arc_affiliate_staging_ci');
  assert.equal(report.dedicatedUserConfirmed, true);
  assert.equal(report.writesPerformed, false);
  assert.equal(report.paymentsEnabled, false);
  assert.equal(report.productionReady, false);
  assert.equal(Object.hasOwn(report,'password'),false);
});

test('MySQL real: usuario CI solo autorizado para su esquema temporal', { skip: !enabled }, async () => {
  const opts = getStagingPoolOptions(process.env);
  assert.equal(opts.database, 'arc_affiliate_staging_ci');
  assert.equal(opts.user, 'arc_aff_ci');
  let pool;
  let connection;
  try {
    pool = await createStagingPool(process.env);
    connection = await pool.getConnection();
    const [rows] = await connection.query('SHOW GRANTS FOR CURRENT_USER()');
    const grants = rows.flatMap(row=>Object.values(row)).join('\n');
    // MYSQL_USER is created by the ephemeral container with access to only
    // MYSQL_DATABASE, plus global USAGE (not global ALL PRIVILEGES).
    assert.match(grants,/arc_affiliate_staging_ci/i);
    assert.doesNotMatch(grants,/GRANT ALL PRIVILEGES ON \\*\\.\\*/i);
  } finally {
    try { if (connection) connection.release(); }
    finally { if (pool) await pool.end(); }
  }
});
