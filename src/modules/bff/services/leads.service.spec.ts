import { LeadsService } from './leads.service';
import { DataSource } from 'typeorm';

function createMockDataSource(rows: any[]) {
  return {
    query: jest.fn(async () => rows),
  } as unknown as DataSource;
}

describe('LeadsService (unit)', () => {
  it('list maps items and nextCursor', async () => {
    const ds = createMockDataSource([
      { id: 2, public_id: 'uuid-2', name: 'B', phone: '2', source: 'whatsapp', stage: 'new', created_at: '2025-10-11T00:00:00.000Z', last_message_at: null },
      { id: 1, public_id: 'uuid-1', name: 'A', phone: '1', source: 'whatsapp', stage: 'new', created_at: '2025-10-10T00:00:00.000Z', last_message_at: null },
    ]);
    const svc = new LeadsService(ds);

    const res = await svc.list(1, { limit: 2 });
    expect(res.items.map(i => i.id)).toEqual(['uuid-2', 'uuid-1']);
    expect(res.nextCursor).toBeNull();
  });
});
