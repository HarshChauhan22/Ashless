import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

// GET /catalog/brands per api-spec.md §3.5 — admin-managed autocomplete
// list only, names never pricing (database-schema.md §3.3). See
// DECISIONS.md D-012.
@Controller("catalog/brands")
@UseGuards(JwtAuthGuard)
export class BrandsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.cigaretteBrandReference.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { displayName: true },
    });
  }
}
