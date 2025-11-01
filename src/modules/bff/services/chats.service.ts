import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Chat } from '../../../database/entities/chat.entity';
import { ChatMessage } from '../../../database/entities/chat-message.entity';
import { BffTimelineResponse, BffTimelineMessageItem } from '../../../common/swagger/success';

@Injectable()
export class ChatsService {
  constructor(private readonly dataSource: DataSource) {}

  async conversationMessages(orgId: number, conversationPublicId: string, limit = 100): Promise<BffTimelineResponse> {
    const chatRepo = this.dataSource.getRepository(Chat);
    const chat = await chatRepo.findOne({
      where: { organization_id: orgId, public_id: conversationPublicId },
    });

    if (!chat) {
      throw new NotFoundException('Conversation not found');
    }

    const messageRepo = this.dataSource.getRepository(ChatMessage);
    const messages = await messageRepo.find({
      where: { conversation_id: chat.conversation_id },
      order: { sent_at: 'DESC' },
      take: limit,
    });

    const items: BffTimelineMessageItem[] = messages
      .map((msg) => {
        const direction: 'in' | 'out' =
          msg.user_message != null ? 'in' : 'out';
        const snippet = msg.user_message ?? msg.bot_message ?? '';
        return {
          kind: 'message' as const,
          id: msg.public_id,
          createdAt: msg.sent_at.toISOString(),
          direction,
          type: msg.message_type,
          snippet,
          conversationId: chat.public_id,
        };
      })
      .reverse();

    return {
      items,
      nextCursor: null,
    };
  }
}
