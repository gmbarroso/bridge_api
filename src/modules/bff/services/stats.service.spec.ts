import { StatsService } from './stats.service';
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
  } as unknown as CacheService;
}

describe('StatsService (unit)', () => {
  it('summary returns shaped data and uses cache', async () => {
    const ds = createMockDataSource([{ total_leads: 10, leads_by_stage: { new: 7, converted: 3 }, leads_today: 2, active_leads_last_24h: 4 }]);
    const cache = createMockCache();
    const svc = new StatsService(ds, cache);

    const res = await svc.summary(1);
    expect(res.totalLeads).toBe(10);
    expect(res.leadsByStage.converted).toBe(3);

    // second call should hit cache
    await svc.summary(1);
    expect((cache as any).getJSON).toHaveBeenCalled();
  });

  it('leadsTrend builds points and caches', async () => {
    const ds = createMockDataSource([{ day: '2025-10-10', count: 2 }, { day: '2025-10-11', count: 5 }]);
    const cache = createMockCache();
    const svc = new StatsService(ds, cache);

    const res = await svc.leadsTrend(1, {});
    expect(res.points.length).toBeGreaterThan(0);

    // cached call
    await svc.leadsTrend(1, {});
    expect((cache as any).getJSON).toHaveBeenCalled();
  });
});
