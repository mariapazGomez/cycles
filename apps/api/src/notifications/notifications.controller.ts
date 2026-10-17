import { Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";

// Cada persona ve solo sus avisos (R5): todo se filtra por el usuario del token.
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.list(user.id);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Post("read-all")
  @HttpCode(204)
  async readAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.notifications.markAllRead(user.id);
  }

  @Post(":id/read")
  @HttpCode(204)
  async read(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<void> {
    await this.notifications.markRead(user.id, id);
  }
}
