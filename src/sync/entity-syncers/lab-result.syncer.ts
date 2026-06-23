import { Injectable } from '@nestjs/common';
import { LabResult, Prisma } from '@prisma/client';
import { CreateLabResultDto } from '../../laboratory/dto/create-lab-result.dto';
import { SyncChangeDto } from '../dto/push.dto';
import { DeviceContext } from '../types';
import { AppendOnlyEntitySyncer } from './append-only-entity.syncer';
import { validatePayload } from './validate-payload.util';

@Injectable()
export class LabResultSyncer extends AppendOnlyEntitySyncer<LabResult> {
  readonly entityType = 'LabResult';

  async validate(change: SyncChangeDto): Promise<void> {
    await validatePayload(CreateLabResultDto, change.payload);
  }

  protected async existsInOtherClinic(
    tx: Prisma.TransactionClient,
    id: string,
    clinicId: string,
  ): Promise<boolean> {
    const foreign = await tx.labResult.findFirst({
      where: { id, NOT: { clinicId } },
      select: { id: true },
    });
    return foreign !== null;
  }

  protected async exists(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<boolean> {
    const row = await tx.labResult.findUnique({
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
    const dto = await validatePayload(CreateLabResultDto, change.payload);
    await tx.labResult.create({
      data: {
        id: change.entityId,
        clinicId: device.clinicId,
        deviceId: device.deviceId,
        patientId: dto.patientId,
        testCode: dto.testCode,
        testName: dto.testName,
        value: dto.value,
        unit: dto.unit,
        referenceRange: dto.referenceRange,
        resultedAt: dto.resultedAt ? new Date(dto.resultedAt) : undefined,
        amendsId: dto.amendsId,
      },
    });
  }

  protected bumpVersion(
    tx: Prisma.TransactionClient,
    id: string,
    seq: bigint,
  ): Promise<LabResult> {
    return tx.labResult.update({ where: { id }, data: { serverVersion: seq } });
  }
}
