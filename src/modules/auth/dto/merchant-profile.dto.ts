import { ApiProperty } from '@nestjs/swagger';

export class MerchantAuthProfileDto {
  @ApiProperty({
    description: '是否已设置账号密码（用户名和密码都存在）',
    example: true,
  })
  hasAccount: boolean;

  @ApiProperty({
    description: '是否已设置手机号',
    example: true,
  })
  hasPhone: boolean;

  @ApiProperty({
    description: '手机号是否已验证',
    example: true,
  })
  phoneVerified: boolean;

  @ApiProperty({
    description: '是否已设置邮箱',
    example: false,
  })
  hasEmail: boolean;

  @ApiProperty({
    description: '邮箱是否已验证',
    example: false,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: '是否已设置安全密码',
    example: false,
  })
  hasSecurityPassword: boolean;
}
