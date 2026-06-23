import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { DeviceStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceContext, DeviceJwtPayload } from '../types';

@Injectable()
export class DeviceJwtStrategy extends PassportStrategy(Strategy, 'device') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('deviceJwt.secret') ?? 'change-me-too',
    });
  }

  async validate(payload: DeviceJwtPayload): Promise<DeviceContext> {
    const device = await this.prisma.device.findUnique({
      where: { id: payload.sub },
    });
    if (!device || device.status !== DeviceStatus.ACTIVE) {
      throw new UnauthorizedException('Device is not active');
    }
    if (device.clinicId !== payload.clinicId) {
      throw new UnauthorizedException('Device scope mismatch');
    }
    return {
      deviceId: device.id,
      clinicId: device.clinicId,
      userId: device.userId,
    };
  }
}
