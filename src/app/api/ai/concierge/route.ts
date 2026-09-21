import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface MatchedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  similarity: number;
  variants: Array<{
    id?: string;
    sku: string;
    attributes: Record<string, unknown>;
    price: number;
    stock: number;
  }>;
}

async function getQueryEmbedding(text: string): Promise<number[] | null> {
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
  } catch (err) {
    console.warn('Query embedding generation failed, using text fallback:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, history } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: "A valid 'query' string is required." },
        { status: 400 },
      );
    }

    const lastUserQuery = Array.isArray(history)
      ? [...history].reverse().find((h: any) => h.role === 'user')?.content
      : '';
    const searchString = lastUserQuery && query.length < 25
      ? `${lastUserQuery} ${query}`
      : query;

    const queryVector = await getQueryEmbedding(searchString);
    let matchedProducts: MatchedProduct[] = [];

    if (queryVector) {
      const vectorString = `[${queryVector.join(',')}]`;
      matchedProducts = await prisma.$queryRaw<MatchedProduct[]>`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p."basePrice",
          1 - (p.embedding <=> ${vectorString}::vector) AS similarity,
          COALESCE(
            json_agg(
              json_build_object(
                'id', v.id,
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
          AND p."deletedAt" IS NULL
          AND p.embedding IS NOT NULL
          AND (p.embedding <=> ${vectorString}::vector) < 0.45
        GROUP BY p.id
        ORDER BY p.embedding <=> ${vectorString}::vector ASC
        LIMIT 3;
      `;
    }

    if (matchedProducts.length === 0) {
      const textMatches = await prisma.$queryRaw<MatchedProduct[]>`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.description,
          p."basePrice",
          0.6 AS similarity,
          COALESCE(
            json_agg(
              json_build_object(
                'id', v.id,
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
          AND p."deletedAt" IS NULL
          AND (
            p.name ILIKE ${'%' + query.trim() + '%'}
            OR p.description ILIKE ${'%' + query.trim() + '%'}
          )
        GROUP BY p.id
        LIMIT 3;
      `;
      if (textMatches.length > 0) {
        matchedProducts.push(...textMatches);
      }
    }

    const encoder = new TextEncoder();

    if (matchedProducts.length === 0) {
      const fallbackReadable = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `event: metadata\ndata: ${JSON.stringify({ matchedProducts: [] })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(
              `event: delta\ndata: ${JSON.stringify({
                text: "We currently don't have products matching your exact requirements in stock. Please try refining your search for NVMe SSDs, AM5 processors, or RTX graphics cards.",
              })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();
        },
      });

      return new Response(fallbackReadable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const contextPrompt = matchedProducts
      .map(p => {
        const variantList = p.variants
          .map(
            v =>
              `- SKU: ${v.sku} | Price: $${v.price} | Stock: ${v.stock} | Specs: ${JSON.stringify(v.attributes)}`,
          )
          .join('\n  ');

        return `Product: ${p.name} (Base: $${p.basePrice})\nDescription: ${p.description}\nVariants:\n  ${variantList}`;
      })
      .join('\n\n');

    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = Array.isArray(history)
      ? history
          .filter((h: any) => h && h.content && (h.role === 'user' || h.role === 'assistant'))
          .slice(-8)
          .map((h: any) => ({
            role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: String(h.content),
          }))
      : [];

    const groqStream = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      temperature: 0.2,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are an expert PC hardware concierge for an e-commerce store.
Use the provided store inventory to give technical, direct, and accurate recommendations.
Always mention specific SKUs, prices, stock availability, and specs (PCIe lanes, DRAM cache, VRAM, TDP) when relevant.
Do not hallucinate products that are not present in the context.
Maintain conversation history and answer follow-up questions accurately.

Presentation & Formatting Rules:
- When comparing 2 or more products or presenting hardware options, ALWAYS provide a well-defined, structured Markdown table with clear column headers.
- Preferred comparison format:
  | Spec / Feature | [Model 1] | [Model 2] |
  or for product listings:
  | Model | Price | Key Specs (Speed, DRAM, TDP) | Stock |
- Keep table columns concise and focused so they are immediately readable.
- Highlight prices, standout specs, and SKUs with bold text.
- Follow up tables with a concise bulleted recommendation explaining which unit is best for specific workloads.

AVAILABLE STORE INVENTORY:
${contextPrompt}`,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `event: metadata\ndata: ${JSON.stringify({ matchedProducts })}\n\n`,
            ),
          );

          for await (const chunk of groqStream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) {
              controller.enqueue(
                encoder.encode(
                  `event: delta\ndata: ${JSON.stringify({ text: delta })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        } catch (streamError) {
          controller.error(streamError);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('Concierge Streaming Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 },
    );
  }
}
