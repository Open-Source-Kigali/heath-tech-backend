import { Prisma } from '@prisma/client';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';

export type SyncMode = 'MUTABLE' | 'APPEND_ONLY';

export interface SyncConflictInfo {
  losingValue: Prisma.InputJsonValue;
  winningValue: Prisma.InputJsonValue;
  losingDeviceId: string | null;
  winningDeviceId: string | null;
}

export interface ApplyOutcome {
  entityId: string;
  conflict?: SyncConflictInfo;
}

export interface EntitySyncer {
  readonly entityType: string;
  readonly mode: SyncMode;

  validate(change: SyncChangeDto): Promise<void>;

  apply(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<ApplyOutcome>;

  finalize(
    tx: Prisma.TransactionClient,
    entityId: string,
    seq: bigint,
  ): Promise<Prisma.InputJsonValue>;
}
