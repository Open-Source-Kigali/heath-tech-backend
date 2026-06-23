import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11' })
  @IsUUID()
  patientId!: string;

  @ApiPropertyOptional({ example: '018f7e0a-3d4e-7f5a-ab6c-7d8e9f0a1b22' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiProperty({ example: '2026-06-24T10:30:00.000Z' })
  @IsISO8601()
  scheduledFor!: string;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    example: AppointmentStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: 'Follow-up consultation' })
  @IsOptional()
  @IsString()
  reason?: string;
}
