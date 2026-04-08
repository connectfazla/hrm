import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");

  const corsOrigin = process.env.CORS_ORIGIN ?? process.env.WEB_BASE_URL ?? "http://localhost:3000";
  app.enableCors({
    origin: corsOrigin.includes(",") ? corsOrigin.split(",").map((s) => s.trim()) : corsOrigin,
    credentials: true,
  });

  app.use(cookieParser());

  // Basic validation pipe for controllers that use DTO-like patterns.
  // (For zod-based routes, we handle errors inside controllers.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Uppearance HRMS API")
    .setDescription("REST API for Uppearance HR management system")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
