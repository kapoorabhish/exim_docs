import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReferenceService } from './reference.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('reference')
@UseGuards(JwtAuthGuard)
export class ReferenceController {
  constructor(private referenceService: ReferenceService) {}

  @Get('ports')
  ports(@Query('q') q?: string, @Query('country') country?: string, @Query('type') type?: string) {
    return this.referenceService.searchPorts(q, country, type);
  }

  @Get('countries')
  countries(@Query('q') q?: string) {
    return this.referenceService.searchCountries(q);
  }

  @Get('hs-codes')
  hsCodes(@Query('q') q?: string, @Query('chapter') chapter?: string) {
    return this.referenceService.searchHsCodes(q, chapter);
  }

  @Get('uoms')
  uoms() {
    return this.referenceService.listUoms();
  }

  @Get('incoterms')
  incoterms() {
    return this.referenceService.listIncoterms();
  }
}