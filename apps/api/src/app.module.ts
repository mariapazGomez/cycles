import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./common/config/env.validation";
import { throttlerOptions } from "./common/throttle/throttle";
import { AlertingThrottlerGuard } from "./common/throttle/alerting-throttler.guard";
import { SecurityAlertModule } from "./common/alerts/security-alert.module";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { AthletesModule } from "./athletes/athletes.module";
import { CyclesModule } from "./cycles/cycles.module";
import { SessionsModule } from "./sessions/sessions.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { RoutinesModule } from "./routines/routines.module";
import { ExecutionModule } from "./execution/execution.module";
import { TrackingModule } from "./tracking/tracking.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot(throttlerOptions),
    SecurityAlertModule,
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    AthletesModule,
    CyclesModule,
    SessionsModule,
    ExercisesModule,
    RoutinesModule,
    ExecutionModule,
    TrackingModule,
  ],
  // Límite de intentos en toda la API (docs/SEGURIDAD.md, S-01), con alertas
  // cuando una IP se bloquea seguido (docs/PLAN-Seguridad.md, 1E).
  providers: [{ provide: APP_GUARD, useClass: AlertingThrottlerGuard }],
})
export class AppModule {}
