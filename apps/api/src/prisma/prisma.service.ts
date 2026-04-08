import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient {
  // Intentionally do not force-connect on Nest startup.
  // This lets the app boot even when the database is not reachable yet.
}

