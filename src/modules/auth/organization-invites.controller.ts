import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { VerificationToken } from '../../database/entities/verification-token.entity';
import { DevAdminGuard } from './guards/dev-admin.guard';

class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsIn(['viewer','agent','admin'])
  role!: 'viewer' | 'agent' | 'admin';

  @IsOptional()
  @IsString()
  invitedByUserId?: string; // opcional durante dev
}

@ApiTags('Admin')
@Controller('admin/organizations/:organizationId/invites')
export class OrganizationInvitesController {
  constructor(
    @InjectRepository(VerificationToken)
    private readonly tokenRepo: Repository<VerificationToken>,
  ) {}

  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  @Post()
  @UseGuards(DevAdminGuard)
  @ApiOperation({ summary: 'Criar convite para usuário (dev/admin)' })
  @ApiHeader({ name: 'x-organization-id', required: true, description: 'Org ID (dev only)' })
  @ApiHeader({ name: 'x-admin', required: true, description: 'true (dev only)' })
  @ApiResponse({ status: 201, description: 'Convite criado', schema: { example: {
    organization_id: 1,
    email: 'user@org.com',
    role: 'agent',
    inviteUrl: 'https://app.seudominio.com/accept-invite?token=...',
    expiresAt: '2025-11-01T12:00:00.000Z'
  } } })
  async createInvite(
    @Param('organizationId') organizationIdParam: string,
    @Body() dto: CreateInviteDto,
  ) {
    const organizationId = Number(organizationIdParam);
    const { raw, hash } = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.tokenRepo.save({
      user_id: null,
      token_hash: hash,
      type: 'invite',
      organization_id: organizationId,
      invite_email: dto.email,
      invite_role: dto.role,
      invited_by_user_id: dto.invitedByUserId ? Number(dto.invitedByUserId) : null,
      expires_at: expiresAt,
      used_at: null,
    });

    const baseUrl = process.env.FRONT_BASE_URL || process.env.API_BASE_URL || 'https://app.seudominio.com';
    const inviteUrl = `${baseUrl}/accept-invite?token=${raw}`;

    return {
      organization_id: organizationId,
      email: dto.email,
      role: dto.role,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
