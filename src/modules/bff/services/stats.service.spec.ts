import { StatsService } from './stats.service';
import { DataSource } from 'typeorm';

function createMockDataSource(rows: any[]) {
  return {
    query: jest.fn(async () => rows),
  } as unknown as DataSource;
}

describe('StatsService (unit)', () => {
  it('summary returns shaped data', async () => {
    const ds = createMockDataSource([{ total_leads: 10, leads_by_stage: { new: 7, converted: 3 }, leads_today: 2, active_leads_last_24h: 4 }]);
    const svc = new StatsService(ds);

    const res = await svc.summary(1);
    expect(res.totalLeads).toBe(10);
    expect(res.leadsByStage.converted).toBe(3);
  });

  it('leadsTrend builds points', async () => {
    const ds = createMockDataSource([{ day: '2025-10-10', count: 2 }, { day: '2025-10-11', count: 5 }]);
    const svc = new StatsService(ds);

    const res = await svc.leadsTrend(1, {});
    expect(res.points.length).toBeGreaterThan(0);
  });
});
