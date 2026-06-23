import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sex } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({
    example: 'MRN-00123',
    description: 'Clinic-local medical record number',
  })
  @IsString()
  mrn!: string;

  @ApiProperty({ example: 'Amara' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Okoye' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: '1990-04-15', description: 'ISO date' })
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Sex, example: Sex.FEMALE })
  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @ApiPropertyOptional({ example: '+250788000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'KG 11 Ave, Kigali' })
  @IsOptional()
  @IsString()
  address?: string;
}
