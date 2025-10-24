import dataSource from '../../config/database.config';

async function run() {
  await dataSource.initialize();

  const organizationId = 1;
  const slug = 'corte-feminino';

  const existing = await dataSource.query(
    'SELECT id FROM services WHERE organization_id = $1 AND slug = $2',
    [organizationId, slug]
  );

  if (existing.length > 0) {
    console.log('✅ Sample service already exists:', slug);
    await dataSource.destroy();
    return;
  }

  await dataSource.query(
    `INSERT INTO services (
      organization_id, suborganization_id, slug, title, category, audience, service_type, tags, source_url, content, status
    ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, NULL, $8, 'active')`,
    [
      organizationId,
      slug,
      'Corte Feminino',
      'hair',
      'women',
      'servico',
      JSON.stringify(['cabelo','corte','feminino']),
      'Serviço de corte feminino básico',
    ]
  );

  console.log('✅ Sample service inserted:', slug);
  await dataSource.destroy();
}

run().catch((e) => { console.error(e); process.exit(1); });
