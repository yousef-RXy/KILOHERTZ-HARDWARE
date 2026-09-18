import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function getEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
    config: {
      outputDimensionality: 768,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values) {
    throw new Error('No embedding values returned from Gemini API.');
  }

  return values;
}

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  const storageCategory = await prisma.category.create({
    data: {
      name: 'Storage',
      slug: 'storage',
    },
  });

  const cpuCategory = await prisma.category.create({
    data: {
      name: 'Processors',
      slug: 'processors',
    },
  });

  const gpuCategory = await prisma.category.create({
    data: {
      name: 'Graphics Cards',
      slug: 'graphics-cards',
    },
  });

  const productsData = [
    {
      categoryId: storageCategory.id,
      name: 'Samsung 990 PRO PCIe 4.0 NVMe SSD',
      slug: 'samsung-990-pro',
      description:
        'High performance PCIe Gen 4.0 x4 M.2 2280 internal solid state drive featuring Samsung V-NAND TLC technology and Pascal controller. Speeds up to 7450 MB/s read and 6900 MB/s write. Features dedicated LPDDR4 DRAM cache.',
      basePrice: 119.99,
      variants: [
        {
          sku: 'MZ-V9P1T0B-AM',
          attributes: {
            capacity: '1TB',
            heatsink: false,
            formFactor: 'M.2 2280',
          },
          priceOverride: 119.99,
          stock: 35,
        },
        {
          sku: 'MZ-V9P2T0B-AM',
          attributes: {
            capacity: '2TB',
            heatsink: false,
            formFactor: 'M.2 2280',
          },
          priceOverride: 179.99,
          stock: 20,
        },
        {
          sku: 'MZ-V9P2T0CW',
          attributes: {
            capacity: '2TB',
            heatsink: true,
            formFactor: 'M.2 2280',
          },
          priceOverride: 199.99,
          stock: 12,
        },
      ],
    },
    {
      categoryId: cpuCategory.id,
      name: 'AMD Ryzen 7 7800X3D Desktop Processor',
      slug: 'amd-ryzen-7-7800x3d',
      description:
        '8-core 16-thread desktop processor utilizing AMD 3D V-Cache technology with 96MB L3 cache. Socket AM5 platform with DDR5 memory support and PCIe 5.0 lanes. 120W TDP.',
      basePrice: 449.0,
      variants: [
        {
          sku: '100-100000910WOF',
          attributes: {
            cores: 8,
            threads: 16,
            socket: 'AM5',
            architecture: 'Zen 4',
          },
          priceOverride: 449.0,
          stock: 18,
        },
      ],
    },
    {
      categoryId: gpuCategory.id,
      name: 'ASUS Dual GeForce RTX 4070 Super EVO OC Edition',
      slug: 'asus-dual-rtx-4070-super',
      description:
        'NVIDIA Ada Lovelace architecture graphics card with 12GB GDDR6X memory on a 192-bit bus. Features 4th Gen Tensor Cores, 3rd Gen RT Cores, DLSS 3 frame generation, and axial-tech dual fan cooling.',
      basePrice: 599.99,
      variants: [
        {
          sku: 'DUAL-RTX4070S-O12G',
          attributes: {
            vram: '12GB',
            memoryType: 'GDDR6X',
            slots: 2.5,
            fans: 2,
          },
          priceOverride: 599.99,
          stock: 8,
        },
      ],
    },
  ];

  for (const item of productsData) {
    const { variants, ...productInfo } = item;

    const product = await prisma.product.create({
      data: {
        categoryId: productInfo.categoryId,
        name: productInfo.name,
        slug: productInfo.slug,
        description: productInfo.description,
        basePrice: productInfo.basePrice,
      },
    });

    const textToEmbed = `${productInfo.name} - ${productInfo.description}`;
    const embedding = await getEmbedding(textToEmbed);
    const vectorString = `[${embedding.join(',')}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
      vectorString,
      product.id,
    );

    for (const variant of variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: variant.sku,
          attributes: variant.attributes,
          priceOverride: variant.priceOverride,
          stock: variant.stock,
        },
      });
    }
  }
}

main()
  .then(() => {
    console.log('Database seeded successfully with embeddings.');
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
