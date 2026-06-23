import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { DeviceContext } from '../types';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DeviceContext => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: DeviceContext }>();

    return request.user;
  },
);
