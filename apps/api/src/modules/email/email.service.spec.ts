import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: { sendMail: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTransporter = { sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }) };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: string) => {
              const config: Record<string, string> = {
                SMTP_HOST: 'smtp.test.com',
                SMTP_PORT: '587',
                SMTP_USER: 'user',
                SMTP_PASS: 'pass',
                SMTP_FROM: 'noreply@exim.app',
                APP_URL: 'http://localhost:3000',
              };
              return config[key] ?? def ?? '';
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('sends verification email with correct subject', async () => {
    await service.sendVerificationEmail('user@test.com', 'verify-token');
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Verify your EXIM account', to: 'user@test.com' }),
    );
  });

  it('sends password reset email with correct subject', async () => {
    await service.sendPasswordResetEmail('user@test.com', 'reset-token');
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Reset your EXIM password' }),
    );
  });

  it('sends invitation email with tenant name in subject', async () => {
    await service.sendInvitationEmail('inv@test.com', 'Test Co', 'STAFF', 'inv-token');
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('Test Co') }),
    );
  });

  it('sends welcome email with correct subject', async () => {
    await service.sendWelcomeEmail('user@test.com', 'Test User');
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Welcome to EXIM!' }),
    );
  });

  it('logs instead of sending when SMTP not configured', async () => {
    const module2: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: { get: (key: string, def?: string) => def ?? '' },
        },
      ],
    }).compile();

    const serviceNoSmtp = module2.get<EmailService>(EmailService);
    // Should not throw — logs to console instead
    await expect(serviceNoSmtp.sendVerificationEmail('x@x.com', 'tok')).resolves.not.toThrow();
    expect(mockTransporter.sendMail).not.toHaveBeenCalled();
  });
});
