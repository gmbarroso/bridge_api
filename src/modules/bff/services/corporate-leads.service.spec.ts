import { CorporateLeadsService } from './corporate-leads.service';
import { DataSource } from 'typeorm';
import { CorporateLead } from '../../../database/entities/corporate-lead.entity';
import { Chat } from '../../../database/entities/chat.entity';

const buildDataSource = (rows: any[]): DataSource =>
  ({
    getRepository: jest.fn((entity) => {
      if (entity === CorporateLead) {
        return {
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
        };
      }
      if (entity === Chat) {
        return {};
      }
      throw new Error('Unexpected repository');
    }),
  }) as unknown as DataSource;

describe('CorporateLeadsService', () => {
  it('maps rows into BffCorporateLeadListItem', async () => {
    const createdAt = new Date('2025-01-01T12:00:00Z');
    const rows = [
      {
        lead_public_id: 'corp-public-id',
        session_id: 'corp-session-1',
        company_name: 'Bridge Tecnologia',
        email: 'contato@bridge.inc',
        phone: '+5511900000000',
        source: 'whatsapp',
        stage: 'new',
        created_at: createdAt,
        last_message_at: null,
        conversation_public_id: 'conv-corp',
      },
    ];
    const service = new CorporateLeadsService(buildDataSource(rows));

    const result = await service.list(1, {});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      sessionId: 'corp-session-1',
      leadPublicId: 'corp-public-id',
      companyName: 'Bridge Tecnologia',
      email: 'contato@bridge.inc',
      phone: '+5511900000000',
      source: 'whatsapp',
      stage: 'new',
      createdAt: createdAt.toISOString(),
      lastMessageAt: null,
      conversationPublicId: 'conv-corp',
    });
  });
});
