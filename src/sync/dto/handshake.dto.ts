import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class HandshakeDto {
  @ApiProperty({
    example: '018f7e0a-1b2c-7d3e-8f4a-5b6c7d8e9f00',
    description:
      'Client-generated UUIDv7 device id. Stable for the life of the install.',
  })
  @IsUUID()
  deviceId!: string;

  @ApiPropertyOptional({ example: 'Reception tablet' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '0',
    description:
      'The last server cursor (ChangeLog.seq) this device successfully pulled.',
  })
  @IsOptional()
  @IsString()
  lastSyncedSeq?: string;
}
