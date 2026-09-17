import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Matches docs/architecture/database-schema.md §3.3's MVP launch seed list
// exactly (names only, no pricing) — see DECISIONS.md D-008.
const BRANDS = [
  "Gold Flake",
  "Classic",
  "Wills Navy Cut",
  "Four Square",
  "Red & White",
  "Scissors",
  "Bristol",
  "Cavanders",
  "Charminar",
  "Capstan",
  "Advance",
  "Mond Variance",
];

async function main() {
  for (const [i, displayName] of BRANDS.entries()) {
    await prisma.cigaretteBrandReference.upsert({
      where: { displayName },
      update: {},
      create: { displayName, sortOrder: (i + 1) * 10 },
    });
  }
  console.log(`Seeded ${BRANDS.length} cigarette brand reference rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
