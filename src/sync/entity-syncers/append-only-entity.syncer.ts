import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';
import {
  ApplyOutcome,
  EntitySyncer,
  SyncMode,
} from './entity-syncer.interface';
import { SyncableRow } from './mutable-entity.syncer';
import { toJsonSnapshot } from './snapshot.util';

export abstract class AppendOnlyEntitySyncer<
  TRow extends SyncableRow,
> implements EntitySyncer {
  abstract readonly entityType: string;
  readonly mode: SyncMode = 'APPEND_ONLY';

  abstract validate(change: SyncChangeDto): Promise<void>;

  protected abstract existsInOtherClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<boolean>;

  protected abstract exists(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<boolean>;

  protected abstract createRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<void>;

  protected abstract bumpVersion(
    tx: Prisma.TransactionClient,
    id: string,
    seq: bigint,
  ): Promise<TRow>;

  async apply(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<ApplyOutcome> {
    if (await this.existsInOtherClinic(tx, change.entityId, device.clinicId)) {
      throw new ForbiddenException('Entity id belongs to another clinic');
    }

    if (!(await this.exists(tx, change.entityId))) {
      await this.createRow(tx, device, change);
    }
    return { entityId: change.entityId };
  }

  async finalize(
    tx: Prisma.TransactionClient,
    entityId: string,
    seq: bigint,
  ): Promise<Prisma.InputJsonValue> {
    return toJsonSnapshot(await this.bumpVersion(tx, entityId, seq));
  }
}
