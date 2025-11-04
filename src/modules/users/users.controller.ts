import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../database/entities/user.entity';

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
  async updateCurrentUser(@Req() req, @Body() dto: UpdateUserDto): Promise<User> {
    // req.user is populated by JwtAuthGuard
    const userId = req.user.sub;
    const user = await this.usersService.updateUser(userId, dto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...result } = user;
    return result as User;
  }
}
