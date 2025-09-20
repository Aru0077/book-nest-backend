import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminRole, AdminStatus } from '../auth.types';

export class AdminApprovalDto {
  @ApiPropertyOptional({
    description: '拒绝原因（拒绝时必填）',
    example: '提供的信息不完整，请重新申请',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '拒绝原因长度不能超过500个字符' })
  rejectedReason?: string;
}

export class AdminInfoDto {
  @ApiProperty({
    description: '管理员ID',
    example: 'clq1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '管理员角色',
    enum: AdminRole,
    enumName: 'AdminRole',
    example: AdminRole.ADMIN,
  })
  role: AdminRole;

  @ApiProperty({
    description: '管理员状态',
    enum: AdminStatus,
    enumName: 'AdminStatus',
    example: AdminStatus.PENDING,
  })
  status: AdminStatus;

  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'admin@company.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  phone?: string;

  @ApiProperty({
    description: '申请时间',
    example: '2025-09-03T06:30:00.000Z',
  })
  appliedAt: Date;

  @ApiPropertyOptional({
    description: '审批人ID',
    example: 'clq9876543210fedcba',
  })
  approvedBy?: string;

  @ApiPropertyOptional({
    description: '审批时间',
    example: '2025-09-03T08:00:00.000Z',
  })
  approvedAt?: Date;

  @ApiPropertyOptional({
    description: '拒绝原因',
    example: '提供的信息不完整',
  })
  rejectedReason?: string;
}

export class PendingAdminListDto {
  @ApiProperty({
    description: '待审批管理员列表',
    type: [AdminInfoDto],
    isArray: true,
  })
  items: AdminInfoDto[];

  @ApiProperty({
    description: '总数',
    example: 5,
  })
  total: number;
}
