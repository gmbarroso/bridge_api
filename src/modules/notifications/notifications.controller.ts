import { Controller, Get, Patch, Param, Query, UseGuards, ParseIntPipe, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { OrganizationId } from '../../common/decorators/organization.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth('BearerAuth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista notificações da organização' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de itens (1-200)', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } })
  @ApiQuery({ name: 'page', required: false, description: 'Página (offset)', schema: { type: 'integer', minimum: 1, default: 1 } })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Retorna apenas não lidas', schema: { type: 'boolean', default: false } })
  @ApiResponse({ status: 200, description: 'Lista de notificações' })
  async list(
    @OrganizationId() orgId: number,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notifications.list(orgId, query);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  @ApiParam({ name: 'id', description: 'ID da notificação', type: Number })
  @ApiResponse({ status: 200, description: 'Notificação atualizada' })
  async markRead(
    @OrganizationId() orgId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notifications.markRead(orgId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas' })
  @ApiResponse({ status: 200, description: 'Notificações atualizadas' })
  async markAllRead(@OrganizationId() orgId: number) {
    return this.notifications.markAllRead(orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma notificação' })
  @ApiParam({ name: 'id', description: 'ID da notificação', type: Number })
  @ApiResponse({ status: 200, description: 'Notificação removida' })
  async deleteOne(
    @OrganizationId() orgId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notifications.deleteOne(orgId, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove todas as notificações' })
  @ApiResponse({ status: 200, description: 'Notificações removidas' })
  async deleteAll(@OrganizationId() orgId: number) {
    return this.notifications.deleteAll(orgId);
  }
}
