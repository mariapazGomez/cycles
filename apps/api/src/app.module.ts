import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
    ConfigModule.forRoot({ isGlobal: true }),
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
})
export class AppModule {}
