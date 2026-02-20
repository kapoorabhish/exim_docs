import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { ExportsModule } from './modules/exports/exports.module';
import { AdminModule } from './modules/admin/admin.module';
import { PdfModule } from './modules/pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantModule,
    UsersModule,
    EmailModule,
    MasterDataModule,
    ExportsModule,
    AdminModule,
    PdfModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
