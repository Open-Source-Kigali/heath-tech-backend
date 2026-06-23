import { Injectable } from '@nestjs/common';
import { Patient, Prisma, SyncOperation } from '@prisma/client';
import { CreatePatientDto } from '../../patients/dto/create-patient.dto';
import { UpdatePatientDto } from '../../patients/dto/update-patient.dto';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';
import { MutableEntitySyncer } from './mutable-entity.syncer';
import { validatePayload } from './validate-payload.util';

@Injectable()
export class PatientSyncer extends MutableEntitySyncer<Patient> {
  readonly entityType = 'Patient';

  async validate(change: SyncChangeDto): Promise<void> {
    if (change.operation === SyncOperation.DELETE) {
      return;
    }
    const dto =
      change.operation === SyncOperation.CREATE
        ? CreatePatientDto
        : UpdatePatientDto;
    await validatePayload(dto, change.payload);
  }

  protected findInClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<Patient | null> {
    return tx.patient.findFirst({ where: { id, clinicId } });
  }

  protected async existsInOtherClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<boolean> {
    const foreign = await tx.patient.findFirst({
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
    const dto = await validatePayload(CreatePatientDto, change.payload);
    await tx.patient.create({
      data: {
        id: change.entityId,
        clinicId: device.clinicId,
        deviceId: device.deviceId,
        mrn: dto.mrn,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        sex: dto.sex,
        phone: dto.phone,
        address: dto.address,
      },
    });
  }

  protected async updateRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<Patient> {
    const dto = await validatePayload(UpdatePatientDto, change.payload);
    return tx.patient.update({
      where: { id: change.entityId },
      data: {
        mrn: dto.mrn,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        sex: dto.sex,
        phone: dto.phone,
        address: dto.address,
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
    await tx.patient.update({
      where: { id: change.entityId },
      data: { deletedAt: new Date(), deviceId: device.deviceId },
    });
  }

  protected bumpVersion(
    tx: Prisma.TransactionClient,
    id: string,
    seq: bigint,
  ): Promise<Patient> {
    return tx.patient.update({ where: { id }, data: { serverVersion: seq } });
  }
}
