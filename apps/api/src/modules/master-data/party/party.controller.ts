import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, Res, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PartyService } from './party.service';
import { CreatePartyDto, UpdatePartyDto, PartyQueryDto } from './party.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('parties')
@UseGuards(JwtAuthGuard)
export class PartyController {
  constructor(private partyService: PartyService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: PartyQueryDto) {
    return this.partyService.list(user.tenantId, query);
  }

  @Get('import/template')
  downloadTemplate(@Res() res: Response) {
    const csv = this.partyService.csvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="parties-template.csv"');
    res.send(csv);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.partyService.getById(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePartyDto) {
    return this.partyService.create(user.tenantId, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    return this.partyService.importCsv(user.tenantId, file.buffer);
  }

  @Put(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.partyService.update(user.tenantId, id, dto);
  }

  @Put(':id/deactivate')
  @HttpCode(200)
  deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.partyService.deactivate(user.tenantId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.partyService.delete(user.tenantId, id);
  }
}