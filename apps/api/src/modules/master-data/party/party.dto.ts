import { IsEmail, IsEnum, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum PartyType {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  BOTH = 'BOTH',
}

export class PartyContactDto {
  @IsString() name: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class CreatePartyDto {
  @IsEnum(PartyType) type: PartyType;
  @IsString() name: string;
  @IsString() country: string; // ISO 2-letter
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zip?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() iecNumber?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() swiftCode?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() defaultIncoterm?: string;
  @IsOptional() @IsString() defaultPaymentTerms?: string;
  @IsOptional() @IsNumber() @Type(() => Number) creditLimit?: number;
  @IsOptional() @IsString() preferredPortCode?: string;
  @IsOptional() contacts?: PartyContactDto[];
}

export class UpdatePartyDto extends CreatePartyDto {}

export class PartyQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(PartyType) type?: PartyType;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() active?: string;
  @IsOptional() @IsNumber() @Type(() => Number) page?: number;
  @IsOptional() @IsNumber() @Type(() => Number) pageSize?: number;
}