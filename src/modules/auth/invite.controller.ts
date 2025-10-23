import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { InviteService } from './invite.service';

class AcceptInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post('accept-invite')
  @ApiOperation({ summary: 'Aceitar convite de acesso' })
  @ApiBody({ schema: { example: { token: 'raw_token_da_url', name: 'Novo Usuário', password: 'SenhaF0rte!' } } })
  @ApiResponse({ status: 201, description: 'Convite aceito e usuário criado', schema: { example: {
    message: 'Convite aceito com sucesso',
    user: {
      id: 123,
      public_id: 'b1b0f6fe-8f7f-4a5c-b8f1-6f3c0d8b8f7a',
      email: 'convite@org.com',
      role: 'admin',
      organization_id: 1
    }
  } } })
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.inviteService.acceptInvite(dto);
  }
}
