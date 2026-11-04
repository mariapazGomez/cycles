import { Equals, IsOptional, IsString, MaxLength } from "class-validator";

// La persona escribe «ELIMINAR» para confirmar que de verdad quiere borrar la cuenta.
export class DeleteAccountDto {
  @IsString()
  @Equals("ELIMINAR", { message: "Escribe ELIMINAR para confirmar." })
  confirmation!: string;

  // Solo quien entra con Apple: código de un solo uso que la app pide a Apple al
  // eliminar, para revocar la autorización (regla 5.1.1(v)). No se guarda.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  appleAuthorizationCode?: string;
}
