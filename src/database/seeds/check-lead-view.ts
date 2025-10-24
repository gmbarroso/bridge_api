import dataSource from '../../config/database.config';

async function run() {
  await dataSource.initialize();
  const phone = process.argv[2] || '+5511999999999';
  const rows = await dataSource.query(
    `SELECT id, public_id, organization_id, name, phone, servico_desejado FROM lead_unified_view WHERE phone = $1 LIMIT 5`,
    [phone]
  );
  console.log(JSON.stringify(rows, null, 2));
  await dataSource.destroy();
}

run().catch((e) => { console.error(e); process.exit(1); });
