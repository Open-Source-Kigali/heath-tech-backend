import { Injectable } from '@nestjs/common';
import { Appointment, Prisma, SyncOperation } from '@prisma/client';
import { CreateAppointmentDto } from '../../appointments/dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../../appointments/dto/update-appointment.dto';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';
import { MutableEntitySyncer } from './mutable-entity.syncer';
import { validatePayload } from './validate-payload.util';

@Injectable()
export class AppointmentSyncer extends MutableEntitySyncer<Appointment> {
  readonly entityType = 'Appointment';

  async validate(change: SyncChangeDto): Promise<void> {
    if (change.operation === SyncOperation.DELETE) {
      return;
    }
    const dto =
      change.operation === SyncOperation.CREATE
        ? CreateAppointmentDto
        : UpdateAppointmentDto;
    await validatePayload(dto, change.payload);
  }

  protected findInClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<Appointment | null> {
    return tx.appointment.findFirst({ where: { id, clinicId } });
  }

  protected async existsInOtherClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<boolean> {
    const foreign = await tx.appointment.findFirst({
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
    const dto = await validatePayload(CreateAppointmentDto, change.payload);
    await tx.appointment.create({
      data: {
        id: change.entityId,
        clinicId: device.clinicId,
        deviceId: device.deviceId,
        patientId: dto.patientId,
        providerId: dto.providerId,
        scheduledFor: new Date(dto.scheduledFor),
        status: dto.status,
        reason: dto.reason,
      },
    });
  }

  protected async updateRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<Appointment> {
    const dto = await validatePayload(UpdateAppointmentDto, change.payload);
    return tx.appointment.update({
      where: { id: change.entityId },
      data: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        status: dto.status,
        reason: dto.reason,
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
    await tx.appointment.update({
      where: { id: change.entityId },
      data: { deletedAt: new Date(), deviceId: device.deviceId },
    });
  }

  protected bumpVersion(
    tx: Prisma.TransactionClient,
    id: string,
    seq: bigint,
  ): Promise<Appointment> {
    return tx.appointment.update({
      where: { id },
      data: { serverVersion: seq },
    });
  }
}
