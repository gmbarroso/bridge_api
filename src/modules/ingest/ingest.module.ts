import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { Chat } from '../../database/entities/chat.entity';
import { ChatMessage } from '../../database/entities/chat-message.entity';
import { AuthModule } from '../auth/auth.module';
import { IngestController } from './controllers/ingest.controller';
import { IngestService } from './services/ingest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Chat,
      ChatMessage,
    ]),
    AuthModule,
  ],
  controllers: [IngestController],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
