import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Patient } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth('user')
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a patient (online path)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePatientDto,
  ): Promise<Patient> {
    return this.patientsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List patients in the caller clinic' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Patient[]> {
    return this.patientsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one patient' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Patient> {
    return this.patientsService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a patient (online path)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ): Promise<Patient> {
    return this.patientsService.update(user, id, dto);
  }
}
