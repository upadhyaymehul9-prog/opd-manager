"use client";

import { format } from "date-fns";
import type { PharmacyBillView } from "@/lib/billing-types";
import type { PatientVisit } from "@/lib/types";

export function PharmacyBillReceipt({
  bill,
  visit,
}: {
  bill: PharmacyBillView;
  visit: Pick<PatientVisit, "patient_name" | "token_number">;
}) {
  return (
    <div className="pharmacy-bill-print rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {bill.voided_at && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-red-800">
            Voided — not valid for revenue
          </p>
          <p className="mt-0.5 text-xs text-red-700">
            {format(new Date(bill.voided_at), "d MMM yyyy, h:mm a")} by {bill.voided_by}
            {bill.void_reason ? ` — ${bill.void_reason}` : ""}
          </p>
        </div>
      )}
      <div className="text-center">
        <p className="text-lg font-bold text-slate-900">Clinic Manager — Pharmacy</p>
        <p className="text-sm text-slate-600">Tax invoice / receipt</p>
      </div>

      <div className="mt-4 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          <span className="font-medium">Bill no:</span> {bill.bill_no}
        </p>
        <p>
          <span className="font-medium">Date:</span>{" "}
          {format(new Date(bill.created_at), "d MMM yyyy, h:mm a")}
        </p>
        <p>
          <span className="font-medium">Patient:</span> {visit.patient_name}
        </p>
        <p>
          <span className="font-medium">Token:</span> #{visit.token_number}
        </p>
        <p>
          <span className="font-medium">Payment:</span>{" "}
          {bill.payment_mode.toUpperCase()}
        </p>
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead className="border-b border-slate-200">
          <tr>
            <th className="py-2 pr-2">Medicine</th>
            <th className="py-2 pr-2">HSN</th>
            <th className="py-2 pr-2">Qty</th>
            <th className="py-2 pr-2">Rate</th>
            <th className="py-2 pr-2">GST%</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item) => (
            <tr key={item.id} className="border-b border-slate-100">
              <td className="py-2 pr-2">{item.medicine_name}</td>
              <td className="py-2 pr-2 text-slate-500">{item.hsn_code ?? "—"}</td>
              <td className="py-2 pr-2">{item.quantity}</td>
              <td className="py-2 pr-2">₹{item.unit_price.toFixed(2)}</td>
              <td className="py-2 pr-2">{item.gst_rate}%</td>
              <td className="py-2 text-right">₹{item.line_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
        <div className="flex justify-between">
          <span>Taxable amount</span>
          <span>₹{bill.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>GST total</span>
          <span>₹{bill.gst_total.toFixed(2)}</span>
        </div>
        {bill.discount_amount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>
              Discount{bill.discount_reason ? ` (${bill.discount_reason})` : ""}
            </span>
            <span>−₹{bill.discount_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-slate-900">
          <span>Grand total</span>
          <span>₹{bill.grand_total.toFixed(2)}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Thank you — get well soon
      </p>
    </div>
  );
}
