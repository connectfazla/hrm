import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import type { Response, Request } from "express";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role, DocumentCategory } from "@prisma/client";
import { DocumentsService } from "./documents.service";
import { memoryStorage } from "multer";

const uploadSchema = z.object({
  employeeId: z.string().min(1),
  category: z.enum([
    "EMPLOYMENT_CONTRACT",
    "EMIRATES_ID",
    "PASSPORT",
    "VISA",
    "PROFESSIONAL_CERTIFICATE",
    "CV_RESUME",
    "PROFILE_PHOTO",
    "BANK_DETAILS_LETTER",
    "OTHER",
  ]),
  expiryDate: z.string().optional().nullable(),
});

type RequestWithUser = Request & { user?: { userId: string; role: Role; employeeId?: string | null } };

@Controller("documents")
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("expirations")
  async expirations(@Req() req: RequestWithUser, @Query("withinDays") withinDaysQ?: string) {
    const withinDays = withinDaysQ ? Number(withinDaysQ) : 90;
    const actorUserId = req.user?.userId;
    if (!actorUserId) return { message: "Unauthorized" };
    return this.docs.expirationsAdmin(withinDays, actorUserId);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return { message: "Invalid upload payload" };
    if (!file) return { message: "Missing file" };

    const actorUserId = req.user?.userId;
    if (!actorUserId) return { message: "Unauthorized" };

    const doc = await this.docs.upload({
      employeeId: parsed.data.employeeId,
      category: parsed.data.category as DocumentCategory,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      file,
      uploadedByUserId: actorUserId,
    });

    return { document: doc };
  }

  @UseGuards(AccessTokenGuard)
  @Post("profile-photo")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadSelfProfilePhoto(
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      return { message: "Missing file" };
    }
    const employeeId = req.user?.employeeId ?? null;
    const actorUserId = req.user?.userId ?? null;
    if (!employeeId || !actorUserId) {
      return { message: "Unauthorized" };
    }

    const doc = await this.docs.uploadProfilePhotoSelf({
      employeeId,
      file,
      uploadedByUserId: actorUserId,
    });
    return { document: doc };
  }

  @UseGuards(AccessTokenGuard)
  @Get(":employeeId")
  async list(@Req() req: RequestWithUser, @Param("employeeId") employeeId: string) {
    const role = req.user!.role;
    const actorEmployeeId = req.user?.employeeId ?? null;
    return this.docs.listForUser(role, actorEmployeeId, employeeId);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(":documentId")
  async remove(@Param("documentId") documentId: string) {
    await this.docs.deleteAdminOnly(documentId);
    return { ok: true };
  }

  @UseGuards(AccessTokenGuard)
  @Get(":employeeId/:documentId/download")
  async download(
    @Req() req: RequestWithUser,
    @Param("employeeId") employeeId: string,
    @Param("documentId") documentId: string,
    @Res() res: Response,
  ) {
    const role = req.user!.role;
    const actorEmployeeId = req.user?.employeeId ?? null;

    const stream = await this.docs.downloadForUser(role, actorEmployeeId, employeeId, documentId);
    res.setHeader("Content-Type", stream.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${stream.originalFileName ?? "download"}"`);
    return res.send(stream.buffer);
  }
}
