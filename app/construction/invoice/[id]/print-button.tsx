'use client';

export function InvoicePrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C2410C]"
    >
      🖨 ბეჭდვა
    </button>
  );
}
