/**
 * 刷新令牌DTO
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: '刷新令牌',
    example: 'refresh_token_example_string',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: '新的访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '新的刷新令牌',
    example: 'refresh_token_example_string',
  })
  refreshToken: string;

  @ApiProperty({
    description: '访问令牌过期时间（秒）',
    example: 604800,
    type: 'number',
  })
  expiresIn: number;

  @ApiProperty({
    description: '刷新令牌过期时间（秒）',
    example: 2592000,
    type: 'number',
  })
  refreshExpiresIn: number;
}
