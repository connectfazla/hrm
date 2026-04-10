import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { Role, DocumentCategory } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";

type UploadArgs = {
  employeeId: string;
  category: DocumentCategory;
  expiryDate: Date | null;
  file: Express.Multer.File;
  uploadedByUserId: string;
};

type SelfProfilePhotoArgs = {
  employeeId: string;
  file: Express.Multer.File;
  uploadedByUserId: string;
};

type DownloadResult = {
  buffer: Buffer;
  mimeType: string;
  originalFileName: string | null;
};

const expiryCategories: DocumentCategory[] = [
  DocumentCategory.EMIRATES_ID,
  DocumentCategory.PASSPORT,
  DocumentCategory.VISA,
];

function warningLevel(daysUntil: number) {
  if (daysUntil <= 30) return "30";
  if (daysUntil <= 60) return "60";
  if (daysUntil <= 90) return "90";
  return null;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private get storageRoot() {
    return process.env.FILES_STORAGE_ROOT ?? "storage";
  }

  private get masterKey() {
    return process.env.FILES_MASTER_KEY ?? "dev-files-master-key-change-me";
  }

  private cryptoKey() {
    // Derive 32 bytes for aes-256-gcm.
    return crypto.createHash("sha256").update(this.masterKey).digest();
  }

  private async ensureStorageDir() {
    await fs.mkdir(path.join(this.storageRoot, "documents"), { recursive: true });
  }

  private computeChecksum(buffer: Buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  private encrypt(buffer: Buffer) {
    const key = this.cryptoKey();
    const iv = crypto.randomBytes(12); // recommended for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes

    // Layout: [iv(12)][authTag(16)][ciphertext...]
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  private decrypt(payload: Buffer) {
    const key = this.cryptoKey();
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const ciphertext = payload.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  async upload(args: UploadArgs) {
    await this.ensureStorageDir();

    const docId = crypto.randomUUID();
    const encryptedPayload = this.encrypt(args.file.buffer);
    const checksum = this.computeChecksum(args.file.buffer);

    const storagePath = path.join("documents", `${docId}.enc`);
    const fullPath = path.join(this.storageRoot, storagePath);

    await fs.writeFile(fullPath, encryptedPayload);

    const doc = await this.prisma.document.create({
      data: {
        employeeId: args.employeeId,
        category: args.category,
        originalFileName: args.file.originalname ?? null,
        mimeType: args.file.mimetype ?? "application/octet-stream",
        sizeBytes: args.file.size ?? args.file.buffer.byteLength,
        encrypted: true,
        storagePath,
        checksum,
        expiryDate: expiryCategories.includes(args.category) ? args.expiryDate : null,
        uploadedByUserId: args.uploadedByUserId,
      },
    });

    return doc;
  }

  async uploadProfilePhotoSelf(args: SelfProfilePhotoArgs) {
    const existing = await this.prisma.document.findMany({
      where: {
        employeeId: args.employeeId,
        category: DocumentCategory.PROFILE_PHOTO,
        deletedAt: null,
      },
      select: { id: true, storagePath: true },
    });

    const doc = await this.upload({
      employeeId: args.employeeId,
      category: DocumentCategory.PROFILE_PHOTO,
      expiryDate: null,
      file: args.file,
      uploadedByUserId: args.uploadedByUserId,
    });

    if (existing.length > 0) {
      await this.prisma.document.updateMany({
        where: { id: { in: existing.map((d) => d.id) } },
        data: { deletedAt: new Date() },
      });
      await Promise.all(
        existing.map(async (d) => {
          try {
            this.validateStoragePath(d.storagePath);
            await fs.unlink(path.join(this.storageRoot, d.storagePath));
          } catch {
            // Ignore missing old files
          }
        }),
      );
    }

    return doc;
  }

  async listForUser(role: Role, actorEmployeeId: string | null, employeeIdParam: string) {
    if (role !== Role.ADMIN && actorEmployeeId !== employeeIdParam) {
      throw new ForbiddenException("Not allowed");
    }

    const docs = await this.prisma.document.findMany({
      where: { employeeId: employeeIdParam, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    return docs.map((d) => {
      let daysUntil: number | null = null;
      let level: string | null = null;
      if (d.expiryDate) {
        daysUntil = Math.ceil((d.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        level = warningLevel(daysUntil);
      }
      return { ...d, daysUntil, warningLevel: level };
    });
  }

  async deleteAdminOnly(documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.deletedAt) throw new NotFoundException("Document not found");

    this.validateStoragePath(doc.storagePath);

    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    try {
      await fs.unlink(path.join(this.storageRoot, doc.storagePath));
    } catch {
      // Ignore file-not-found.
    }
  }

  private sanitizeFilename(name: string | null): string {
    if (!name) return "download";
    return name.replace(/[^\w.\-() ]/g, "_").replace(/\.{2,}/g, ".").slice(0, 200);
  }

  private validateStoragePath(storagePath: string) {
    const normalized = path.normalize(storagePath);
    if (normalized.includes("..") || path.isAbsolute(normalized)) {
      throw new ForbiddenException("Invalid storage path");
    }
    if (!normalized.startsWith("documents/")) {
      throw new ForbiddenException("Invalid storage path prefix");
    }
  }

  async downloadForUser(
    role: Role,
    actorEmployeeId: string | null,
    employeeIdParam: string,
    documentId: string,
  ): Promise<DownloadResult> {
    if (role !== Role.ADMIN && actorEmployeeId !== employeeIdParam) {
      throw new ForbiddenException("Not allowed");
    }

    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.deletedAt) throw new NotFoundException("Document not found");
    if (doc.employeeId !== employeeIdParam && role !== Role.ADMIN) {
      throw new ForbiddenException("Not allowed");
    }

    this.validateStoragePath(doc.storagePath);

    const payload = await fs.readFile(path.join(this.storageRoot, doc.storagePath));
    const buffer = this.decrypt(payload);

    return { buffer, mimeType: doc.mimeType, originalFileName: this.sanitizeFilename(doc.originalFileName) };
  }

  async expirationsAdmin(withinDays: number, actorUserId: string) {
    const now = new Date();
    const end = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    const docs = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        expiryDate: { not: null, gte: now, lte: end },
        category: { in: expiryCategories },
      } as any,
      orderBy: { expiryDate: "asc" },
      include: { employee: true },
    });

    const result = docs.map((d) => {
      const daysUntil = Math.ceil((d.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        documentId: d.id,
        category: d.category,
        employeeId: d.employeeId,
        employeeName: d.employee.fullName,
        expiryDate: d.expiryDate,
        daysUntil,
        warningLevel: warningLevel(daysUntil),
        mimeType: d.mimeType,
        originalFileName: d.originalFileName,
      };
    });

    if (docs.length > 0) {
      await this.notifications.notifyAdminsDocumentExpiry({
        actorUserId,
        documentCount: docs.length,
        withinDays,
      });
    }

    return result;
  }
}

