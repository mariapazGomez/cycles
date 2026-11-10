import { Matches, MaxLength } from "class-validator";

export class NewsSeenDto {
  @MaxLength(80, { message: "La clave de la novedad no es válida." })
  @Matches(/^[a-z0-9-]+@[1-9][0-9]{0,3}$/, { message: "La clave de la novedad no es válida." })
  key!: string;
}
