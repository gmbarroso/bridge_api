import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { PasswordResetService } from './password-reset.service';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ErrorResponse } from '../../common/swagger/errors';

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
@ApiExtraModels(ErrorResponse)
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  @Post('request-password-reset')
  @ApiOperation({ summary: 'Solicitar reset de senha (envio de token por e-mail)' })
  @ApiBody({ schema: { example: { email: 'user@org.com' } } })
  @ApiResponse({ status: 201, description: 'Mensagem genérica (não vaza existência de conta)' })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @RateLimit({ windowMs: 60_000, max: 5, includeBodyFields: ['email'] })
  @UseGuards(RateLimitGuard)
  async request(@Body() dto: RequestPasswordResetDto) {
    return this.service.requestReset(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiBody({ schema: { example: { token: 'raw_token', password: 'NovaSenhaF0rte!' } } })
  @ApiResponse({ status: 201, description: 'Senha atualizada' })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 404, description: 'Token inválido/expirado', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @RateLimit({ windowMs: 60_000, max: 10 })
  @UseGuards(RateLimitGuard)
  async reset(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto.token, dto.password);
  }
}
