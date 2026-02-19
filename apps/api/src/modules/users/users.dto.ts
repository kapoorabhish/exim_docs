import { IsString, IsOptional, IsEmail, IsEnum, MinLength } from 'class-validator';

export class InviteUserDto {
  @IsEmail() email: string;
  @IsString() role: string;
}

export class ChangeRoleDto {
  @IsString() role: string;
}

export class ChangeStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE']) status: 'ACTIVE' | 'INACTIVE';
}

export class UpdateMyProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
}

export class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

export class AuditLogQueryDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
