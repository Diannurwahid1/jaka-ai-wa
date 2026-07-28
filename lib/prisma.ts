import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for the Prisma/Postgres core database.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

const appConfigModel = Prisma.dmmf.datamodel.models.find((model) => model.name === "AppConfig");
const appConfigFieldNames = new Set((appConfigModel?.fields ?? []).map((field) => field.name));

export function prismaSupportsAppConfigField(field: string) {
  return appConfigFieldNames.has(field);
}
