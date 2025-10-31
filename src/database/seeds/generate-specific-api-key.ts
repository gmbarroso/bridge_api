import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import dataSource from '../../config/database.config';

async function generateSpecificApiKey() {
  await dataSource.initialize();

  const organizationId = 1;
  const apiKey = `bridge_1_1729543200000_dev`; // A key que você está tentando usar
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  const hmacSecret = `bridge_hmac_1_1729543200000_dev`;

  // Verificar se já existe
  const existing = await dataSource.query(`
    SELECT * FROM api_keys WHERE key_hash = $1
  `, [keyHash]);

  if (existing.length > 0) {
    console.log('🔑 API Key já existe!');
    console.log(`API Key: ${apiKey}`);
    console.log(`Organization ID: ${organizationId}`);
    await dataSource.destroy();
    return;
  }

  await dataSource.query(
    `INSERT INTO api_keys (organization_id, key_hash, name, hmac_secret, permissions)
     VALUES ($1, $2, $3, $4, $5::jsonb)
  `, [organizationId, keyHash, 'Dev API Key - Postman', hmacSecret, JSON.stringify({ scope: 'ingest' })]);

  console.log('🔑 API Key criada com sucesso!');
  console.log(`API Key: ${apiKey}`);
  console.log(`Organization ID: ${organizationId}`);
  console.log(`Key Hash: ${keyHash}`);
  console.log(`HMAC Secret: ${hmacSecret}`);

  await dataSource.destroy();
}

generateSpecificApiKey().catch(console.error);
