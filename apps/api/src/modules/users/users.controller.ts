import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import {
  InviteUserDto,
  ChangeRoleDto,
  ChangeStatusDto,
  UpdateMyProfileDto,
  ChangePasswordDto,
  AuditLogQueryDto,
} from './users.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  // ─── Current User ──────────────────────────────

  @Get('users/me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.users.getMyProfile(user.sub);
  }

  @Put('users/me')
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMyProfileDto) {
    return this.users.updateMyProfile(user.sub, dto);
  }

  @Put('users/me/password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.sub, dto);
  }

  // ─── User Management (ADMIN) ──────────────────

  @Get('users')
  @Roles('ADMIN' as any)
  listUsers(@CurrentUser() user: JwtPayload) {
    return this.users.listUsers(user.tenantId);
  }

  @Post('users/invite')
  @Roles('ADMIN' as any)
  inviteUser(@CurrentUser() user: JwtPayload, @Body() dto: InviteUserDto) {
    return this.users.inviteUser(user.tenantId, user.sub, dto);
  }

  @Put('users/:id/role')
  @Roles('ADMIN' as any)
  changeRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.users.changeRole(user.tenantId, user.sub, id, dto);
  }

  @Put('users/:id/status')
  @Roles('ADMIN' as any)
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.users.changeStatus(user.tenantId, user.sub, id, dto);
  }

  @Delete('users/:id')
  @Roles('ADMIN' as any)
  removeUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.users.removeUser(user.tenantId, user.sub, id);
  }

  // ─── Permissions ──────────────────────────────

  @Get('users/permissions')
  getPermissions() {
    return this.users.getPermissions();
  }

  // ─── Sessions (ADMIN) ─────────────────────────

  @Get('sessions')
  @Roles('ADMIN' as any)
  listSessions(@CurrentUser() user: JwtPayload) {
    return this.users.listSessions(user.tenantId);
  }

  @Delete('sessions/:id')
  @Roles('ADMIN' as any)
  forceLogout(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.users.forceLogout(user.tenantId, id);
  }

  // ─── Audit Logs (ADMIN) ───────────────────────

  @Get('audit-logs')
  @Roles('ADMIN' as any)
  queryAuditLogs(@CurrentUser() user: JwtPayload, @Query() query: AuditLogQueryDto) {
    return this.users.queryAuditLogs(user.tenantId, query);
  }
}
