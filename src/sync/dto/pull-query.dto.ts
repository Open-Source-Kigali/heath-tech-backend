import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumberString, IsOptional, Max, Min } from 'class-validator';

export class PullQueryDto {
  @ApiPropertyOptional({
    example: '0',
    description:
      'Return changes with seq greater than this cursor. Defaults to 0 (full pull).',
  })
  @IsOptional()
  @IsNumberString()
  since?: string;

  @ApiPropertyOptional({
    example: 200,
    description: 'Max changes to return in this page (capped server-side).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
