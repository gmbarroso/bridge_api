import { LeadsService } from './leads.service';
import { DataSource } from 'typeorm';
import { CacheService } from '../../../common/cache/cache.service';

function createMockDataSource(rows: any[]) {
  return {
    query: jest.fn(async () => rows),
  } as unknown as DataSource;
}

function createMockCache() {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (k: string) => store.get(k) || null),
    set: jest.fn(async (k: string, v: string) => { store.set(k, v); return; }),
    getJSON: jest.fn(async (k: string) => {
      const raw = store.get(k);
      return raw ? JSON.parse(raw) : null;
    }),
    setJSON: jest.fn(async (k: string, v: any) => { store.set(k, JSON.stringify(v)); }),
    hash: jest.fn((x: any) => 'hash'),
  } as unknown as CacheService;
}

describe('LeadsService (unit)', () => {
  it('list maps items and nextCursor', async () => {
    const ds = createMockDataSource([
      { id: 2, public_id: 'uuid-2', name: 'B', phone: '2', source: 'whatsapp', stage: 'new', created_at: '2025-10-11T00:00:00.000Z', last_message_at: null },
      { id: 1, public_id: 'uuid-1', name: 'A', phone: '1', source: 'whatsapp', stage: 'new', created_at: '2025-10-10T00:00:00.000Z', last_message_at: null },
    ]);
    const cache = createMockCache();
    const svc = new LeadsService(ds, cache);

    const res = await svc.list(1, { limit: 2 });
    expect(res.items.map(i => i.id)).toEqual(['uuid-2', 'uuid-1']);
    expect(res.nextCursor).toBeNull();
  });
});
