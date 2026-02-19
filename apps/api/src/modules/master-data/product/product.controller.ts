import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, Res, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './product.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ProductQueryDto) {
    return this.productService.list(user.tenantId, query);
  }

  @Get('import/template')
  downloadTemplate(@Res() res: Response) {
    const csv = this.productService.csvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
    res.send(csv);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productService.getById(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.productService.create(user.tenantId, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    return this.productService.importCsv(user.tenantId, file.buffer);
  }

  @Put(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(user.tenantId, id, dto);
  }

  @Put(':id/deactivate')
  @HttpCode(200)
  deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productService.deactivate(user.tenantId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productService.delete(user.tenantId, id);
  }
}