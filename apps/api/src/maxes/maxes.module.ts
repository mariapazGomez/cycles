import { Module } from "@nestjs/common";
import { MaxesController } from "./maxes.controller";
import { MaxesService } from "./maxes.service";

// RM del atleta por ejercicio y carga como % del RM (CYC-306).
@Module({
  controllers: [MaxesController],
  providers: [MaxesService],
  exports: [MaxesService],
})
export class MaxesModule {}
