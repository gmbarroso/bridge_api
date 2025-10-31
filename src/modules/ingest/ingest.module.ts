import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { Chat } from '../../database/entities/chat.entity';
import { ChatMessage } from '../../database/entities/chat-message.entity';
import { LeadAttribute } from '../../database/entities/lead-attribute.entity';
import { AuthModule } from '../auth/auth.module';
import { Service } from '../../database/entities/service.entity';
import { LeadServiceLink } from '../../database/entities/lead-service-link.entity';
import { IngestController } from './controllers/ingest.controller';
import { IngestService } from './services/ingest.service';
import { IdResolverService } from './services/id-resolver.service';
import { LeadServiceEvent } from '../../database/entities/lead-service-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Chat,
      ChatMessage,
      LeadAttribute,
      Service,
      LeadServiceLink,
      LeadServiceEvent,
    ]),
    AuthModule,
  ],
  controllers: [IngestController],
  providers: [IngestService, IdResolverService],
  exports: [IngestService, IdResolverService],
})
export class IngestModule {}
