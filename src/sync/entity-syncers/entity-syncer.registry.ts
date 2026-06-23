import { Injectable } from '@nestjs/common';
import { AppointmentSyncer } from './appointment.syncer';
import { EntitySyncer } from './entity-syncer.interface';
import { LabResultSyncer } from './lab-result.syncer';
import { MedicalHistorySyncer } from './medical-history.syncer';
import { PatientSyncer } from './patient.syncer';
import { VisitSyncer } from './visit.syncer';

@Injectable()
export class EntitySyncerRegistry {
  private readonly syncers: Map<string, EntitySyncer>;

  constructor(
    patientSyncer: PatientSyncer,
    appointmentSyncer: AppointmentSyncer,
    visitSyncer: VisitSyncer,
    labResultSyncer: LabResultSyncer,
    medicalHistorySyncer: MedicalHistorySyncer,
  ) {
    const all: EntitySyncer[] = [
      patientSyncer,
      appointmentSyncer,
      visitSyncer,
      labResultSyncer,
      medicalHistorySyncer,
    ];
    this.syncers = new Map(all.map((s) => [s.entityType, s]));
  }

  get(entityType: string): EntitySyncer | undefined {
    return this.syncers.get(entityType);
  }

  isSyncable(entityType: string): boolean {
    return this.syncers.has(entityType);
  }
}
