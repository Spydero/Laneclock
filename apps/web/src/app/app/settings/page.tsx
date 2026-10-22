"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export default function SettingsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api<MeResponse>("/v1/me").then(setMe);
  }, []);

  if (!me) return <p className="text-sand-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-4xl">Settings</h1>
        <p className="text-sand-400">Profile and organization (demo).</p>
      </div>
      <div className="panel space-y-3 p-6 text-sm">
        <Row k="Name" v={me.user.name} />
        <Row k="Email" v={me.user.email} />
        <Row k="Role" v={me.membership?.role ?? "-"} />
        <Row k="Organization" v={me.membership?.organization.name ?? "-"} />
        <Row k="Approval" v={me.membership?.organization.approvalStatus ?? "-"} />
      </div>
      <p className="text-xs text-sand-400">
        Password changes use BetterAuth account flows in production; demo accounts stay on{" "}
        <code className="text-teal-300">demo1234</code>.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-teal-400/10 pb-2">
      <span className="text-sand-400">{k}</span>
      <span>{v}</span>
    </div>
  );
}
