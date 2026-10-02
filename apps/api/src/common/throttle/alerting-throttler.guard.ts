import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from "@nestjs/throttler";
import { SecurityAlertService } from "../alerts/security-alert.service";

// El ThrottlerGuard de siempre, que además avisa a SecurityAlertService cada
// vez que bloquea (429). La alerta solo sale si la IP se bloquea varias veces
// (docs/PLAN-Seguridad.md, 1E).
@Injectable()
export class AlertingThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly alerts: SecurityAlertService,
  ) {
    super(options, storage, reflector);
  }

  protected async throwThrottlingException(context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void> {
    const req = context.switchToHttp().getRequest();
    this.alerts.throttled(req.ip, `${req.method} ${req.route?.path ?? req.path}`);
    return super.throwThrottlingException(context, detail);
  }
}
