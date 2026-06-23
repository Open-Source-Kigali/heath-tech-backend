import { BadRequestException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export async function validatePayload<T extends object>(
  cls: ClassConstructor<T>,
  payload: Record<string, unknown>,
): Promise<T> {
  const instance = plainToInstance(cls, payload, {
    excludeExtraneousValues: false,
  });
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .filter(Boolean)
      .join('; ');
    throw new BadRequestException(`Invalid payload: ${details}`);
  }
  return instance;
}
