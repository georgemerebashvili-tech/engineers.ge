'use client';

export function InvoicePrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-[#0071CE] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#005BA8]"
    >
      🖨 ბეჭდვა / PDF
    </button>
  );
}
