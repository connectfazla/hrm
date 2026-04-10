import { Controller, Get } from "@nestjs/common";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  @Get("branding")
  async branding() {
    const companyName = await this.settings.get("company_name");
    const companyLogo = await this.settings.get("company_logo");
    return {
      companyName: typeof companyName === "string" ? companyName : "Uppearance",
      companyLogo: typeof companyLogo === "string" ? companyLogo : null,
    };
  }
}

