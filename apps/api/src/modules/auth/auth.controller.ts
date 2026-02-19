import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AcceptInviteDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip;
    const device = req.headers['user-agent'];
    return this.auth.login(dto, ip, device);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.auth.acceptInvite(dto);
  }
}
