import { ApiProperty } from '@nestjs/swagger';
import { SyncOperation } from '@prisma/client';
import { PushStatus, SyncType } from '../types';

export class HandshakeResponse {
  @ApiProperty({
    description: 'Per-device JWT to authenticate /sync/push and /sync/pull.',
  })
  deviceToken!: string;

  @ApiProperty({ enum: ['FULL', 'INCREMENTAL'], example: 'INCREMENTAL' })
  syncType!: SyncType;

  @ApiProperty({
    example: '128',
    description: 'Current high-water cursor on the server.',
  })
  serverCursor!: string;

  @ApiProperty({
    example: '120',
    description: 'The cursor the server has recorded for this device.',
  })
  lastSyncedSeq!: string;
}

export class PushChangeResult {
  @ApiProperty({ example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11' })
  entityId!: string;

  @ApiProperty({ example: 'patient-create-018f7e0a-2c3d' })
  idempotencyKey!: string;

  @ApiProperty({
    enum: ['ACCEPTED', 'DUPLICATE', 'REJECTED', 'CONFLICT'],
    example: 'ACCEPTED',
  })
  status!: PushStatus;

  @ApiProperty({
    required: false,
    example: '129',
    description: 'serverVersion assigned to the row.',
  })
  serverVersion?: string;

  @ApiProperty({
    required: false,
    description: 'Reason when status is REJECTED.',
  })
  error?: string;
}

export class ConflictSummary {
  @ApiProperty({ example: 'Patient' })
  entityType!: string;

  @ApiProperty({ example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11' })
  entityId!: string;

  @ApiProperty({
    description: 'The value that was discarded (older, by server order).',
  })
  losingValue!: unknown;

  @ApiProperty({ description: 'The value that was kept.' })
  winningValue!: unknown;
}

export class PushResponse {
  @ApiProperty({ type: [PushChangeResult] })
  results!: PushChangeResult[];

  @ApiProperty({ type: [ConflictSummary] })
  conflicts!: ConflictSummary[];

  @ApiProperty({
    example: '130',
    description: 'Server cursor after applying this batch.',
  })
  serverCursor!: string;
}

export class ChangeEntry {
  @ApiProperty({ example: '129' })
  seq!: string;

  @ApiProperty({ example: 'Patient' })
  entityType!: string;

  @ApiProperty({ example: '018f7e0a-2c3d-7e4f-9a5b-6c7d8e9f0a11' })
  entityId!: string;

  @ApiProperty({ enum: SyncOperation, example: SyncOperation.CREATE })
  operation!: SyncOperation;

  @ApiProperty({ required: false, example: '2026-06-23T09:14:00.000Z' })
  clientTimestamp!: string | null;

  @ApiProperty({ example: '2026-06-23T09:20:00.000Z' })
  serverTimestamp!: string;

  @ApiProperty({
    description:
      'Full post-write row snapshot (or tombstone state for DELETE).',
  })
  snapshot!: unknown;
}

export class PullResponse {
  @ApiProperty({ type: [ChangeEntry] })
  changes!: ChangeEntry[];

  @ApiProperty({
    example: '129',
    description: 'New high-water cursor; pass as ?since next pull.',
  })
  nextCursor!: string;

  @ApiProperty({
    example: false,
    description: 'True if more changes remain beyond this page.',
  })
  hasMore!: boolean;
}
