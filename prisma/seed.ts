import { GoogleGenAI } from '@google/genai';
import { PrismaClient, OrderStatus, PaymentStatus, PaymentProvider } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    const values = response.embeddings?.[0]?.values;
    return values || null;
  } catch (error) {
    console.warn('Gemini embedding skipped (rate-limit or error):', error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  console.log('Cleaning database...');
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding categories...');
  const storageCategory = await prisma.category.create({
    data: {
      name: 'Storage & Memory',
      slug: 'storage',
    },
  });

  const cpuCategory = await prisma.category.create({
    data: {
      name: 'Processors & Compute',
      slug: 'cpus',
    },
  });

  const gpuCategory = await prisma.category.create({
    data: {
      name: 'Graphics Accelerators',
      slug: 'gpus',
    },
  });

  const displayCategory = await prisma.category.create({
    data: {
      name: 'Reference Displays',
      slug: 'displays',
    },
  });

  const peripheralCategory = await prisma.category.create({
    data: {
      name: 'Industrial Peripherals',
      slug: 'peripherals',
    },
  });

  const categoryMap: Record<string, string> = {
    [storageCategory.id]: storageCategory.name,
    [cpuCategory.id]: cpuCategory.name,
    [gpuCategory.id]: gpuCategory.name,
    [displayCategory.id]: displayCategory.name,
    [peripheralCategory.id]: peripheralCategory.name,
  };

  console.log('Seeding products and variants...');
  const productsData = [
    {
      categoryId: storageCategory.id,
      name: 'QuantumSpeed Pro 2TB NVMe M.2 2280 SSD',
      slug: 'quantumspeed-pro-2tb-nvme-m2-2280',
      description:
        'Enterprise and workstation solid-state storage validated for sustained thermal stability, endurance rating (TBW), and deterministic I/O performance. 7,300 MB/s Read, 6,000 MB/s Write with dedicated LPDDR4 cache.',
      basePrice: 169.99,
      variants: [
        {
          sku: 'QS-1TB-PRO-GEN4',
          attributes: {
            capacity: '1TB',
            brand: 'QuantumSpeed',
            formFactor: 'M.2 2280',
            interface: 'PCIe 4.0 x4',
            nandType: 'TLC',
            speed: '7,000 MB/s',
            tbw: '600 TBW',
            watts: 7.5,
            weightKg: 0.12,
            categoryBadge: 'GEN 4 NVME',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi',
          },
          priceOverride: 99.99,
          stock: 45,
        },
        {
          sku: 'QS-2TB-PRO-GEN4',
          attributes: {
            capacity: '2TB',
            brand: 'QuantumSpeed',
            formFactor: 'M.2 2280',
            interface: 'PCIe 4.0 x4',
            nandType: 'TLC',
            speed: '7,300 MB/s',
            tbw: '1,200 TBW',
            watts: 8.2,
            weightKg: 0.12,
            categoryBadge: 'GEN 4 NVME',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi',
          },
          priceOverride: 169.99,
          stock: 42,
        },
        {
          sku: 'QS-4TB-PRO-GEN4',
          attributes: {
            capacity: '4TB',
            brand: 'QuantumSpeed',
            formFactor: 'M.2 2280',
            interface: 'PCIe 4.0 x4',
            nandType: 'TLC',
            speed: '7,400 MB/s',
            tbw: '2,400 TBW',
            watts: 9.0,
            weightKg: 0.12,
            categoryBadge: 'GEN 4 NVME',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi',
          },
          priceOverride: 329.99,
          stock: 18,
        },
      ],
    },
    {
      categoryId: storageCategory.id,
      name: 'Samsung 990 PRO 4TB PCIe 4.0 NVMe M.2 SSD',
      slug: 'samsung-990-pro-4tb-pcie-4-nvme',
      description:
        'High performance PCIe Gen 4.0 x4 M.2 2280 internal solid state drive featuring Samsung V-NAND TLC technology and Pascal controller. Speeds up to 7,450 MB/s read and 6,900 MB/s write with 4GB LPDDR4 cache.',
      basePrice: 319.99,
      variants: [
        {
          sku: 'MZ-V9P4T0B/AM',
          attributes: {
            capacity: '4TB',
            brand: 'Samsung Semiconductor',
            formFactor: 'M.2 2280',
            interface: 'PCIe 4.0 x4',
            nandType: '3D V-NAND TLC',
            speed: '7,450 MB/s',
            tbw: '2,400 TBW',
            watts: 9.3,
            weightKg: 0.15,
            categoryBadge: 'FLAGSHIP',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuD_EzyUfWjECBXOZXFDPjuDg5RJxAVsOB5aUVhjTnyaIwJRaT-Gc71mDvQroT3ma47k7tbaZwY4fBt3_C2fdnVQxiDFHuTnzMhDWfEwh3hBMzPjgt13uocgGk6Tk9ZhJwnblS7KK7u-hePgpCD5jNOkYXCvkAucmM5TA-VKCUblvRAF9qA_XP0MV6pwAb68vYOi8_Khcf-SGxPTwKXWK80-9UpVtJUjOnq2XgiW-GAIsvXqou0btdHi',
          },
          priceOverride: 319.99,
          stock: 15,
        },
      ],
    },
    {
      categoryId: storageCategory.id,
      name: 'Crucial T700 2TB PCIe Gen5 NVMe with Premium Heatsink',
      slug: 'crucial-t700-2tb-pcie-5-nvme',
      description:
        'Next-gen PCIe 5.0 x4 internal SSD delivering up to 12,400 MB/s read and 11,800 MB/s write. Engineered with Micron 232-layer TLC NAND and DirectStorage optimization for workstations.',
      basePrice: 289.5,
      variants: [
        {
          sku: 'CT2000T700SSD3',
          attributes: {
            capacity: '2TB',
            brand: 'Micron / Crucial',
            formFactor: 'M.2 2280',
            interface: 'PCIe 5.0 x4',
            nandType: '232-Layer TLC',
            speed: '12,400 MB/s',
            tbw: '1,200 TBW',
            watts: 11.5,
            weightKg: 0.25,
            categoryBadge: 'GEN 5.0',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuC9SNoNjJFg89fAxr2BsK9Cdr-ng5C3AInKWMdgAFXLSdNJ0kdcAHG3KVp8nM6avqlukxIb-98XMDRYrcbLxqK1WKZse-8OGFcEuwH2Qe7ozH6GsoSforMOsyqhKhFgAO-5MzhuxNOoN9KwiY4CYXnTBHYFcf4XeBaK28otQTSM53uJcMACXsehWAKIF1HQ3Eo0DgMfP6X-ZKVCAK_abJdtV41E3ysuhFc4PXqHbHPlwM_ahQrCgpF0',
          },
          priceOverride: 289.5,
          stock: 19,
        },
      ],
    },
    {
      categoryId: storageCategory.id,
      name: 'Solidigm D7-P5520 7.68TB Enterprise U.2 2.5" SSD',
      slug: 'solidigm-d7-p5520-768tb-u2',
      description:
        'Enterprise U.2 NVMe solid-state storage with 1 DWPD endurance, 7,100 MB/s sequential read, 4,200 MB/s write, power loss data protection, and enterprise firmware validation.',
      basePrice: 689.0,
      variants: [
        {
          sku: 'SBFP2BG076T0101',
          attributes: {
            capacity: '7.68TB',
            brand: 'Solidigm',
            formFactor: 'U.2 2.5"',
            interface: 'PCIe 4.0 x4',
            nandType: '144-Layer TLC',
            speed: '7,100 MB/s',
            tbw: '14,000 TBW',
            watts: 18.0,
            weightKg: 0.35,
            categoryBadge: 'ENTERPRISE U.2',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuC9SNoNjJFg89fAxr2BsK9Cdr-ng5C3AInKWMdgAFXLSdNJ0kdcAHG3KVp8nM6avqlukxIb-98XMDRYrcbLxqK1WKZse-8OGFcEuwH2Qe7ozH6GsoSforMOsyqhKhFgAO-5MzhuxNOoN9KwiY4CYXnTBHYFcf4XeBaK28otQTSM53uJcMACXsehWAKIF1HQ3Eo0DgMfP6X-ZKVCAK_abJdtV41E3ysuhFc4PXqHbHPlwM_ahQrCgpF0',
          },
          priceOverride: 689.0,
          stock: 8,
        },
      ],
    },
    {
      categoryId: cpuCategory.id,
      name: 'Core i9-13900K Unlocked Desktop Processor',
      slug: 'intel-core-i9-13900k',
      description:
        '24 Cores (8 Performance-cores + 16 Efficient-cores), 32 Threads, up to 5.8 GHz max boost clock, 36MB Intel Smart Cache, 125W Base TDP, LGA1700 socket platform.',
      basePrice: 549.0,
      variants: [
        {
          sku: 'BX8071513900K',
          attributes: {
            cores: 24,
            threads: 32,
            socket: 'LGA1700',
            formFactor: 'LGA1700',
            interface: 'DDR5 / PCIe 5.0',
            brand: 'Intel Corp',
            speed: 'Up to 5.8 GHz',
            watts: 125,
            weightKg: 0.45,
            categoryBadge: 'LGA1700',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuCNDxhTOgLyWOv75vxNXHR1DOOIpeKmgajAJVRRPvmcGPkW8AAkmbjMBKEphfewvMcC2HYaOyNlyngB9jyBHj5GksjUlXvBv7cpuVD-235noi8XALf6zc1MxXDwxLvJSWxYJwisobKfgADC8vxzB2ZtNCNiu12QczjBGLzaPTQbXm2Q1YtXUhEFRF_PZWKt05qDZH6ePMOAkVuJP-NQi4cs_ABRKFgtDeeMNG7rTlKBTdLkPtGqAYNW',
          },
          priceOverride: 549.0,
          stock: 18,
        },
      ],
    },
    {
      categoryId: cpuCategory.id,
      name: 'AMD Ryzen 9 7950X 16-Core 32-Thread Processor',
      slug: 'amd-ryzen-9-7950x',
      description:
        '16 Cores, 32 Threads, 5.7 GHz Boost, 64MB L3 Cache, 170W TDP. Socket AM5 platform engineered for high-concurrency compilation and simulation workloads.',
      basePrice: 539.0,
      variants: [
        {
          sku: '100-100000514WOF',
          attributes: {
            cores: 16,
            threads: 32,
            socket: 'AM5',
            formFactor: 'AM5',
            interface: 'DDR5 / PCIe 5.0',
            brand: 'AMD',
            speed: '5.7 GHz Boost',
            watts: 170,
            weightKg: 0.45,
            categoryBadge: 'AM5 SOCKET',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDHOTUG8zuwIFX1IBRops_voItM45G6BpJSKtiuVtbys9ZWo5XXPPF94toBnnwL9FjIO0jrwDeyD1MTP2NpvYp_k7JpKPa8Vrc3lvSAxuoF_0D1KUE2ErrQQQaLQxqUkiuYuM3ZC74Fyli0JIK-LvpxY9xbaYtdhFjtdUUQFfXIE_Eg5hiep9qFYuF7Aa8niwqGymt7JGnVvweESmYcJBaU2axmzN-GgE1Qam3efx6cT9hQ-Dh_7niu',
          },
          priceOverride: 539.0,
          stock: 22,
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
            formFactor: 'AM5',
            interface: 'DDR5 / PCIe 5.0',
            brand: 'AMD',
            speed: '5.0 GHz Boost',
            watts: 120,
            weightKg: 0.45,
            categoryBadge: '3D V-CACHE',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDHOTUG8zuwIFX1IBRops_voItM45G6BpJSKtiuVtbys9ZWo5XXPPF94toBnnwL9FjIO0jrwDeyD1MTP2NpvYp_k7JpKPa8Vrc3lvSAxuoF_0D1KUE2ErrQQQaLQxqUkiuYuM3ZC74Fyli0JIK-LvpxY9xbaYtdhFjtdUUQFfXIE_Eg5hiep9qFYuF7Aa8niwqGymt7JGnVvweESmYcJBaU2axmzN-GgE1Qam3efx6cT9hQ-Dh_7niu',
          },
          priceOverride: 449.0,
          stock: 18,
        },
      ],
    },
    {
      categoryId: gpuCategory.id,
      name: 'RTX 6000 Ada Generation 48GB GDDR6',
      slug: 'nvidia-rtx-6000-ada-48gb',
      description:
        'NVIDIA Ada Lovelace architecture enterprise workstation GPU. 48GB ECC GDDR6, 18,176 CUDA Cores, 568 4th Gen Tensor Cores, 142 3rd Gen RT Cores, PCIe 4.0 x16, 300W Max TDP.',
      basePrice: 6799.0,
      variants: [
        {
          sku: '900-5G133-2550-000',
          attributes: {
            vram: '48GB ECC GDDR6',
            formFactor: 'FHFL Dual-Slot',
            interface: 'PCIe 4.0 x16',
            brand: 'NVIDIA',
            watts: 300,
            weightKg: 2.85,
            categoryBadge: 'WORKSTATION',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBInGslwxp6hV3ARrNfaYJWNQ5k4kL6Gi4bk5AXF8CkNfNRPv9pGbnOyVao7y0WlAg2dBenlX2vA1UngoiRyl5KMhSjQeToxwi_B5BKI-OmEUGBZRnb-9BipZIOpoKC2_HLpe130Hfv5NHTR9MTCfHR9z72BSpCBz_lHNrSi7fZC8tPxbMUjgvFjW7BHAfKARCUbuoET4JQDUH4Op6Z8U7avBIJDY-QdKwlLGUkR8LoN7xwSyQy9F2u',
          },
          priceOverride: 6799.0,
          stock: 7,
        },
      ],
    },
    {
      categoryId: gpuCategory.id,
      name: 'ASUS Dual GeForce RTX 4070 Super EVO OC Edition',
      slug: 'asus-dual-rtx-4070-super',
      description:
        'NVIDIA Ada Lovelace architecture graphics card with 12GB GDDR6X memory on a 192-bit bus. Features 4th Gen Tensor Cores, DLSS 3 frame generation, and axial-tech dual fan cooling.',
      basePrice: 599.99,
      variants: [
        {
          sku: 'DUAL-RTX4070S-O12G',
          attributes: {
            vram: '12GB GDDR6X',
            formFactor: '2.5-Slot',
            interface: 'PCIe 4.0 x16',
            brand: 'ASUS',
            watts: 220,
            weightKg: 1.2,
            categoryBadge: 'GEFORCE RTX',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBInGslwxp6hV3ARrNfaYJWNQ5k4kL6Gi4bk5AXF8CkNfNRPv9pGbnOyVao7y0WlAg2dBenlX2vA1UngoiRyl5KMhSjQeToxwi_B5BKI-OmEUGBZRnb-9BipZIOpoKC2_HLpe130Hfv5NHTR9MTCfHR9z72BSpCBz_lHNrSi7fZC8tPxbMUjgvFjW7BHAfKARCUbuoET4JQDUH4Op6Z8U7avBIJDY-QdKwlLGUkR8LoN7xwSyQy9F2u',
          },
          priceOverride: 599.99,
          stock: 8,
        },
      ],
    },
    {
      categoryId: displayCategory.id,
      name: 'ColorView Reference 32" 4K UHD IPS Monitor',
      slug: 'colorview-reference-32-4k-uhd',
      description:
        'Hardware-calibrated 3840x2160 @ 60Hz display, 99% Adobe RGB color space coverage, Delta E < 1.0, 400 nits, factory internal 14-bit 3D LUT, DisplayPort 1.4, HDMI 2.1, Thunderbolt 4.',
      basePrice: 1199.0,
      variants: [
        {
          sku: 'CV-32U-CAL',
          attributes: {
            resolution: '3840x2160',
            formFactor: '32-inch 16:9',
            interface: 'DP 1.4 / HDMI 2.1 / TB4',
            brand: 'ColorView',
            watts: 65,
            weightKg: 8.5,
            categoryBadge: 'CALIBRATED',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDkyNlV69bbneQ_aoYCgiU4Un-2UkxlLQGSEo7tS1jcxqO5rnmt5L0m-p1AdlV14aIo-n30YvP5qBrPQqMO7sBkBdSCxK7MpHNOC5pqcS2l_YIls83jNEuY8NMIQIOtxEKDLSUR03k-cVUCQilASw2VLFqkuR843fhbsPywCFuvqcCtmxiaESsqnkWYDg8LyQ2YGRaNgdNPU9RUjPh_M1bf0L5M3Edbk1gjnkF67HmJDh-acz_uAUEC',
          },
          priceOverride: 1199.0,
          stock: 12,
        },
      ],
    },
  ];

  const createdVariants: Record<string, { id: string; price: number; name: string; sku: string }> = {};

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

    const specsText = variants.map((v) => JSON.stringify(v.attributes)).join(' ');
    const textToEmbed = `
Product: ${productInfo.name}
Category: ${categoryMap[productInfo.categoryId]}
Description: ${productInfo.description}
Specifications: ${specsText}
`.trim();

    const embedding = await getEmbedding(textToEmbed);
    if (embedding) {
      const vectorString = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
        vectorString,
        product.id,
      );
    }

    for (const variant of variants) {
      const createdVariant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: variant.sku,
          attributes: variant.attributes,
          priceOverride: variant.priceOverride,
          stock: variant.stock,
        },
      });

      createdVariants[variant.sku] = {
        id: createdVariant.id,
        price: variant.priceOverride ?? Number(productInfo.basePrice),
        name: productInfo.name,
        sku: variant.sku,
      };
    }
  }

  console.log('Seeding customer user and addresses...');
  const user = await prisma.user.create({
    data: {
      name: 'Dr. Evelyn Vance',
      email: 'systems@workstation-labs.io',
      role: 'CUSTOMER',
    },
  });

  const defaultAddress = await prisma.address.create({
    data: {
      userId: user.id,
      street: '400 Technology Parkway, Suite 900, Dock Bay 04',
      city: 'San Jose',
      state: 'CA',
      postalCode: '95110',
      country: 'United States',
      lat: 37.3382,
      lng: -121.8863,
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: user.id,
      street: '1200 Innovation Way, Building 3, Heavy Freight Loading Bay B',
      city: 'Fremont',
      state: 'CA',
      postalCode: '94538',
      country: 'United States',
      lat: 37.5485,
      lng: -121.9886,
      isDefault: false,
    },
  });

  console.log('Seeding sample orders and order items...');
  const order1 = await prisma.order.create({
    data: {
      userId: user.id,
      addressId: defaultAddress.id,
      status: OrderStatus.SHIPPED,
      totalAmount: 718.99,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const qs2tb = createdVariants['QS-2TB-PRO-GEN4'];
  const i9 = createdVariants['BX8071513900K'];

  if (qs2tb) {
    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productVariantId: qs2tb.id,
        titleSnapshot: 'QuantumSpeed Pro 2TB NVMe M.2 2280 SSD',
        skuSnapshot: qs2tb.sku,
        quantity: 1,
        priceAtPurchase: 169.99,
      },
    });
  }

  if (i9) {
    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productVariantId: i9.id,
        titleSnapshot: 'Core i9-13900K Unlocked Desktop Processor',
        skuSnapshot: i9.sku,
        quantity: 1,
        priceAtPurchase: 549.0,
      },
    });
  }

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'pi_sample_stripe_001',
      amount: 718.99,
      currency: 'USD',
      status: PaymentStatus.COMPLETED,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: user.id,
      addressId: defaultAddress.id,
      status: OrderStatus.PAID,
      totalAmount: 13598.0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const rtx6000 = createdVariants['900-5G133-2550-000'];
  if (rtx6000) {
    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productVariantId: rtx6000.id,
        titleSnapshot: 'RTX 6000 Ada Generation 48GB GDDR6',
        skuSnapshot: rtx6000.sku,
        quantity: 2,
        priceAtPurchase: 6799.0,
      },
    });
  }

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'pi_sample_stripe_002',
      amount: 13598.0,
      currency: 'USD',
      status: PaymentStatus.COMPLETED,
    },
  });

  console.log('Seeding completed successfully.');
}

main()
  .then(() => {
    console.log('Database seeded successfully with all Swiss Industrial catalog records.');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
