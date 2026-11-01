import { Equals, IsString } from "class-validator";

// La persona escribe «ELIMINAR» para confirmar que de verdad quiere borrar la cuenta.
export class DeleteAccountDto {
  @IsString()
  @Equals("ELIMINAR", { message: "Escribe ELIMINAR para confirmar." })
  confirmation!: string;
}
