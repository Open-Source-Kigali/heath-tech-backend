import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SyncOperation } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SyncChangeDto {
  @ApiProperty({ example: 'Patient', description: 'Syncable entity type' })
  @IsString()
  entityType!: string;

  @ApiProperty({ enum: SyncOperation, example: SyncOperation.CREATE })
  @IsEnum(SyncOperation)
  operation!: SyncOperation;

  @ApiProperty({
    example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11',
    description: 'Client-generated UUIDv7 id of the affected entity row.',
  })
  @IsUUID()
  entityId!: string;

  @ApiProperty({
    example: 'patient-create-018f7e0a-2c3d',
    description:
      'Client-generated idempotency key. The server dedupes retries on it.',
  })
  @IsString()
  idempotencyKey!: string;

  @ApiProperty({
    example: '2026-06-23T09:14:00.000Z',
    description: 'When the clinician performed the action on the device.',
  })
  @IsISO8601()
  clientTimestamp!: string;

  @ApiPropertyOptional({
    example: '42',
    description:
      'serverVersion the client last saw for this row. Used to detect last-write-wins ' +
      'conflicts on mutable entities. Omit for a fresh CREATE.',
  })
  @IsOptional()
  @IsString()
  baseVersion?: string;

  @ApiProperty({
    description:
      'Entity field payload. Server-managed and cross-tenant fields are ignored.',
    example: {
      mrn: 'MRN-00123',
      firstName: 'Amara',
      lastName: 'Okoye',
      sex: 'FEMALE',
    },
  })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class PushDto {
  @ApiProperty({ type: [SyncChangeDto] })
  @ValidateNested({ each: true })
  @Type(() => SyncChangeDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  changes!: SyncChangeDto[];
}
