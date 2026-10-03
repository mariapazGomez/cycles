import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateContactDto {
  @IsEmail({}, { message: "Escribe un correo válido" })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10, { message: "Cuéntanos un poco más sobre ti" })
  @MaxLength(600, { message: "El mensaje puede tener hasta 600 caracteres" })
  message!: string;

  // Campo señuelo, oculto en la página: una persona lo deja vacío, un bot
  // que rellena todos los campos lo llena. Ver ContactService.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  // Milisegundos que la persona tardó en llenar el formulario. Un bot manda
  // el formulario al instante (o no manda este dato).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  elapsedMs?: number;
}
