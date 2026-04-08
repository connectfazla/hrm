import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getAll() {
    return this.settings.getAll();
  }

  @Put(":key")
  async update(@Param("key") key: string, @Body() body: { value: any }) {
    const updated = await this.settings.set(key, body.value);
    return { setting: updated };
  }

  @Post("smtp/test")
  async testSmtp(@Body() body: { host: string; port: number; user?: string; pass?: string }) {
    return this.settings.testSmtp(body);
  }
}
