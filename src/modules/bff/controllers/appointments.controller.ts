import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { JwtAuthGuard, JwtUserRequest } from '../../auth/guards/jwt.guard';
import { AppointmentsService } from '../services/appointments.service';
import { CreateAppointmentDto, ListAppointmentsQueryDto, UpdateAppointmentDto } from '../dto/appointments.dto';
import { BffAppointmentItem, BffAppointmentListResponse } from '../../../common/swagger/success';
import { ErrorResponse } from '../../../common/swagger/errors';

@ApiTags('BFF - Appointments')
@ApiBearerAuth('BearerAuth')
@Controller('bff/appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista agendamentos paginados' })
  @ApiQuery({ name: 'from', required: false, description: 'Filtro start_time >= from (ISO).' })
  @ApiQuery({ name: 'to', required: false, description: 'Filtro start_time <= to (ISO).' })
  @ApiQuery({ name: 'status', required: false, description: 'scheduled | canceled | done | no_show' })
  @ApiQuery({ name: 'leadId', required: false, description: 'Filtra pelo lead_id' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (padrão 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (padrão 20, máx 200)' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffAppointmentListResponse) } })
  async list(
    @OrganizationId() orgId: number,
    @Query() query: ListAppointmentsQueryDto,
    @Req() req: JwtUserRequest,
  ) {
    const subOrgId = req.suborganizationId ?? null;
    return this.appointments.list(orgId, subOrgId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Cria um novo agendamento (documento)' })
  @ApiBody({ schema: { $ref: getSchemaPath(CreateAppointmentDto) } })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffAppointmentItem) } })
  @ApiResponse({ status: 400, description: 'Payload inválido', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async create(
    @OrganizationId() orgId: number,
    @Body() body: CreateAppointmentDto,
    @Req() req: JwtUserRequest,
  ) {
    const subOrgId = req.suborganizationId ?? null;
    return this.appointments.create(orgId, subOrgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados do agendamento' })
  @ApiParam({ name: 'id', description: 'ID do documento/agendamento', example: 123 })
  @ApiBody({ schema: { $ref: getSchemaPath(UpdateAppointmentDto) } })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffAppointmentItem) } })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async update(
    @OrganizationId() orgId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAppointmentDto,
    @Req() req: JwtUserRequest,
  ) {
    const subOrgId = req.suborganizationId ?? null;
    return this.appointments.update(orgId, subOrgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove ou cancela um agendamento' })
  @ApiParam({ name: 'id', description: 'ID do documento/agendamento', example: 123 })
  @ApiOkResponse({ schema: { example: { deleted: true } } })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async delete(
    @OrganizationId() orgId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: JwtUserRequest,
  ) {
    const subOrgId = req.suborganizationId ?? null;
    return this.appointments.delete(orgId, subOrgId, id);
  }
}
