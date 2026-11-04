import { EmailMode } from "@prisma/client";
import { IsEnum, IsString, Matches, MaxLength, MinLength } from "class-validator";

const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddressDto {
  @Matches(ADDRESS, { message: "La dirección debe verse como nombre@dominio.com." })
  @MaxLength(200, { message: "La dirección es demasiado larga." })
  address!: string;

  @IsString({ message: "Escribe para qué sirve." })
  @MinLength(1, { message: "Escribe para qué sirve." })
  @MaxLength(300, { message: "El texto es demasiado largo." })
  purpose!: string;

  @IsEnum(EmailMode, { message: "Elige cómo funciona: solo recepción, solo envío o envío y recepción." })
  mode!: EmailMode;

  @IsString({ message: "Escribe el servicio." })
  @MinLength(1, { message: "Escribe el servicio." })
  @MaxLength(120, { message: "El texto es demasiado largo." })
  service!: string;
}
