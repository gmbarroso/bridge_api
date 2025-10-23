import { Body, Controller, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login com email e senha (JWT + Refresh)' })
  @ApiBody({ schema: { example: { email: 'user@org.com', password: 'SenhaF0rte!' } } })
  @ApiResponse({ status: 201, description: 'Tokens emitidos', schema: { example: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: 123,
      public_id: 'b1b0f6fe-8f7f-4a5c-b8f1-6f3c0d8b8f7a',
      email: 'user@org.com',
      role: 'admin',
      organization_id: 1,
      suborganization_id: null
    }
  }}})
  @RateLimit({ windowMs: 5 * 60_000, max: 10, includeBodyFields: ['email'] })
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto, @Headers('user-agent') userAgent: string | undefined, @Ip() ip: string | undefined) {
    return this.auth.login(dto.email, dto.password, { userAgent: userAgent || null, ip: ip || null });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Trocar Refresh Token por novo par (rotação)' })
  @ApiBody({ schema: { example: { refreshToken: 'eyJhbGciOi...' } } })
  @ApiResponse({ status: 201, description: 'Tokens rotacionados', schema: { example: {
    accessToken: 'eyJhbGciOi...novo...',
    refreshToken: 'eyJhbGciOi...novo...'
  }}})
  async refresh(@Body() dto: RefreshDto, @Headers('user-agent') userAgent: string | undefined, @Ip() ip: string | undefined) {
    return this.auth.refresh(dto.refreshToken, { userAgent: userAgent || null, ip: ip || null });
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout - revoga o Refresh Token atual' })
  @ApiBody({ schema: { example: { refreshToken: 'eyJhbGciOi...' } } })
  @ApiResponse({ status: 201, description: 'Logout efetuado', schema: { example: { message: 'Logout efetuado' } } })
  async logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
}
