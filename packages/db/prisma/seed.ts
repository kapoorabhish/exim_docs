import { PrismaClient } from '@prisma/client';
import { uoms } from './seed/uoms';
import { incoterms } from './seed/incoterms';
import { countries } from './seed/countries';
import { ports } from './seed/ports';
import { hsCodes } from './seed/hs-codes';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  console.log(`  → Seeding ${uoms.length} UOMs...`);
  await prisma.uom.createMany({ data: uoms, skipDuplicates: true });

  console.log(`  → Seeding ${incoterms.length} Incoterms...`);
  await prisma.incoterm.createMany({ data: incoterms, skipDuplicates: true });

  console.log(`  → Seeding ${countries.length} countries...`);
  await prisma.country.createMany({ data: countries, skipDuplicates: true });

  console.log(`  → Seeding ${ports.length} ports...`);
  await prisma.port.createMany({ data: ports, skipDuplicates: true });

  console.log(`  → Seeding ${hsCodes.length} HS codes...`);
  await prisma.hsCode.createMany({ data: hsCodes, skipDuplicates: true });

  console.log('✅ Seed complete.');
  console.log(`   UOMs: ${uoms.length} | Incoterms: ${incoterms.length} | Countries: ${countries.length} | Ports: ${ports.length} | HS Codes: ${hsCodes.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
