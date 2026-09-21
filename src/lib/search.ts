import { prisma } from '@/lib/prisma';
import { generateQueryEmbedding } from '@/lib/embeddings';

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  description: string;
  similarity: number;
  rrfScore: number;
  variants: {
    id: string;
    sku: string;
    stock: number;
    priceOverride: number | null;
    attributes?: Record<string, any>;
  }[];
}

export async function hybridHardwareSearch(
  query: string,
  limit: number = 10,
): Promise<SearchResult[]> {
  const sanitizedQuery = query.trim();
  if (!sanitizedQuery) return [];

  const embedding = await generateQueryEmbedding(sanitizedQuery);
  const vectorString = `[${embedding.join(',')}]`;

  const k = 60;
  const similarityFloor = 0.65;

  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      basePrice: string;
      description: string;
      similarity: number;
      rrf_score: number;
    }>
  >`
    WITH vector_matches AS (
      SELECT 
        id,
        1 - (embedding <=> ${vectorString}::vector) AS similarity,
        ROW_NUMBER() OVER (ORDER BY embedding <=> ${vectorString}::vector) AS rank
      FROM "Product"
      WHERE "isActive" = true 
        AND "deletedAt" IS NULL
        AND (1 - (embedding <=> ${vectorString}::vector)) >= ${similarityFloor}
      LIMIT 30
    ),
    text_matches AS (
      SELECT 
        id,
        ts_rank_cd(text_search, websearch_to_tsquery('english', ${sanitizedQuery})) AS score,
        ROW_NUMBER() OVER (ORDER BY ts_rank_cd(text_search, websearch_to_tsquery('english', ${sanitizedQuery})) DESC) AS rank
      FROM "Product"
      WHERE "isActive" = true 
        AND "deletedAt" IS NULL
        AND text_search @@ websearch_to_tsquery('english', ${sanitizedQuery})
      LIMIT 30
    ),
    combined AS (
      SELECT 
        COALESCE(v.id, t.id) AS id,
        COALESCE(v.similarity, 0) AS similarity,
        (
          COALESCE(1.0 / (${k} + v.rank), 0.0) +
          COALESCE(1.0 / (${k} + t.rank), 0.0)
        ) AS rrf_score
      FROM vector_matches v
      FULL OUTER JOIN text_matches t ON v.id = t.id
    )
    SELECT 
      p.id,
      p.name,
      p.slug,
      p."basePrice",
      p.description,
      c.similarity,
      c.rrf_score
    FROM combined c
    JOIN "Product" p ON p.id = c.id
    ORDER BY c.rrf_score DESC
    LIMIT ${limit};
  `;

  if (!results.length) return [];

  const productIds = results.map(r => r.id);
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds } },
    select: {
      id: true,
      sku: true,
      stock: true,
      priceOverride: true,
      attributes: true,
      productId: true,
    },
  });

  const variantMap = new Map<string, typeof variants>();
  for (const variant of variants) {
    const list = variantMap.get(variant.productId) ?? [];
    list.push(variant);
    variantMap.set(variant.productId, list);
  }

  return results.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    basePrice: Number(r.basePrice),
    description: r.description,
    similarity: Number(r.similarity),
    rrfScore: Number(r.rrf_score),
    variants: (variantMap.get(r.id) ?? []).map(v => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock,
      priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
      attributes: (v.attributes || {}) as Record<string, any>,
    })),
  }));
}
