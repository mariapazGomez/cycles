import { IsBoolean } from "class-validator";

export class DataConsentDto {
  @IsBoolean()
  dataConsent!: boolean;
}
