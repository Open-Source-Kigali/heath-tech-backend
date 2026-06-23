import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVisitDto {
  @ApiProperty({ example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ example: '018f7e0a-4e5f-7a6b-bc7d-8e9f0a1b2c33' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ example: '018f7e0a-3d4e-7f5a-ab6c-7d8e9f0a1b22' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ example: '2026-06-24T11:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  visitDate?: string;

  @ApiPropertyOptional({ example: 'Fever and headache for 3 days' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({
    example: 'Prescribed antimalarials; review in 1 week.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
