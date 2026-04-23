'use client';

export function InvoicePrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-[#1565C0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D47A1]"
    >
      🖨 ბეჭდვა
    </button>
  );
}
