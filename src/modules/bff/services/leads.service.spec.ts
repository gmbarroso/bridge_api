import { LeadsService } from './leads.service';
import { DataSource } from 'typeorm';

const buildDataSource = (rows: any[]): DataSource =>
  ({
    getRepository: jest.fn(() => ({
      createQueryBuilder: jest.fn(() => {
        const qb: any = {
          leftJoin: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue(rows),
        };
        return qb;
      }),
    })),
  }) as unknown as DataSource;

describe('LeadsService', () => {
  it('maps rows into BffLeadListItem', async () => {
    const createdAt = new Date('2025-01-01T12:00:00Z');
    const rows = [
      {
        lead_public_id: 'lead-public-id',
        session_id: 'session-123',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '+5521999999999',
        source: 'whatsapp',
        stage: 'new',
        created_at: createdAt,
        last_message_at: null,
        servico: 'corte',
        conversation_public_id: 'conv-public-id',
      },
    ];
    const service = new LeadsService(buildDataSource(rows));

    const result = await service.list(1, {});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      sessionId: 'session-123',
      leadPublicId: 'lead-public-id',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '+5521999999999',
      source: 'whatsapp',
      stage: 'new',
      createdAt: createdAt.toISOString(),
      lastMessageAt: null,
      servico: 'corte',
      conversationPublicId: 'conv-public-id',
    });
  });
});
