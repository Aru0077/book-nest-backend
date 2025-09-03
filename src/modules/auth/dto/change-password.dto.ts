import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: '当前密码',
    example: 'oldPassword123',
  })
  @IsString()
  @IsNotEmpty({ message: '当前密码不能为空' })
  currentPassword: string;

  @ApiProperty({
    description: '新密码',
    example: 'NewSecurePassword123!',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '新密码长度至少8个字符' })
  @MaxLength(50, { message: '新密码长度不能超过50个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: '新密码必须包含至少一个小写字母、一个大写字母和一个数字',
  })
  newPassword: string;
}
