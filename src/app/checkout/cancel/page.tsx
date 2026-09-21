import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full border border-neutral-800 bg-neutral-900/60 backdrop-blur rounded-xl p-6 sm:p-8 space-y-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
          !
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Checkout Incomplete
          </h1>
          <p className="text-sm text-neutral-400">
            No payment was processed. Your reserved items will remain held
            temporarily before being returned to stock.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/cart"
            className="block w-full bg-neutral-100 hover:bg-white text-neutral-900 font-medium py-2.5 px-4 rounded-lg transition text-sm"
          >
            Return to Cart & Retry
          </Link>
          <Link
            href="/"
            className="block w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium py-2.5 px-4 rounded-lg transition text-sm"
          >
            Continue Browsing Catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
