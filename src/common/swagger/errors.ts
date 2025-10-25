import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({ example: 401, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message or list of validation messages',
    oneOf: [
      { type: 'string', example: 'Unauthorized' },
      { type: 'array', items: { type: 'string' }, example: ['email must be an email'] },
    ],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Unauthorized', description: 'Error title' })
  error!: string;
}
