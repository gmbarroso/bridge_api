import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { LeadsService } from './leads.service';
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

const buildDetailQueryBuilder = (row: any) => {
  const qb: Partial<SelectQueryBuilder<Lead>> & Record<string, any> = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(row),
  };
  return qb;
};

const createDataSource = (options: {
  listRows?: any[];
  detailRow?: any;
  findOneResult?: any;
  useListBuilderFirst?: boolean;
}) => {
  const listRows = options.listRows ?? [];
  const listQb = buildListQueryBuilder(listRows);
  const detailQb = buildDetailQueryBuilder(options.detailRow ?? null);

  const createQueryBuilder = jest.fn();
  if (options.useListBuilderFirst ?? true) {
    createQueryBuilder.mockReturnValueOnce(listQb).mockReturnValue(detailQb);
  } else {
    createQueryBuilder.mockReturnValue(detailQb);
  }

  const leadRepository = {
    createQueryBuilder,
    findOne: jest.fn().mockResolvedValue(options.findOneResult ?? null),
    save: jest.fn().mockImplementation(async (entity) => entity),
  };

  return {
    getRepository: jest.fn((entity) => {
      if (entity === Lead) {
        return leadRepository;
      }
      throw new Error(`Repository not mocked for entity: ${entity}`);
    }),
    __mocks: { listQb, detailQb, leadRepository },
  } as unknown as DataSource & {
    __mocks: {
      listQb: ReturnType<typeof buildListQueryBuilder>;
      detailQb: ReturnType<typeof buildDetailQueryBuilder>;
      leadRepository: typeof leadRepository;
    };
  };
};

