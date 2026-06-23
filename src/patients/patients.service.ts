import { Injectable, NotFoundException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreatePatientDto,
  ): Promise<Patient> {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          clinicId: user.clinicId,
          mrn: dto.mrn,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          sex: dto.sex,
          phone: dto.phone,
          address: dto.address,
        },
      });
      await this.audit.record(
        {
          clinicId: user.clinicId,
          actorUserId: user.userId,
          action: 'PATIENT_CREATED',
          entityType: 'Patient',
          entityId: patient.id,
        },
        tx,
      );
      return patient;
    });
  }

  async findAll(user: AuthenticatedUser): Promise<Patient[]> {
    return this.prisma.patient.findMany({
      where: { clinicId: user.clinicId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, clinicId: user.clinicId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<Patient> {
    await this.findOne(user, id);
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({
        where: { id },
        data: {
          mrn: dto.mrn,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          sex: dto.sex,
          phone: dto.phone,
          address: dto.address,
        },
      });
      await this.audit.record(
        {
          clinicId: user.clinicId,
          actorUserId: user.userId,
          action: 'PATIENT_UPDATED',
          entityType: 'Patient',
          entityId: patient.id,
        },
        tx,
      );
      return patient;
    });
  }
}
