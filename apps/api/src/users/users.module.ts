import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { AccountService } from "./account.service";
import { UsersService } from "./users.service";
import { AppleRevocationService } from "./apple-revocation.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, AccountService, AppleRevocationService],
})
export class UsersModule {}
