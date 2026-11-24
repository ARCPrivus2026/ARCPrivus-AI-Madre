-- Ejecutar únicamente en una base MySQL dedicada a ARC Market.
-- Crear un usuario de ejecución separado con SELECT, INSERT, UPDATE sobre esta tabla.
CREATE TABLE IF NOT EXISTS arc_market_provider_events (
 account_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 event_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 event_type VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_ms BIGINT UNSIGNED NOT NULL,
 transaction_code VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 product_id BIGINT UNSIGNED NOT NULL,
 received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (account_id,event_id),
 KEY idx_transaction (account_id,transaction_code,created_ms),
 KEY idx_event (account_id,event_type,created_ms)
) ENGINE=InnoDB;
