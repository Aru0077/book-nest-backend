import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../auth.types';

export class AuthUserDto {
  @ApiProperty({
    description: '用户ID',
    example: 'clq1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '用户角色',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.MERCHANT,
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'merchant@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: '用户名',
    example: 'merchant001',
  })
  username?: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: '用户信息',
    type: AuthUserDto,
  })
  user: AuthUserDto;

  @ApiProperty({
    description: 'JWT访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT刷新令牌',
    example: 'refresh_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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
