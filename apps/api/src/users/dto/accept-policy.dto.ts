import { AcceptPolicy } from "../../common/policy";

export class AcceptPolicyDto {
  @AcceptPolicy()
  acceptPolicy!: boolean;
}
