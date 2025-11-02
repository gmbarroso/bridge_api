import { BadRequestException } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { CorporateLeadsService } from './corporate-leads.service';
import { Lead } from '../../../database/entities/lead.entity';

const buildListQueryBuilder = (rows: any[]) => {
  const qb: Partial<SelectQueryBuilder<Lead>> & Record<string, any> = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
};

const createDataSource = (rows: any[]) => {
  const listQb = buildListQueryBuilder(rows);
  const leadRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(listQb),
  };

  return {
    getRepository: jest.fn((entity) => {
      if (entity === Lead) {
        return leadRepository;
      }
      throw new Error(`Repository not mocked for entity: ${entity}`);
    }),
    __mocks: { listQb },
  } as unknown as DataSource & { __mocks: { listQb: ReturnType<typeof buildListQueryBuilder> } };
};

describe('CorporateLeadsService', () => {
  it('mapeia linhas e retorna nextCursor quando houver mais páginas', async () => {
    const first = {
      lead_id: 30,
      lead_public_id: 'corp-1',
      session_id: 'corp-session-1',
      company_name: 'Bridge Tecnologia',
      email: 'contato@bridge.inc',
      phone: '+5511900000000',
      source: 'whatsapp',
      stage: 'new',
      created_at: new Date('2025-01-02T12:00:00Z'),
      last_message_at: null,
      colaboradores: 80,
      tipo_cliente: 'Enterprise',
      cargo: 'CEO',
      empresa: 'Bridge Tecnologia LTDA',
      nome_agendado: 'Kickoff',
      cpf_cnpj: '12.345.678/0001-99',
      conversation_public_id: 'conv-corp-1',
    };
    const second = {
      ...first,
      lead_id: 29,
      lead_public_id: 'corp-2',
      session_id: 'corp-session-2',
      created_at: new Date('2025-01-01T12:00:00Z'),
      conversation_public_id: 'conv-corp-2',
    };

    const dataSource = createDataSource([first, second]);
    const service = new CorporateLeadsService(dataSource);

    const result = await service.list(1, { limit: 1 });

    expect(dataSource.__mocks.listQb.limit).toHaveBeenCalledWith(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      sessionId: 'corp-session-1',
      leadPublicId: 'corp-1',
      companyName: 'Bridge Tecnologia',
      colaboradores: 80,
      conversationPublicId: 'conv-corp-1',
    });
    expect(result.nextCursor).toBe(
      Buffer.from(`${second.created_at.toISOString()}|${second.lead_id}`).toString('base64url'),
    );
  });

  it('lança erro para cursor inválido', async () => {
    const dataSource = createDataSource([]);
    const service = new CorporateLeadsService(dataSource);

    await expect(service.list(1, { cursor: 'cursor-?invalid' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
