import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { AdminEmail, CloudflareAccessGuard } from "./cloudflare-access.guard";
import { AdminService } from "./admin.service";
import { EmailAddressDto } from "./dto/email-address.dto";
import { SettingDto } from "./dto/setting.dto";

// Portal del equipo (CYC-193). Toda la ruta pasa por Cloudflare Access: el
// token se valida aquí en cada petición. Sin él, 401.
@UseGuards(CloudflareAccessGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("session")
  session(@AdminEmail() email: string) {
    return { email };
  }

  @Get("users")
  async users(
    @AdminEmail() email: string,
    @Query("kind") kind?: string,
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("verified") verified?: string,
    @Query("page") page?: string,
  ) {
    const parsedPage = page === undefined ? 1 : Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) throw new BadRequestException("La página no es válida.");
    if (kind !== undefined && kind !== "real" && kind !== "demo") throw new BadRequestException("El tipo de cuenta no es válido.");
    if (role !== undefined && role !== "coach" && role !== "athlete") throw new BadRequestException("El rol no es válido.");
    if (verified !== undefined && verified !== "yes" && verified !== "no") throw new BadRequestException("El filtro de verificación no es válido.");
    await this.admin.log(email, "users", `${kind ?? "real"}${role ? ` rol:${role}` : ""}${q ? " búsqueda" : ""}`);
    return this.admin.users({ kind: kind ?? "real", q, role, verified, page: parsedPage } as Parameters<AdminService["users"]>[0]);
  }

  @Get("users/:id")
  async user(@AdminEmail() email: string, @Param("id") id: string) {
    await this.admin.log(email, "user-detail", id);
    return this.admin.userDetail(id);
  }

  @Get("summary")
  summary() {
    return this.admin.summary();
  }

  @Get("usage")
  async usage(@AdminEmail() email: string, @Query("days") days?: string) {
    if (days !== undefined && days !== "7" && days !== "30") throw new BadRequestException("El periodo debe ser 7 o 30 días.");
    await this.admin.log(email, "usage", `${days ?? "7"} días`);
    return this.admin.usage(days === "30" ? 30 : 7);
  }

  @Get("access-log")
  accessLog() {
    return this.admin.accessLog();
  }

  @Get("emails")
  emails() {
    return this.admin.listEmails();
  }

  @Post("emails")
  createEmail(@Body() dto: EmailAddressDto) {
    return this.admin.createEmail(dto);
  }

  @Put("emails/:id")
  updateEmail(@Param("id") id: string, @Body() dto: EmailAddressDto) {
    return this.admin.updateEmail(id, dto);
  }

  @Delete("emails/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmail(@Param("id") id: string): Promise<void> {
    await this.admin.deleteEmail(id);
  }

  @Get("versions")
  versions() {
    return this.admin.versions();
  }

  @Put("settings/ios-version")
  setIosVersion(@Body() dto: SettingDto) {
    return this.admin.setIosVersion(dto.value);
  }
}
