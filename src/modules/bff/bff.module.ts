import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsController } from './controllers/conversations.controller';
import { StatsController } from './controllers/stats.controller';
import { StatsService } from './services/stats.service';
import { ChatsService } from './services/chats.service';
import { LeadsController } from './controllers/leads.controller';
import { LeadsService } from './services/leads.service';
import { CorporateLeadsController } from './controllers/corporate-leads.controller';
import { CorporateLeadsService } from './services/corporate-leads.service';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController, CorporateLeadsController, ConversationsController, StatsController],
  providers: [LeadsService, CorporateLeadsService, ChatsService, StatsService],
})
export class BffModule {}
