import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString() sku: string;
  @IsString() name: string;
  @IsOptional() @IsString() customsDescription?: string;
  @IsOptional() @IsString() hsCode?: string;
  @IsOptional() @IsString() countryOfOrigin?: string;
  @IsOptional() @IsString() uomCode?: string;
  @IsOptional() @IsNumber() @Type(() => Number) netWeightPerUnit?: number;
  @IsOptional() @IsNumber() @Type(() => Number) grossWeightPerUnit?: number;
  @IsOptional() @IsNumber() @Type(() => Number) dimensionL?: number;
  @IsOptional() @IsNumber() @Type(() => Number) dimensionW?: number;
  @IsOptional() @IsNumber() @Type(() => Number) dimensionH?: number;
  @IsOptional() @IsString() dimensionUnit?: string;
  @IsOptional() @IsNumber() @Type(() => Number) bcdRate?: number;
  @IsOptional() @IsNumber() @Type(() => Number) igstRate?: number;
  @IsOptional() @IsString() gstHsnCode?: string;
  @IsOptional() @IsNumber() @Type(() => Number) gstRate?: number;
  @IsOptional() @IsString() category?: string;
}

export class UpdateProductDto extends CreateProductDto {}

export class ProductQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() active?: string;
  @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @IsOptional() @IsNumber() @Type(() => Number) pageSize?: number;
}