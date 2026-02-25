import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { TallyExportService } from './tally-export.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('payments/tally-export')
@UseGuards(JwtAuthGuard)
export class TallyExportController {
  constructor(private service: TallyExportService) {}

  @Get('preview')
  getPreview(@CurrentUser() user: JwtPayload, @Query() query: any) {
    return this.service.getPreview(user.tenantId, query);
  }

  @Get('download')
  async downloadXml(@CurrentUser() user: JwtPayload, @Query() query: any, @Res() res: Response) {
    const xml = await this.service.generateXml(user.tenantId, query);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="tally-export.xml"');
    res.end(xml);
  }
}