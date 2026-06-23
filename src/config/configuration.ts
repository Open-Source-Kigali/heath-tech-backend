export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  deviceJwt: {
    secret: string;
    expiresIn: string;
  };
  sync: {
    pullMaxLimit: number;
    fullResyncThreshold: number;
  };
  throttle: {
    ttlSeconds: number;
    limit: number;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
  deviceJwt: {
    secret: process.env.DEVICE_JWT_SECRET ?? 'change-me-too',
    expiresIn: process.env.DEVICE_JWT_EXPIRES_IN ?? '30d',
  },
  sync: {
    pullMaxLimit: parseInt(process.env.SYNC_PULL_MAX_LIMIT ?? '500', 10),
    fullResyncThreshold: parseInt(
      process.env.SYNC_FULL_RESYNC_THRESHOLD ?? '50000',
      10,
    ),
  },
  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  },
});
