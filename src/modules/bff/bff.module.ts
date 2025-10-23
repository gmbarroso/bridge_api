import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsController } from './controllers/leads.controller';
import { ConversationsController } from './controllers/conversations.controller';
import { StatsController } from './controllers/stats.controller';
import { StatsService } from './services/stats.service';
import { LeadsService } from './services/leads.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [LeadsController, ConversationsController, StatsController],
  providers: [LeadsService, StatsService],
})
export class BffModule {}
