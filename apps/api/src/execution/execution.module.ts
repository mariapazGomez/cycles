import { Module } from "@nestjs/common";
import { MaxesModule } from "../maxes/maxes.module";
import { ExecutionController } from "./execution.controller";
import { ExecutionService } from "./execution.service";

@Module({
  imports: [MaxesModule],
  controllers: [ExecutionController],
  providers: [ExecutionService],
})
export class ExecutionModule {}
