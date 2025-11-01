import { ChatsService } from './chats.service';
import { DataSource } from 'typeorm';
import { Chat } from '../../../database/entities/chat.entity';
import { ChatMessage } from '../../../database/entities/chat-message.entity';
import { NotFoundException } from '@nestjs/common';

function buildDataSource(options: {
  chat?: any;
  messages?: any[];
}): DataSource {
  const chatRepo = {
    findOne: jest.fn().mockResolvedValue(options.chat ?? null),
    update: jest.fn(),
  };
  const messageRepo = {
    find: jest.fn().mockResolvedValue(options.messages ?? []),
  };
  return {
    getRepository: jest.fn((entity) => {
      if (entity === Chat) return chatRepo;
      if (entity === ChatMessage) return messageRepo;
      throw new Error('Unexpected repository request');
    }),
  } as unknown as DataSource;
}

describe('ChatsService', () => {
  it('throws when conversation is missing', async () => {
    const service = new ChatsService(buildDataSource({}));

    await expect(service.conversationMessages(1, 'missing', 10)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns timeline items ordered oldest-first', async () => {
    const service = new ChatsService(
      buildDataSource({
        chat: { id: 1, conversation_id: 'session-1', public_id: 'conv-public' },
        messages: [
          {
            public_id: 'msg-2',
            sent_at: new Date('2025-01-02T12:00:00Z'),
            message_type: 'text',
            user_message: null,
            bot_message: 'Olá',
            phone: null,
          },
          {
            public_id: 'msg-1',
            sent_at: new Date('2025-01-01T12:00:00Z'),
            message_type: 'text',
            user_message: 'Oi',
            bot_message: null,
            phone: null,
          },
        ],
      }),
    );

    const result = await service.conversationMessages(1, 'conv-public', 10);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('msg-1');
    expect(result.items[0].direction).toBe('in');
    expect(result.items[1].direction).toBe('out');
  });
});
