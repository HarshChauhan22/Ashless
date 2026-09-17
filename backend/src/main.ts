import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// Prisma maps Postgres BIGINT to JS BigInt (database-schema.md §6's own
// guidance: serialize as strings, never raw numbers, to avoid precision
// loss on the client). This makes every response's amount fields come out
// as JSON strings automatically instead of throwing on JSON.stringify.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // local dev only — the Expo app on a phone/simulator is a different origin than localhost
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
