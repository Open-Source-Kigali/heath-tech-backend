import { Injectable } from '@nestjs/common';
import { MedicalHistoryEvent, Prisma } from '@prisma/client';
import { CreateMedicalHistoryEventDto } from '../../medical-history/dto/create-medical-history-event.dto';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';
import { AppendOnlyEntitySyncer } from './append-only-entity.syncer';
import { validatePayload } from './validate-payload.util';

@Injectable()
export class MedicalHistorySyncer extends AppendOnlyEntitySyncer<MedicalHistoryEvent> {
  readonly entityType = 'MedicalHistoryEvent';

  async validate(change: SyncChangeDto): Promise<void> {
    await validatePayload(CreateMedicalHistoryEventDto, change.payload);
  }

  protected async existsInOtherClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<boolean> {
    const foreign = await tx.medicalHistoryEvent.findFirst({
      where: { id, NOT: { clinicId } },
      select: { id: true },
    });
    return foreign !== null;
  }

  protected async exists(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<boolean> {
    const row = await tx.medicalHistoryEvent.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  protected async createRow(
    tx: Prisma.TransactionClient,
    device: DeviceContext,
    change: SyncChangeDto,
  ): Promise<void> {
    const dto = await validatePayload(
      CreateMedicalHistoryEventDto,
      change.payload,
    );
    await tx.medicalHistoryEvent.create({
      data: {
        id: change.entityId,
        clinicId: device.clinicId,
        deviceId: device.deviceId,
        patientId: dto.patientId,
        type: dto.type,
        summary: dto.summary,
        detail: dto.detail,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
        amendsId: dto.amendsId,
      },
    });
  }

  protected bumpVersion(
    tx: Prisma.TransactionClient,
    id: string,
    seq: bigint,
  ): Promise<MedicalHistoryEvent> {
    return tx.medicalHistoryEvent.update({
      where: { id },
      data: { serverVersion: seq },
    });
  }
}
