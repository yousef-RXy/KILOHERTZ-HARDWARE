import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

const prisma = new PrismaClient();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface MatchedProduct {
  id: string;
  name: string;
  description: string;
  basePrice: string;
  similarity: number;
  variants: Array<{
    sku: string;
    attributes: Record<string, unknown>;
    price: number;
    stock: number;
  }>;
}

async function getQueryEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
    config: {
      outputDimensionality: 768,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error('Failed to generate query embedding.');
  }
  return values;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: "A valid 'query' string is required." },
        { status: 400 },
      );
    }

    // 1. Generate 768-dim query embedding
    const queryVector = await getQueryEmbedding(query);
    const vectorString = `[${queryVector.join(',')}]`;

    // 2. Query nearest products with their active variants via cosine similarity
    // 2. Query nearest products with their active variants via cosine similarity
    const matchedProducts = await prisma.$queryRaw<MatchedProduct[]>`
      SELECT 
        p.id,
        p.name,
        p.description,
        p."basePrice",
        1 - (p.embedding <=> ${vectorString}::vector) AS similarity,
        COALESCE(
          json_agg(
            json_build_object(
              'sku', v.sku,
              'attributes', v.attributes,
              'price', COALESCE(v."priceOverride", p."basePrice"),
              'stock', v.stock
            )
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) AS variants
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id
      WHERE p."isActive" = true
        AND (p.embedding <=> ${vectorString}::vector) < 0.35
      GROUP BY p.id
      ORDER BY p.embedding <=> ${vectorString}::vector ASC
      LIMIT 3;
    `;
    if (matchedProducts.length === 0) {
      return NextResponse.json({
        answer:
          "We currently don't have products matching your exact specifications in stock. Try searching for NVMe SSDs, AM5 processors, or RTX 40-series graphics cards.",
        matchedProducts: [],
      });
    }
    // 3. Construct system prompt with retrieved hardware context
    const contextPrompt = matchedProducts
      .map(p => {
        const variantList = p.variants
          .map(
            v =>
              `- SKU: ${v.sku} | Price: $${v.price} | Stock: ${v.stock} | Specs: ${JSON.stringify(v.attributes)}`,
          )
          .join('\n  ');

        return `Product: ${p.name} (Base: $${p.basePrice})
Description: ${p.description}
Variants:
  ${variantList}`;
      })
      .join('\n\n');

    // 4. Run Groq LLM inference
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You are an expert PC hardware concierge for an e-commerce store.
Use the provided store inventory to give technical, direct, and accurate recommendations.
Always mention specific SKUs, prices, stock availability, and specs (PCIe lanes, DRAM cache, VRAM, TDP) when relevant.
Do not hallucinate products that are not present in the context.

AVAILABLE STORE INVENTORY:
${contextPrompt}`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content || 'No recommendation available.';

    return NextResponse.json({
      answer: reply,
      matchedProducts,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('Concierge API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 },
    );
  }
}
