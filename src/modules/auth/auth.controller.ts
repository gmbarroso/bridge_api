import { Body, Controller, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ErrorResponse } from '../../common/swagger/errors';
import { LoginResponse, TokenPairResponse, MessageResponse } from '../../common/swagger/success';

@ApiTags('Auth')
@ApiExtraModels(ErrorResponse, LoginResponse, TokenPairResponse, MessageResponse)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login com email e senha (JWT + Refresh)' })
  @ApiBody({ schema: { example: { email: 'user@org.com', password: 'SenhaF0rte!' } } })
  @ApiResponse({ status: 201, description: 'Tokens emitidos', schema: { $ref: getSchemaPath(LoginResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @RateLimit({ windowMs: 5 * 60_000, max: 10, includeBodyFields: ['email'] })
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto, @Headers('user-agent') userAgent: string | undefined, @Ip() ip: string | undefined) {
    return this.auth.login(dto.email, dto.password, { userAgent: userAgent || null, ip: ip || null });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Trocar Refresh Token por novo par (rotação)' })
  @ApiBody({ schema: { example: { refreshToken: 'eyJhbGciOi...' } } })
  @ApiResponse({ status: 201, description: 'Tokens rotacionados', schema: { $ref: getSchemaPath(TokenPairResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async refresh(@Body() dto: RefreshDto, @Headers('user-agent') userAgent: string | undefined, @Ip() ip: string | undefined) {
    return this.auth.refresh(dto.refreshToken, { userAgent: userAgent || null, ip: ip || null });
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout - revoga o Refresh Token atual' })
  @ApiBody({ schema: { example: { refreshToken: 'eyJhbGciOi...' } } })
  @ApiResponse({ status: 201, description: 'Logout efetuado', schema: { $ref: getSchemaPath(MessageResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
}
