import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdempotencyResult, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceService } from './device.service';
import { SyncChangeDto } from './dto/push.dto';
import { PushDto } from './dto/push.dto';
import { PullQueryDto } from './dto/pull-query.dto';
import {
  ChangeEntry,
  ConflictSummary,
  PullResponse,
  PushChangeResult,
  PushResponse,
} from './dto/responses';
import { EntitySyncerRegistry } from './entity-syncers/entity-syncer.registry';
import { ApplyOutcome } from './entity-syncers/entity-syncer.interface';
import { DeviceContext } from './types';

interface StoredResult {
  entityId: string;
  status: PushChangeResult['status'];
  serverVersion?: string;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: EntitySyncerRegistry,
    private readonly audit: AuditService,
    private readonly deviceService: DeviceService,
    private readonly config: ConfigService,
  ) {}

  async push(device: DeviceContext, dto: PushDto): Promise<PushResponse> {
    const results: PushChangeResult[] = [];
    const conflicts: ConflictSummary[] = [];

    for (const change of dto.changes) {
      results.push(await this.processChange(device, change, conflicts));
    }

    const serverCursor = await this.deviceService.getServerCursor();
    return { results, conflicts, serverCursor: serverCursor.toString() };
  }

  private async processChange(
    device: DeviceContext,
    change: SyncChangeDto,
    conflicts: ConflictSummary[],
  ): Promise<PushChangeResult> {
    const replay = await this.findReplay(
      device.deviceId,
      change.idempotencyKey,
    );
    if (replay) {
      return {
        ...replay,
        idempotencyKey: change.idempotencyKey,
        status: 'DUPLICATE',
      };
    }

    const syncer = this.registry.get(change.entityType);
    if (!syncer) {
      return this.reject(
        change,
        `Unknown or non-syncable entityType: ${change.entityType}`,
      );
    }
    if (syncer.mode === 'APPEND_ONLY' && change.operation !== 'CREATE') {
      return this.reject(
        change,
        `${change.entityType} is append-only: only CREATE is allowed`,
      );
    }

    try {
      await syncer.validate(change);
    } catch (err) {
      return this.reject(change, this.errorMessage(err));
    }

    try {
      const { result, conflict } = await this.prisma.$transaction(
        async (tx) => {
          const dup = await tx.idempotencyKey.findUnique({
            where: {
              deviceId_key: {
                deviceId: device.deviceId,
                key: change.idempotencyKey,
              },
            },
          });
          if (dup) {
            const stored = this.readStored(dup.resultSnapshot, dup.entityId);
            return {
              result: {
                ...stored,
                idempotencyKey: change.idempotencyKey,
                status: 'DUPLICATE' as const,
              },
              conflict: undefined,
            };
          }

          const outcome: ApplyOutcome = await syncer.apply(tx, device, change);

          const logged = await tx.changeLog.create({
            data: {
              entityType: change.entityType,
              entityId: outcome.entityId,
              operation: change.operation,
              clinicId: device.clinicId,
              actorUserId: device.userId,
              deviceId: device.deviceId,
              clientTimestamp: new Date(change.clientTimestamp),
              snapshot: {},
            },
          });

          const snapshot = await syncer.finalize(
            tx,
            outcome.entityId,
            logged.seq,
          );
          await tx.changeLog.update({
            where: { seq: logged.seq },
            data: { snapshot },
          });

          await this.audit.record(
            {
              clinicId: device.clinicId,
              actorUserId: device.userId,
              action: `${change.entityType.toUpperCase()}_${change.operation}`,
              entityType: change.entityType,
              entityId: outcome.entityId,
              clientTimestamp: new Date(change.clientTimestamp),
              metadata: {
                deviceId: device.deviceId,
                seq: logged.seq.toString(),
              },
            },
            tx,
          );

          if (outcome.conflict) {
            await tx.syncConflict.create({
              data: {
                clinicId: device.clinicId,
                entityType: change.entityType,
                entityId: outcome.entityId,
                losingDeviceId: outcome.conflict.losingDeviceId,
                winningDeviceId: outcome.conflict.winningDeviceId,
                losingValue: outcome.conflict.losingValue,
                winningValue: outcome.conflict.winningValue,
              },
            });
          }

          const status = outcome.conflict
            ? ('CONFLICT' as const)
            : ('ACCEPTED' as const);
          const result: PushChangeResult = {
            entityId: outcome.entityId,
            idempotencyKey: change.idempotencyKey,
            status,
            serverVersion: logged.seq.toString(),
          };

          const stored: StoredResult = {
            entityId: result.entityId,
            status: result.status,
            serverVersion: result.serverVersion,
          };
          await tx.idempotencyKey.create({
            data: {
              deviceId: device.deviceId,
              key: change.idempotencyKey,
              entityType: change.entityType,
              entityId: outcome.entityId,
              resultStatus: outcome.conflict
                ? IdempotencyResult.CONFLICT
                : IdempotencyResult.ACCEPTED,
              resultSnapshot: stored as unknown as Prisma.InputJsonValue,
            },
          });

          return { result, conflict: outcome.conflict };
        },
      );

      if (conflict) {
        conflicts.push({
          entityType: change.entityType,
          entityId: result.entityId,
          losingValue: conflict.losingValue,
          winningValue: conflict.winningValue,
        });
      }
      return result;
    } catch (err) {
      return this.reject(change, this.errorMessage(err));
    }
  }

  private async findReplay(
    deviceId: string,
    key: string,
  ): Promise<StoredResult | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { deviceId_key: { deviceId, key } },
    });
    if (!existing) {
      return null;
    }
    return this.readStored(existing.resultSnapshot, existing.entityId);
  }

  private readStored(
    snapshot: Prisma.JsonValue | null,
    fallbackEntityId: string,
  ): StoredResult {
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
      const obj = snapshot as Record<string, unknown>;
      return {
        entityId:
          typeof obj.entityId === 'string' ? obj.entityId : fallbackEntityId,
        status: 'ACCEPTED',
        serverVersion:
          typeof obj.serverVersion === 'string' ? obj.serverVersion : undefined,
      };
    }
    return { entityId: fallbackEntityId, status: 'ACCEPTED' };
  }

  private reject(change: SyncChangeDto, error: string): PushChangeResult {
    return {
      entityId: change.entityId,
      idempotencyKey: change.idempotencyKey,
      status: 'REJECTED',
      error,
    };
  }

  private errorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return 'Unknown error';
  }

  async pull(
    device: DeviceContext,
    query: PullQueryDto,
  ): Promise<PullResponse> {
    const since = query.since ? BigInt(query.since) : 0n;
    const maxLimit = this.config.get<number>('sync.pullMaxLimit') ?? 500;
    const limit = Math.min(query.limit ?? maxLimit, maxLimit);

    const rows = await this.prisma.changeLog.findMany({
      where: { clinicId: device.clinicId, seq: { gt: since } },
      orderBy: { seq: 'asc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const changes: ChangeEntry[] = page.map((r) => ({
      seq: r.seq.toString(),
      entityType: r.entityType,
      entityId: r.entityId,
      operation: r.operation,
      clientTimestamp: r.clientTimestamp
        ? r.clientTimestamp.toISOString()
        : null,
      serverTimestamp: r.serverTimestamp.toISOString(),
      snapshot: r.snapshot,
    }));

    const nextCursor = page.length > 0 ? page[page.length - 1].seq : since;
    if (page.length > 0) {
      await this.deviceService.recordPull(device.deviceId, nextCursor);
    }

    return { changes, nextCursor: nextCursor.toString(), hasMore };
  }
}
