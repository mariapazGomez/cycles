import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { AccountService } from "./account.service";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, AccountService],
})
export class UsersModule {}
