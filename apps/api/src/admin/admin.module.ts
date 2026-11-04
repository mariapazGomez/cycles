import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AccessTokenVerifier } from "./access-token.verifier";
import { CloudflareAccessGuard } from "./cloudflare-access.guard";
import { PosthogService } from "./posthog.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AccessTokenVerifier, CloudflareAccessGuard, PosthogService],
})
export class AdminModule {}
