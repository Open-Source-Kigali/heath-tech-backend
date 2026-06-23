import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { DeviceStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import { HandshakeDto } from './dto/handshake.dto';
import { HandshakeResponse } from './dto/responses';
import { DeviceJwtPayload, SyncType } from './types';

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handshake(
    user: AuthenticatedUser,
    dto: HandshakeDto,
  ): Promise<HandshakeResponse> {
    const device = await this.prisma.device.upsert({
      where: { id: dto.deviceId },
      create: {
        id: dto.deviceId,
        clinicId: user.clinicId,
        userId: user.userId,
        name: dto.name,
        status: DeviceStatus.ACTIVE,
        tokenIssuedAt: new Date(),
        lastSeenAt: new Date(),
      },
      update: {
        userId: user.userId,
        name: dto.name,
        tokenIssuedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    const serverCursor = await this.getServerCursor();
    const clientCursor = this.parseCursor(dto.lastSyncedSeq);
    const recordedCursor = device.lastSyncedSeq;

    const syncType = this.decideSyncType(
      clientCursor,
      recordedCursor,
      serverCursor,
    );

    const payload: DeviceJwtPayload = {
      sub: device.id,
      clinicId: device.clinicId,
      userId: device.userId,
    };
    const deviceToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('deviceJwt.secret'),
      expiresIn: this.config.get<string>('deviceJwt.expiresIn') ?? '30d',
    } as JwtSignOptions);

    return {
      deviceToken,
      syncType,
      serverCursor: serverCursor.toString(),
      lastSyncedSeq: recordedCursor.toString(),
    };
  }

  async getServerCursor(tx?: Prisma.TransactionClient): Promise<bigint> {
    const client = tx ?? this.prisma;
    const agg = await client.changeLog.aggregate({ _max: { seq: true } });
    return agg._max.seq ?? 0n;
  }

  async recordPull(deviceId: string, cursor: bigint): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSyncedSeq: cursor, lastSeenAt: new Date() },
    });
  }

  private decideSyncType(
    clientCursor: bigint,
    recordedCursor: bigint,
    serverCursor: bigint,
  ): SyncType {
    const effective =
      clientCursor < recordedCursor ? clientCursor : recordedCursor;
    if (effective <= 0n) {
      return 'FULL';
    }
    const threshold = BigInt(
      this.config.get<number>('sync.fullResyncThreshold') ?? 50000,
    );
    if (serverCursor - effective > threshold) {
      return 'FULL';
    }
    return 'INCREMENTAL';
  }

  private parseCursor(value?: string): bigint {
    if (!value) {
      return 0n;
    }
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
}
