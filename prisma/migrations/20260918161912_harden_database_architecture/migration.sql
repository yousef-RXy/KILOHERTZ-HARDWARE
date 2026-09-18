CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'CASH_ON_DELIVERY');

DROP INDEX IF EXISTS "Order_stripeSession_key";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "stripeSession";

ALTER TABLE "Category" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");

ALTER TABLE "Product" 
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "text_search" tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
) STORED;

ALTER TABLE "ProductVariant" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "providerPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

CREATE INDEX IF NOT EXISTS "product_text_search_idx" ON "Product" USING gin("text_search");
CREATE INDEX IF NOT EXISTS "product_embedding_idx" ON "Product" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" 
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" 
ADD CONSTRAINT variant_stock_non_negative CHECK (stock >= 0);

ALTER TABLE "Product" 
ADD CONSTRAINT product_price_positive CHECK ("basePrice" >= 0);

ALTER TABLE "ProductVariant" 
ADD CONSTRAINT variant_price_override_positive CHECK ("priceOverride" IS NULL OR "priceOverride" >= 0);

ALTER TABLE "CartItem" 
ADD CONSTRAINT cart_item_quantity_positive CHECK (quantity > 0);

ALTER TABLE "OrderItem" 
ADD CONSTRAINT order_item_quantity_positive CHECK (quantity > 0);

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products" ON "Product" 
FOR SELECT USING ("isActive" = true AND "deletedAt" IS NULL);

CREATE POLICY "Public read categories" ON "Category" 
FOR SELECT USING ("deletedAt" IS NULL);

CREATE POLICY "Public read variants" ON "ProductVariant" 
FOR SELECT USING (true);