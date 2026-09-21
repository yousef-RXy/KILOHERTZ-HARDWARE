import { prisma } from "../src/lib/prisma";

async function fixVariants() {
  const products = await prisma.product.findMany({
    include: { variants: true },
  });

  for (const product of products) {
    if (product.variants.length === 1) {
      await prisma.productVariant.update({
        where: { id: product.variants[0].id },
        data: { priceOverride: null },
      });
      console.log(`Cleared priceOverride for single-variant: ${product.name}`);
    }
  }
}

fixVariants()
  .then(() => console.log("Done."))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
