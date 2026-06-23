import { Injectable } from '@nestjs/common';
import { Prisma, SyncOperation, Visit } from '@prisma/client';
import { CreateVisitDto } from '../../visits/dto/create-visit.dto';
import { UpdateVisitDto } from '../../visits/dto/update-visit.dto';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';
import { MutableEntitySyncer } from './mutable-entity.syncer';
import { validatePayload } from './validate-payload.util';

@Injectable()
export class VisitSyncer extends MutableEntitySyncer<Visit> {
  readonly entityType = 'Visit';

  async validate(change: SyncChangeDto): Promise<void> {
    if (change.operation === SyncOperation.DELETE) {
      return;
    }
    const dto =
      change.operation === SyncOperation.CREATE
        ? CreateVisitDto
        : UpdateVisitDto;
    await validatePayload(dto, change.payload);
  }

  protected findInClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<Visit | null> {
    return tx.visit.findFirst({ where: { id, clinicId } });
  }

  protected async existsInOtherClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<boolean> {
    const foreign = await tx.visit.findFirst({
      where: { id, NOT: { clinicId } },
      select: { id: true },
    });
    return foreign !== null;
  }

  protected async createRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<void> {
    const dto = await validatePayload(CreateVisitDto, change.payload);
    await tx.visit.create({
      data: {
        id: change.entityId,
        clinicId: device.clinicId,
        deviceId: device.deviceId,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        providerId: dto.providerId,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : undefined,
        chiefComplaint: dto.chiefComplaint,
        notes: dto.notes,
      },
    });
  }

  protected async updateRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<Visit> {
    const dto = await validatePayload(UpdateVisitDto, change.payload);
    return tx.visit.update({
      where: { id: change.entityId },
      data: {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        providerId: dto.providerId,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : undefined,
        chiefComplaint: dto.chiefComplaint,
        notes: dto.notes,
        deletedAt: null,
        deviceId: device.deviceId,
      },
    });
  }

  protected async tombstone(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<void> {
    await tx.visit.update({
      where: { id: change.entityId },
      data: { deletedAt: new Date(), deviceId: device.deviceId },
    });
  }

  protected bumpVersion(
    tx: Prisma.TransactionClient,
    id: string,
    seq: bigint,
  ): Promise<Visit> {
    return tx.visit.update({ where: { id }, data: { serverVersion: seq } });
  }
}
