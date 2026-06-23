import { Prisma } from '@prisma/client';

export function toJsonSnapshot(row: unknown): Prisma.InputJsonValue {
  const json: unknown = JSON.parse(
    JSON.stringify(row, (_key, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );
  return json as Prisma.InputJsonValue;
}