describe('LeadsService', () => {
  it('maps rows, enforces limit+1 and emits nextCursor', async () => {
    const first = {
      lead_id: 10,
      lead_public_id: 'lead-public-id-1',
      session_id: 'session-001',
      kind: 'person',
      company_name: null,
      name: 'Ana',
      email: 'ana@example.com',
      phone: '+5521999999999',
      source: 'whatsapp',
      stage: 'new',
      created_at: new Date('2025-01-01T12:00:00Z'),
      last_message_at: null,
      servico: 'corte',
      colaboradores: 15,
      tipo_cliente: 'PME',
      cargo: 'Gerente',
      empresa: 'Bridge LTDA',
      nome_agendado: 'Reunião com Ana',
      cpf_cnpj: '12345678900',
      conversation_public_id: 'conv-public-id-1',
    };
    const second = {
      ...first,
      lead_id: 9,
      lead_public_id: 'lead-public-id-2',
      session_id: 'session-002',
      kind: 'corporate',
      company_name: 'Bridge Tecnologia',
      created_at: new Date('2025-01-01T11:00:00Z'),
      conversation_public_id: 'conv-public-id-2',
    };

    const dataSource = createDataSource({ listRows: [first, second] });
    const service = new LeadsService(dataSource);

    const result = await service.list(1, { limit: 1 });

    expect(dataSource.__mocks.listQb.limit).toHaveBeenCalledWith(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      kind: 'person',
      sessionId: 'session-001',
      leadPublicId: 'lead-public-id-1',
      companyName: null,
      name: 'Ana',
      colaboradores: 15,
      conversationPublicId: 'conv-public-id-1',
    });
    expect(result.nextCursor).toBe(
      Buffer.from(`${second.created_at.toISOString()}|${second.lead_id}`).toString('base64url'),
    );
  });

  it('throws when cursor is inválido', async () => {
    const dataSource = createDataSource({ listRows: [] });
    const service = new LeadsService(dataSource);

    await expect(service.list(1, { cursor: '***' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('listAll entrega leads de ambos os tipos', async () => {
    const rows = [
      {
        lead_id: 5,
        lead_public_id: 'pf',
        session_id: 'session-pf',
        kind: 'person',
        company_name: null,
        name: 'João',
        email: 'joao@example.com',
        phone: '+5511988880000',
        source: 'whatsapp',
        stage: 'new',
        created_at: new Date('2025-01-03T10:00:00Z'),
        last_message_at: null,
        servico: null,
        colaboradores: null,
        tipo_cliente: null,
        cargo: null,
        empresa: null,
        nome_agendado: null,
        cpf_cnpj: null,
        conversation_public_id: 'conv-pf',
      },
      {
        lead_id: 4,
        lead_public_id: 'pj',
        session_id: 'session-pj',
        kind: 'corporate',
        company_name: 'Empresa X',
        name: null,
        email: 'contato@empresax.com',
        phone: '+551100000000',
        source: 'whatsapp',
        stage: 'qualified',
        created_at: new Date('2025-01-02T09:00:00Z'),
        last_message_at: null,
        servico: null,
        colaboradores: 45,
        tipo_cliente: 'Enterprise',
        cargo: 'Diretor',
        empresa: 'Empresa X',
        nome_agendado: 'Reunião',
        cpf_cnpj: '12.345.678/0001-99',
        conversation_public_id: 'conv-pj',
      },
    ];

    const dataSource = createDataSource({ listRows: rows });
    const service = new LeadsService(dataSource);

    const result = await service.listAll(1, {});

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ kind: 'person', companyName: null });
    expect(result.items[1]).toMatchObject({ kind: 'corporate', companyName: 'Empresa X' });
  });

  it('updates lead and returns hydrated response', async () => {
    const findOneResult = {
      id: 42,
      organization_id: 1,
      session_id: 'session-xyz',
      public_id: 'public-xyz',
      kind: 'person',
      name: null,
      company_name: null,
      phone: null,
      email: null,
      stage: 'new',
      document: null,
      servico: null,
      colaboradores: null,
      tipo_cliente: null,
      cargo: null,
      empresa: null,
      nome_agendado: null,
      cpf_cnpj: null,
    };

    const detailRow = {
      lead_id: 42,
      lead_public_id: 'public-xyz',
      session_id: 'session-xyz',
      kind: 'corporate',
      company_name: 'Bridge Tecnologia',
      name: 'Maria',
      email: 'maria@example.com',
      phone: '+5511999999999',
      source: 'whatsapp',
      stage: 'qualified',
      created_at: new Date('2025-01-01T12:00:00Z'),
      last_message_at: null,
      servico: 'consultoria',
      colaboradores: 30,
      tipo_cliente: 'Enterprise',
      cargo: 'Diretora',
      empresa: 'Bridge Tecnologia',
      nome_agendado: 'Reunião',
      cpf_cnpj: '12.345.678/0001-99',
      conversation_public_id: 'conv-xyz',
    };

    const dataSource = createDataSource({
      listRows: [],
      detailRow,
      findOneResult,
      useListBuilderFirst: false,
    });

    const service = new LeadsService(dataSource);

    const result = await service.update(1, {
      sessionId: 'session-xyz',
      name: 'Maria',
      stage: 'qualified',
      servico: 'consultoria',
      colaboradores: 30,
      tipoCliente: 'Enterprise',
      cargo: 'Diretora',
      empresa: 'Bridge Tecnologia',
      nomeAgendado: 'Reunião',
      cpfCnpj: '12.345.678/0001-99',
    });

    const repoMocks = (dataSource as any).__mocks.leadRepository;
    expect(repoMocks.findOne).toHaveBeenCalledWith({
      where: { organization_id: 1, session_id: 'session-xyz' },
    });
    expect(repoMocks.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Maria', stage: 'qualified' }));
    expect(result).toMatchObject({
      kind: 'corporate',
      sessionId: 'session-xyz',
      leadPublicId: 'public-xyz',
      name: 'Maria',
      companyName: 'Bridge Tecnologia',
      servico: 'consultoria',
      colaboradores: 30,
      tipoCliente: 'Enterprise',
      conversationPublicId: 'conv-xyz',
    });
  });

  it('throws NotFound quando lead não existe', async () => {
    const dataSource = createDataSource({ listRows: [] });
    const service = new LeadsService(dataSource);

    await expect(service.update(1, { sessionId: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
