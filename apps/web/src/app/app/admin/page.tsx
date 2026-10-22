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

type StaffForm = {
  name: string;
  email: string;
  password: string;
  role: "OPS" | "ADMIN";
};

export default function AdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [staffErr, setStaffErr] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>({
    name: "",
    email: "",
    password: "",
    role: "OPS",
  });

  function load() {
    api<{ organizations: Org[] }>("/v1/admin/organizations").then((r) => setOrgs(r.organizations));
  }

  useEffect(() => {
    load();
  }, []);

  const pending = orgs.filter((o) => o.approvalStatus === "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Admin</h1>
        <p className="text-sand-400">
          Approve client companies. Create Ops/Admin staff (clients self-register).
        </p>
      </div>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-2xl">Create staff (Ops / Admin)</h2>
        <p className="text-sm text-sand-400">
          Only Admins can create Ops. There is no public Ops sign-up.
        </p>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setStaffMsg(null);
            setStaffErr(null);
            try {
              const r = await api<{ user: { email: string; role: string } }>("/v1/admin/staff", {
                method: "POST",
                body: JSON.stringify(form),
              });
              setStaffMsg(`Created ${r.user.role}: ${r.user.email}`);
              setForm({ name: "", email: "", password: "", role: "OPS" });
            } catch (err) {
              setStaffErr(err instanceof Error ? err.message : "Failed");
            }
          }}
        >
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Temp password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value === "ADMIN" ? "ADMIN" : "OPS" })
              }
            >
              <option value="OPS">OPS</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary">Create staff account</button>
          </div>
        </form>
        {staffMsg && <p className="text-sm text-signal-ok">{staffMsg}</p>}
        {staffErr && <p className="text-sm text-signal-late">{staffErr}</p>}
      </section>

      {pending.length > 0 && (
        <section className="panel border-signal-warn/30 p-5">
          <h2 className="font-display text-2xl text-signal-warn">
            Pending approval ({pending.length})
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pending.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {o.name}{" "}
                  <span className="font-mono text-xs text-sand-400">({o.slug})</span>
                </span>
                <span className="space-x-2">
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
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <h2 className="mb-3 font-display text-2xl">All organizations</h2>
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
                    {o.approvalStatus !== "APPROVED" && (
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
                    )}
                    {o.approvalStatus !== "REJECTED" && (
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
