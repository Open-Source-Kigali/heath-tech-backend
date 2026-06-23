import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserJwtPayload } from './types';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ id: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { clinicId_email: { clinicId: dto.clinicId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this email already exists in this clinic',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        clinicId: dto.clinicId,
        email: dto.email,
        fullName: dto.fullName,
        roleId: dto.roleId,
        passwordHash,
      },
      select: { id: true },
    });
    return user;
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { clinicId_email: { clinicId: dto.clinicId, email: dto.email } },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: UserJwtPayload = {
      sub: user.id,
      clinicId: user.clinicId,
      roleId: user.roleId,
      email: user.email,
    };
    return { accessToken: await this.jwt.signAsync(payload) };
  }
}
