import { prisma } from '@/lib/prisma';
import { checkoutAction } from '@/actions/checkout';

export default async function TestCheckoutPage() {
  // 1. Fetch or create a test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'hardware_tester@example.com',
        name: 'Test Customer',
      },
    });
  }

  // 2. Fetch the first available seeded variant
  const variant = await prisma.productVariant.findFirst({
    where: { stock: { gt: 0 } },
    include: { product: true },
  });

  if (!variant) {
    return (
      <div className="p-8 text-neutral-400">
        No variants with stock found. Make sure you ran{' '}
        <code>pnpm prisma db seed</code>.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-md mx-auto space-y-4 font-sans">
      <h1 className="text-xl font-bold">Checkout Test</h1>
      <div className="rounded border border-neutral-800 p-4 space-y-2 bg-neutral-900 text-white">
        <p>
          <span className="text-neutral-400">Customer:</span> {user.email}
        </p>
        <p>
          <span className="text-neutral-400">Product:</span>{' '}
          {variant.product.name} ({variant.sku})
        </p>
        <p>
          <span className="text-neutral-400">Available Stock:</span>{' '}
          {variant.stock}
        </p>
      </div>

      <form
        action={async () => {
          'use server';
          await checkoutAction(user.id, [
            { variantId: variant.id, quantity: 1 },
          ]);
        }}
      >
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded transition"
        >
          Proceed to Stripe Checkout
        </button>
      </form>
    </div>
  );
}
