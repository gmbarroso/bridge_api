import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { PasswordResetService } from './password-reset.service';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  @Post('request-password-reset')
  @ApiOperation({ summary: 'Solicitar reset de senha (envio de token por e-mail)' })
  @ApiBody({ schema: { example: { email: 'user@org.com' } } })
  @ApiResponse({ status: 201, description: 'Mensagem genérica (não vaza existência de conta)' })
  @RateLimit({ windowMs: 60_000, max: 5, includeBodyFields: ['email'] })
  @UseGuards(RateLimitGuard)
  async request(@Body() dto: RequestPasswordResetDto) {
    return this.service.requestReset(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiBody({ schema: { example: { token: 'raw_token', password: 'NovaSenhaF0rte!' } } })
  @ApiResponse({ status: 201, description: 'Senha atualizada' })
  @RateLimit({ windowMs: 60_000, max: 10 })
  @UseGuards(RateLimitGuard)
  async reset(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto.token, dto.password);
  }
}
