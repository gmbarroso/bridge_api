import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CursorDto {
  @IsOptional()
  @IsString()
  cursor?: string; // base64(ts|id)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['desired', 'interested', 'purchased', 'recommended'])
  relation?: 'desired' | 'interested' | 'purchased' | 'recommended';
}
