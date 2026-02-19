import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class SignupDto {
  @IsString()
  companyName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  displayName: string;

  @IsString()
  @MinLength(8)
  password: string;
}
