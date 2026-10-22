"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type InvoiceRow = {
  id: string;
  status: string;
  estimateAmount: string | number;
  invoiceAmount: string | number;
  varianceFlag: boolean;
  shipment: { id: string; referenceCode: string; status: string };
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  function load() {
    api<{ invoices: InvoiceRow[] }>("/v1/catalog/invoices").then((r) => setInvoices(r.invoices));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Invoices (mock)</h1>
        <p className="text-sand-400">No Stripe. Status and variance flags only.</p>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-teal-400/15 text-xs uppercase text-sand-400">
            <tr>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Estimate</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Variance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-teal-400/10">
                <td className="px-4 py-3">
                  <Link
                    href={`/app/shipments/${inv.shipment.id}`}
                    className="font-mono text-teal-300 hover:underline"
                  >
                    {inv.shipment.referenceCode}
                  </Link>
                </td>
                <td className="px-4 py-3">${Number(inv.estimateAmount).toFixed(0)}</td>
                <td className="px-4 py-3">${Number(inv.invoiceAmount).toFixed(0)}</td>
                <td className="px-4 py-3">
                  {inv.varianceFlag ? (
                    <span className="badge bg-signal-late/20 text-signal-late">Flagged</span>
                  ) : (
                    <span className="text-sand-400">OK</span>
                  )}
                </td>
                <td className="px-4 py-3">{inv.status}</td>
                <td className="px-4 py-3">
                  <button
                    className="btn-ghost py-1 text-xs"
                    onClick={async () => {
                      await api(`/v1/catalog/invoices/${inv.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "PAID" }),
                      });
                      load();
                    }}
                  >
                    Mark paid
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
