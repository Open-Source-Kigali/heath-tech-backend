import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SyncOperation } from '@prisma/client';
import type { Server } from 'http';
import request from 'supertest';
import { uuidv7 } from 'uuidv7';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as { toJSON?: () => string }).toJSON = function (): string {
  return (this as bigint).toString();
};

interface PushChangeResult {
  entityId: string;
  idempotencyKey: string;
  status: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT';
  serverVersion?: string;
  error?: string;
}
interface PushResponse {
  results: PushChangeResult[];
  conflicts: { entityType: string; entityId: string }[];
  serverCursor: string;
}
interface PullResponse {
  changes: {
    seq: string;
    entityType: string;
    entityId: string;
    operation: SyncOperation;
    snapshot: Record<string, unknown>;
  }[];
  nextCursor: string;
  hasMore: boolean;
}

describe('Sync (e2e): offline to reconnect to two-device bidirectional cycle', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const clinicId = uuidv7();
  const roleId = uuidv7();
  const email = 'nurse@clinic.test';
  const password = 'password123';

  let userToken: string;
  let deviceAToken: string;
  let deviceBToken: string;
  const deviceAId = uuidv7();
  const deviceBId = uuidv7();

  const patientId = uuidv7();
  let createSeq: string;

  const auth = (token: string): string => `Bearer ${token}`;
  const server = (): Server => app.getHttpServer() as Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE change_log, sync_conflicts, idempotency_keys, audit_logs, ' +
        'patients, devices, users, roles, clinics RESTART IDENTITY CASCADE',
    );

    await prisma.clinic.create({
      data: { id: clinicId, name: 'Test Clinic', code: 'TST' },
    });
    await prisma.role.create({ data: { id: roleId, name: 'NURSE' } });

    await request(server())
      .post('/auth/register')
      .send({ clinicId, email, fullName: 'Test Nurse', password, roleId })
      .expect(201);

    const login = await request(server())
      .post('/auth/login')
      .send({ clinicId, email, password })
      .expect(200);
    userToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers two devices via handshake (new device to FULL sync)', async () => {
    const a = await request(server())
      .post('/sync/handshake')
      .set('Authorization', auth(userToken))
      .send({ deviceId: deviceAId, name: 'Device A' })
      .expect(201);
    expect(a.body.syncType).toBe('FULL');
    expect(a.body.serverCursor).toBe('0');
    deviceAToken = a.body.deviceToken;

    const b = await request(server())
      .post('/sync/handshake')
      .set('Authorization', auth(userToken))
      .send({ deviceId: deviceBId, name: 'Device B' })
      .expect(201);
    deviceBToken = b.body.deviceToken;
    expect(deviceBToken).toBeDefined();
  });

  it('device A creates a patient offline, then pushes on reconnect', async () => {
    const res = await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceAToken))
      .send({
        changes: [
          {
            entityType: 'Patient',
            operation: SyncOperation.CREATE,
            entityId: patientId,
            idempotencyKey: `create-${patientId}`,
            clientTimestamp: '2026-06-23T08:00:00.000Z',
            payload: {
              mrn: 'MRN-1',
              firstName: 'Amara',
              lastName: 'Okoye',
              sex: 'FEMALE',
            },
          },
        ],
      })
      .expect(201);

    const body = res.body as PushResponse;
    expect(body.results[0].status).toBe('ACCEPTED');
    expect(body.results[0].serverVersion).toBeDefined();
    createSeq = body.results[0].serverVersion as string;
  });

  it('device B pulls and sees the created patient', async () => {
    const res = await request(server())
      .get('/sync/pull?since=0')
      .set('Authorization', auth(deviceBToken))
      .expect(200);

    const body = res.body as PullResponse;
    expect(body.changes).toHaveLength(1);
    expect(body.changes[0].operation).toBe('CREATE');
    expect(body.changes[0].entityId).toBe(patientId);
    expect(body.changes[0].snapshot.firstName).toBe('Amara');
    expect(body.hasMore).toBe(false);
  });

  it('device B updates the patient and pushes; device A pulls the update', async () => {
    const push = await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceBToken))
      .send({
        changes: [
          {
            entityType: 'Patient',
            operation: SyncOperation.UPDATE,
            entityId: patientId,
            idempotencyKey: `update-${patientId}-b1`,
            clientTimestamp: '2026-06-23T09:00:00.000Z',
            baseVersion: createSeq,
            payload: {
              mrn: 'MRN-1',
              firstName: 'Amara',
              lastName: 'Okoye-Diallo',
              phone: '+250788000000',
            },
          },
        ],
      })
      .expect(201);
    expect((push.body as PushResponse).results[0].status).toBe('ACCEPTED');

    const pull = await request(server())
      .get(`/sync/pull?since=${createSeq}`)
      .set('Authorization', auth(deviceAToken))
      .expect(200);
    const body = pull.body as PullResponse;
    expect(body.changes).toHaveLength(1);
    expect(body.changes[0].operation).toBe('UPDATE');
    expect(body.changes[0].snapshot.lastName).toBe('Okoye-Diallo');
  });

  it('dedupes a retried push on the same idempotency key', async () => {
    const res = await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceAToken))
      .send({
        changes: [
          {
            entityType: 'Patient',
            operation: SyncOperation.CREATE,
            entityId: patientId,
            idempotencyKey: `create-${patientId}`,
            clientTimestamp: '2026-06-23T08:00:00.000Z',
            payload: {
              mrn: 'MRN-1',
              firstName: 'Amara',
              lastName: 'Okoye',
              sex: 'FEMALE',
            },
          },
        ],
      })
      .expect(201);
    expect((res.body as PushResponse).results[0].status).toBe('DUPLICATE');
  });

  it('records a SyncConflict when a stale client overwrites (last-write-wins)', async () => {
    const res = await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceAToken))
      .send({
        changes: [
          {
            entityType: 'Patient',
            operation: SyncOperation.UPDATE,
            entityId: patientId,
            idempotencyKey: `update-${patientId}-a-stale`,
            clientTimestamp: '2026-06-23T10:00:00.000Z',
            baseVersion: createSeq,
            payload: {
              mrn: 'MRN-1',
              firstName: 'Amara',
              lastName: 'Stale-Edit',
            },
          },
        ],
      })
      .expect(201);
    const body = res.body as PushResponse;
    expect(body.results[0].status).toBe('CONFLICT');
    expect(body.conflicts).toHaveLength(1);

    const conflictCount = await prisma.syncConflict.count({
      where: { entityId: patientId },
    });
    expect(conflictCount).toBe(1);
  });

  it('propagates a tombstone on delete', async () => {
    const cursor = await prisma.changeLog.aggregate({ _max: { seq: true } });
    const since = (cursor._max.seq ?? 0n).toString();

    await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceAToken))
      .send({
        changes: [
          {
            entityType: 'Patient',
            operation: SyncOperation.DELETE,
            entityId: patientId,
            idempotencyKey: `delete-${patientId}`,
            clientTimestamp: '2026-06-23T11:00:00.000Z',
            payload: {},
          },
        ],
      })
      .expect(201);

    const pull = await request(server())
      .get(`/sync/pull?since=${since}`)
      .set('Authorization', auth(deviceBToken))
      .expect(200);
    const body = pull.body as PullResponse;
    const del = body.changes.find((c) => c.operation === 'DELETE');
    expect(del).toBeDefined();
    expect(del?.snapshot.deletedAt).not.toBeNull();

    const row = await prisma.patient.findUnique({ where: { id: patientId } });
    expect(row?.deletedAt).not.toBeNull();
  });

  it('writes audit entries preserving the client action timestamp', async () => {
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: patientId, action: 'PATIENT_CREATE' },
    });
    expect(audit).toBeDefined();
    expect(audit?.clientTimestamp?.toISOString()).toBe(
      '2026-06-23T08:00:00.000Z',
    );
    expect(audit?.serverTimestamp).toBeDefined();
  });

  it('syncs an append-only LabResult and rejects attempts to mutate it', async () => {
    const labId = uuidv7();
    const create = await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceAToken))
      .send({
        changes: [
          {
            entityType: 'LabResult',
            operation: SyncOperation.CREATE,
            entityId: labId,
            idempotencyKey: `lab-create-${labId}`,
            clientTimestamp: '2026-06-23T07:45:00.000Z',
            payload: {
              patientId,
              testCode: 'GLU',
              testName: 'Blood Glucose',
              value: '5.4',
              unit: 'mmol/L',
            },
          },
        ],
      })
      .expect(201);
    expect((create.body as PushResponse).results[0].status).toBe('ACCEPTED');

    const update = await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceAToken))
      .send({
        changes: [
          {
            entityType: 'LabResult',
            operation: SyncOperation.UPDATE,
            entityId: labId,
            idempotencyKey: `lab-update-${labId}`,
            clientTimestamp: '2026-06-23T07:50:00.000Z',
            payload: { value: '9.9' },
          },
        ],
      })
      .expect(201);
    expect((update.body as PushResponse).results[0].status).toBe('REJECTED');

    const amendId = uuidv7();
    const amend = await request(server())
      .post('/sync/push')
      .set('Authorization', auth(deviceAToken))
      .send({
        changes: [
          {
            entityType: 'LabResult',
            operation: SyncOperation.CREATE,
            entityId: amendId,
            idempotencyKey: `lab-amend-${amendId}`,
            clientTimestamp: '2026-06-23T08:10:00.000Z',
            payload: {
              patientId,
              testCode: 'GLU',
              testName: 'Blood Glucose',
              value: '5.6',
              unit: 'mmol/L',
              amendsId: labId,
            },
          },
        ],
      })
      .expect(201);
    expect((amend.body as PushResponse).results[0].status).toBe('ACCEPTED');

    const original = await prisma.labResult.findUnique({
      where: { id: labId },
    });
    expect(original?.value).toBe('5.4');
    const correction = await prisma.labResult.findUnique({
      where: { id: amendId },
    });
    expect(correction?.amendsId).toBe(labId);
  });

  it('rejects a revoked device on the next sync', async () => {
    await prisma.device.update({
      where: { id: deviceBId },
      data: { status: 'REVOKED' },
    });
    await request(server())
      .get('/sync/pull?since=0')
      .set('Authorization', auth(deviceBToken))
      .expect(401);
  });
});
