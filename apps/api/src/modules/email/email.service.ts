import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get('SMTP_PORT');
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASS');

    if (host) {
      const transportOptions: nodemailer.TransportOptions = {
        host,
        port: Number(port) || 587,
      } as nodemailer.TransportOptions;
      if (user && pass) {
        (transportOptions as any).auth = { user, pass };
      }
      this.transporter = nodemailer.createTransport(transportOptions);
      this.logger.log(`SMTP configured → ${host}:${port || 587}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged to console');
    }
  }

  private async send(to: string, subject: string, html: string) {
    const from = this.config.get('SMTP_FROM', 'noreply@exim.app');

    if (!this.transporter) {
      this.logger.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.debug(html);
      return;
    }

    try {
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const link = `${appUrl}/verify?token=${token}`;

    await this.send(
      to,
      'Verify your EXIM account',
      `
        <h2>Welcome to EXIM</h2>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${link}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Verify Email</a></p>
        <p>Or copy this link: ${link}</p>
        <p>This link expires in 1 hour.</p>
      `,
    );
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const link = `${appUrl}/reset-password?token=${token}`;

    await this.send(
      to,
      'Reset your EXIM password',
      `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${link}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
        <p>Or copy this link: ${link}</p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `,
    );
  }

  async sendInvitationEmail(to: string, tenantName: string, role: string, token: string) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const link = `${appUrl}/accept-invite?token=${token}`;

    await this.send(
      to,
      `You're invited to join ${tenantName} on EXIM`,
      `
        <h2>You've been invited!</h2>
        <p><strong>${tenantName}</strong> has invited you to join their EXIM workspace as <strong>${role}</strong>.</p>
        <p><a href="${link}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invitation</a></p>
        <p>Or copy this link: ${link}</p>
        <p>This invitation expires in 7 days.</p>
      `,
    );
  }

  async sendWelcomeEmail(to: string, displayName: string) {
    await this.send(
      to,
      'Welcome to EXIM!',
      `
        <h2>Welcome, ${displayName}!</h2>
        <p>Your EXIM account is ready. You can now manage your export-import documentation from one place.</p>
        <p>Get started by setting up your business profile and inviting your team.</p>
      `,
    );
  }
}
