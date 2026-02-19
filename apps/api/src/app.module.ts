import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';
import { MasterDataModule } from './modules/master-data/master-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantModule,
    UsersModule,
    EmailModule,
    MasterDataModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
