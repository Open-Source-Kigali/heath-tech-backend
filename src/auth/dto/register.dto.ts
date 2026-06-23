import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'a3f1c2e4-5b6d-7e8f-9a0b-1c2d3e4f5a6b' })
  @IsUUID()
  clinicId!: string;

  @ApiProperty({ example: 'nurse@clinic.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Awa Diallo' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'secret123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: 'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    description: 'Role id',
  })
  @IsUUID()
  roleId!: string;
}
