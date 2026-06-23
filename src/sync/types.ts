export interface DeviceContext {
  deviceId: string;
  clinicId: string;
  userId: string | null;
}

export interface DeviceJwtPayload {
  sub: string;
  clinicId: string;
  userId: string | null;
}

export type SyncType = 'FULL' | 'INCREMENTAL';

export type PushStatus = 'ACCEPTED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT';
