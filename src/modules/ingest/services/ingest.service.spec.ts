import { IngestService } from './ingest.service';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('IngestService validation', () => {
  const mockDataSource = {
    manager: {},
    transaction: jest.fn(),
  } as unknown as DataSource;

  const service = new IngestService(mockDataSource);

  it('requires session_id when upserting lead', async () => {
    await expect(
      service.upsertLead(1, {
        // @ts-expect-error - intentionally missing session_id
        name: 'Ana',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires session or conversation when adding message', async () => {
    await expect(
      service.addMessage(1, {
        direction: 'in',
        payload: { text: 'Oi' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
