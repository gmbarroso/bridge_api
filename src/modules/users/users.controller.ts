import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../database/entities/user.entity';
import type { JwtUserRequest } from '../auth/guards/jwt.guard';

const sanitizeUser = (user: User) => {
  const { password_hash, password_algo, password_salt, ...rest } = user as any;
  return rest as User;
};

@ApiTags('Users')
@ApiBearerAuth('BearerAuth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza informações do usuário logado' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Requisição inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async updateCurrentUser(
    @Req() req: JwtUserRequest,
    @Body() dto: UpdateUserDto,
  ): Promise<{ user: User; accessToken?: string; refreshToken?: string }> {
    const userId = req.userId;
    const { user, tokens } = await this.usersService.updateUser(userId, dto);
    const sanitized = sanitizeUser(user);
    return { user: sanitized, accessToken: tokens?.accessToken, refreshToken: tokens?.refreshToken };
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o usuário logado' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getCurrentUser(@Req() req: JwtUserRequest): Promise<User> {
    const user = await this.usersService.findById(req.userId);
    return sanitizeUser(user);
  }
}
