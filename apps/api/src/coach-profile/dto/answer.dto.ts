import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { QUESTION_IDS, QuestionId } from "../questions";

export class AnswerDto {
  @IsIn(QUESTION_IDS, { message: "Esa pregunta no existe." })
  question!: QuestionId;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  values!: string[];

  // Lo escrito en «Otro», opcional.
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: "Escribe hasta 60 caracteres." })
  other?: string;
}
