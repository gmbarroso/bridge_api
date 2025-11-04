import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UserPreference } from '../../database/entities/user-preference.entity';

@ApiTags('Preferences')
@ApiBearerAuth('BearerAuth')
@Controller('preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Busca as preferências do usuário logado' })
  @ApiResponse({ status: 200, description: 'Preferências do usuário' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getMyPreferences(@Req() req): Promise<UserPreference> {
    const userId = req.user.sub;
    return this.preferencesService.getPreferences(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza as preferências do usuário logado' })
  @ApiResponse({ status: 200, description: 'Preferências atualizadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Requisição inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async updateMyPreferences(@Req() req, @Body() dto: UpdatePreferencesDto): Promise<UserPreference> {
    const userId = req.user.sub;
    return this.preferencesService.updatePreferences(userId, dto);
  }
}
