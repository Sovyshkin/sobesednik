import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateExpertDto {
  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  name?: string;

  // ...другие поля по аналогии
}
