export interface UserJwtPayload {
  sub: string;
  clinicId: string;
  roleId: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  clinicId: string;
  roleId: string;
  email: string;
}
