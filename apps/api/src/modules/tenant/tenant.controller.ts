import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantService } from './tenant.service';
import { UpdateProfileDto, CreateBankAccountDto, UpdateBankAccountDto } from './tenant.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('tenant')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TenantController {
  constructor(private tenant: TenantService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.tenant.getProfile(user.tenantId);
  }

  @Put('profile')
  @Roles('ADMIN' as any)
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.tenant.updateProfile(user.tenantId, dto);
  }

  @Get('bank-accounts')
  getBankAccounts(@CurrentUser() user: JwtPayload) {
    return this.tenant.getBankAccounts(user.tenantId);
  }

  @Post('bank-accounts')
  @Roles('ADMIN' as any)
  createBankAccount(@CurrentUser() user: JwtPayload, @Body() dto: CreateBankAccountDto) {
    return this.tenant.createBankAccount(user.tenantId, dto);
  }

  @Put('bank-accounts/:id')
  @Roles('ADMIN' as any)
  updateBankAccount(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.tenant.updateBankAccount(user.tenantId, id, dto);
  }

  @Delete('bank-accounts/:id')
  @Roles('ADMIN' as any)
  deleteBankAccount(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tenant.deleteBankAccount(user.tenantId, id);
  }
}
