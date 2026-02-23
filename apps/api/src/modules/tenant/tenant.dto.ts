import { IsString, IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { AccountType } from '@exim/db';

export class UpdateProfileDto {
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() registeredAddress?: string;
  @IsOptional() @IsString() communicationAddress?: string;
  @IsOptional() @IsString() iecNumber?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() signatoryName?: string;
  @IsOptional() @IsString() signatoryDesignation?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) financialYearStartMonth?: number;
  @IsOptional() @IsString() tan?: string;
  @IsOptional() @IsString() cin?: string;
}

export class CreateBankAccountDto {
  @IsString() bankName: string;
  @IsOptional() @IsString() branch?: string;
  @IsString() accountNumber: string;
  @IsOptional() @IsString() ifscCode?: string;
  @IsOptional() @IsString() swiftCode?: string;
  @IsOptional() @IsEnum(AccountType) accountType?: AccountType;
  @IsOptional() @IsString() currency?: string;
}

export class UpdateBankAccountDto {
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() branch?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() ifscCode?: string;
  @IsOptional() @IsString() swiftCode?: string;
  @IsOptional() @IsEnum(AccountType) accountType?: AccountType;
  @IsOptional() @IsString() currency?: string;
}
