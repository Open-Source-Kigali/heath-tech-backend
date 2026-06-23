import { ForbiddenException } from '@nestjs/common';
import { Prisma, SyncOperation } from '@prisma/client';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';
import {
  ApplyOutcome,
  EntitySyncer,
  SyncMode,
} from './entity-syncer.interface';
import { toJsonSnapshot } from './snapshot.util';

export interface SyncableRow {
  serverVersion: bigint;
  deviceId: string | null;
}

export abstract class MutableEntitySyncer<
  TRow extends SyncableRow,
> implements EntitySyncer {
  abstract readonly entityType: string;
  readonly mode: SyncMode = 'MUTABLE';

  abstract validate(change: SyncChangeDto): Promise<void>;

  protected abstract findInClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<TRow | null>;

  protected abstract existsInOtherClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<boolean>;

  protected abstract createRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<void>;

  protected abstract updateRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<TRow>;

  protected abstract tombstone(
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

    if (change.operation === SyncOperation.DELETE) {
      await this.tombstone(tx, device, change);
      return { entityId: change.entityId };
    }

    const existing = await this.findInClinic(
      tx,
      change.entityId,
      device.clinicId,
    );
    if (!existing) {
      await this.createRow(tx, device, change);
      return { entityId: change.entityId };
    }

    const updated = await this.updateRow(tx, device, change);

    const isStale =
      change.baseVersion !== undefined &&
      existing.serverVersion > BigInt(change.baseVersion);
    if (isStale) {
      return {
        entityId: change.entityId,
        conflict: {
          losingValue: toJsonSnapshot(existing),
          winningValue: toJsonSnapshot(updated),
          losingDeviceId: existing.deviceId,
          winningDeviceId: device.deviceId,
        },
      };
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
