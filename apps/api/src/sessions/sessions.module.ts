import { Module } from "@nestjs/common";
import { MaxesModule } from "../maxes/maxes.module";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";

@Module({
  imports: [MaxesModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
