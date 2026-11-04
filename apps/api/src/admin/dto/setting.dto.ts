import { IsString, MaxLength } from "class-validator";

export class SettingDto {
  @IsString({ message: "Escribe un valor." })
  @MaxLength(60, { message: "El valor es demasiado largo." })
  value!: string;
}
