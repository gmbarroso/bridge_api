import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { Conversation } from '../../database/entities/conversation.entity';
import { Message } from '../../database/entities/message.entity';
import { LeadAttribute } from '../../database/entities/lead-attribute.entity';
import { AuthModule } from '../auth/auth.module';
import { IngestController } from './controllers/ingest.controller';
import { IngestService } from './services/ingest.service';
import { IdResolverService } from './services/id-resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Conversation, Message, LeadAttribute]),
    AuthModule,
  ],
  controllers: [IngestController],
  providers: [IngestService, IdResolverService],
  exports: [IngestService, IdResolverService],
})
export class IngestModule {}