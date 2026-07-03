"use client";

export function PrintActions({
  label = "Print",
  pdfLabel = "Save as PDF",
}: {
  label?: string;
  pdfLabel?: string;
}) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        title="Opens print dialog — choose Save as PDF"
      >
        {pdfLabel}
      </button>
    </div>
  );
}
