import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export type IntegrationStatus = 'disconnected' | 'connected' | 'error' | 'pending';

export class GoogleConnectDto {
  @ApiProperty({
    description: 'Client ID obtido no Google Cloud Console',
    example: '123456789-abc123def456.apps.googleusercontent.com',
  })
  @IsString()
  clientId!: string;

  @ApiProperty({
    description: 'Client Secret obtido no Google Cloud Console',
    example: 'GOCSPX-xxxx',
  })
  @IsString()
  clientSecret!: string;

  @ApiPropertyOptional({
    description: 'Redirect URI autorizada no console do Google',
    example: 'https://app.exemplo.com/integrations/google/callback',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;
}

export class IntegrationInfoDto {
  @ApiProperty({ example: 'google_calendar' })
  provider!: string;

  @ApiProperty({ enum: ['disconnected', 'connected', 'error', 'pending'], example: 'connected' })
  status!: IntegrationStatus;

  @ApiPropertyOptional({ example: 'user@gmail.com', nullable: true })
  accountEmail?: string | null;

  @ApiPropertyOptional({ example: '2024-11-05T12:00:00.000Z', nullable: true })
  lastSyncedAt?: string | null;

  @ApiPropertyOptional({ example: 'Credenciais inválidas', nullable: true })
  errorMessage?: string | null;
}
