import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLabResultDto {
  @ApiProperty({ example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ example: 'GLU' })
  @IsString()
  testCode!: string;

  @ApiProperty({ example: 'Blood Glucose' })
  @IsString()
  testName!: string;

  @ApiProperty({ example: '5.4' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 'mmol/L' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '3.9–5.6' })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiPropertyOptional({ example: '2026-06-23T07:45:00.000Z' })
  @IsOptional()
  @IsISO8601()
  resultedAt?: string;

  @ApiPropertyOptional({
    example: '018f7e0a-5f6a-7b7c-cd8e-9f0a1b2c3d44',
    description: 'Id of the earlier result this one corrects (amendment link).',
  })
  @IsOptional()
  @IsUUID()
  amendsId?: string;
}
