"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Org = {
  id: string;
  name: string;
  slug: string;
  approvalStatus: string;
  _count: { members: number };
};

export default function AdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);

  function load() {
    api<{ organizations: Org[] }>("/v1/admin/organizations").then((r) => setOrgs(r.organizations));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Admin</h1>
        <p className="text-sand-400">Approve client organizations.</p>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-teal-400/15 text-xs uppercase text-sand-400">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b border-teal-400/10">
                <td className="px-4 py-3">
                  <div>{o.name}</div>
                  <div className="font-mono text-xs text-sand-400">{o.slug}</div>
                </td>
                <td className="px-4 py-3">{o.approvalStatus}</td>
                <td className="px-4 py-3">{o._count.members}</td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    className="btn-primary py-1 text-xs"
                    onClick={async () => {
                      await api(`/v1/admin/organizations/${o.id}/approve`, {
                        method: "POST",
                        body: "{}",
                      });
                      load();
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-ghost py-1 text-xs"
                    onClick={async () => {
                      await api(`/v1/admin/organizations/${o.id}/reject`, {
                        method: "POST",
                        body: JSON.stringify({ reason: "Incomplete profile" }),
                      });
                      load();
                    }}
                  >
                    Reject
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
