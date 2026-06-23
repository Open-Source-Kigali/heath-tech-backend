import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalHistoryType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateMedicalHistoryEventDto {
  @ApiProperty({ example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({
    enum: MedicalHistoryType,
    example: MedicalHistoryType.DIAGNOSIS,
  })
  @IsEnum(MedicalHistoryType)
  type!: MedicalHistoryType;

  @ApiProperty({ example: 'Type 2 Diabetes Mellitus' })
  @IsString()
  summary!: string;

  @ApiPropertyOptional({
    example: 'Diagnosed following elevated fasting glucose.',
  })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({ example: '2026-06-23T07:50:00.000Z' })
  @IsOptional()
  @IsISO8601()
  recordedAt?: string;

  @ApiPropertyOptional({
    example: '018f7e0a-6a7b-7c8d-de9f-0a1b2c3d4e55',
    description: 'Id of the earlier event this one corrects (amendment link).',
  })
  @IsOptional()
  @IsUUID()
  amendsId?: string;
}
