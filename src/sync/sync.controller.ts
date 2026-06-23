import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { CurrentDevice } from './decorators/current-device.decorator';
import { HandshakeDto } from './dto/handshake.dto';
import { PullQueryDto } from './dto/pull-query.dto';
import { PushDto } from './dto/push.dto';
import { HandshakeResponse, PullResponse, PushResponse } from './dto/responses';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { DeviceService } from './device.service';
import { SyncService } from './sync.service';
import { DeviceContext } from './types';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly deviceService: DeviceService,
  ) {}

  @Post('handshake')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('user')
  @ApiOperation({
    summary:
      'Register/authenticate a device and learn whether to full- or incremental-sync',
  })
  @ApiResponse({ type: HandshakeResponse })
  handshake(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: HandshakeDto,
  ): Promise<HandshakeResponse> {
    return this.deviceService.handshake(user, dto);
  }

  @Post('push')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth('device')
  @ApiOperation({
    summary:
      'Push a batch of client changes (idempotent, scoped to the device clinic)',
  })
  @ApiResponse({ type: PushResponse })
  push(
    @CurrentDevice() device: DeviceContext,
    @Body() dto: PushDto,
  ): Promise<PushResponse> {
    return this.syncService.push(device, dto);
  }

  @Get('pull')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth('device')
  @ApiOperation({
    summary: 'Pull ChangeLog entries (incl. tombstones) after a cursor',
  })
  @ApiResponse({ type: PullResponse })
  pull(
    @CurrentDevice() device: DeviceContext,
    @Query() query: PullQueryDto,
  ): Promise<PullResponse> {
    return this.syncService.pull(device, query);
  }
}
