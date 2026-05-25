import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  idToken: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
