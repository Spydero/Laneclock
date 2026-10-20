"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);

  function load() {
    api<{ notifications: Notification[] }>("/v1/notifications").then((r) =>
      setItems(r.notifications)
    );
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl">Notifications</h1>
          <p className="text-sand-400">In-app stand-in for email.</p>
        </div>
        <button
          className="btn-ghost"
          onClick={async () => {
            await api("/v1/notifications/read-all", { method: "POST", body: "{}" });
            load();
          }}
        >
          Mark all read
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`panel flex items-start justify-between gap-4 p-4 ${
              n.readAt ? "opacity-60" : ""
            }`}
          >
            <div>
              <div className="font-medium">{n.title}</div>
              <div className="text-sm text-sand-400">{n.body}</div>
              <div className="mt-1 text-xs text-sand-400">{fmtDate(n.createdAt)}</div>
            </div>
            {!n.readAt && (
              <button
                className="btn-ghost py-1 text-xs"
                onClick={async () => {
                  await api(`/v1/notifications/${n.id}/read`, { method: "POST", body: "{}" });
                  load();
                }}
              >
                Read
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="text-sand-400">No notifications.</li>}
      </ul>
    </div>
  );
}
