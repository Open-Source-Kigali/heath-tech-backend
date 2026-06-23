import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'a3f1c2e4-5b6d-7e8f-9a0b-1c2d3e4f5a6b',
    description: 'Clinic the user belongs to',
  })
  @IsUUID()
  clinicId!: string;

  @ApiProperty({ example: 'nurse@clinic.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
