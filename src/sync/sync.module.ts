import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DeviceService } from './device.service';
import { AppointmentSyncer } from './entity-syncers/appointment.syncer';
import { EntitySyncerRegistry } from './entity-syncers/entity-syncer.registry';
import { LabResultSyncer } from './entity-syncers/lab-result.syncer';
import { MedicalHistorySyncer } from './entity-syncers/medical-history.syncer';
import { PatientSyncer } from './entity-syncers/patient.syncer';
import { VisitSyncer } from './entity-syncers/visit.syncer';
import { DeviceJwtStrategy } from './strategies/device-jwt.strategy';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    PassportModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('deviceJwt.secret'),
      }),
    }),
  ],
  controllers: [SyncController],
  providers: [
    SyncService,
    DeviceService,
    DeviceJwtStrategy,
    EntitySyncerRegistry,
    PatientSyncer,
    AppointmentSyncer,
    VisitSyncer,
    LabResultSyncer,
    MedicalHistorySyncer,
  ],
})
export class SyncModule {}
