"use client";

import { useEffect } from "react";
import type { SerializedPickup } from "@/lib/pickup-serialize";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function itemLabel(item: SerializedPickup["items"][number]): string {
  return item.variantName
    ? `${item.productName} – ${item.variantName}`
    : item.productName;
}

export function PlocklistaPrintClient({
  pickups,
}: {
  pickups: SerializedPickup[];
}) {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", margin: "16px" }}>
      {pickups.map((pickup) => (
        <div key={pickup.id} style={{ marginBottom: "2rem", pageBreakAfter: "always" }}>
          <div style={{ borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b7280", margin: "0 0 4px" }}>
              Plocklista
            </p>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>
              {pickup.customerName}
            </h1>
            <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 2px" }}>
              {pickup.pickupCode}
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
              {formatDate(pickup.createdAt)}
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #d1d5db" }}>
                <th style={{ width: "28px", padding: "8px 4px", textAlign: "left" }} />
                <th style={{ padding: "8px 4px", textAlign: "left", fontWeight: 700 }}>Produkt</th>
                <th style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700 }}>Antal</th>
                <th style={{ padding: "8px 4px", textAlign: "left", fontWeight: 700 }}>Hylla</th>
              </tr>
            </thead>
            <tbody>
              {pickup.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 4px" }}>
                    <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", border: "2px solid #aaa", verticalAlign: "middle" }} />
                  </td>
                  <td style={{ padding: "8px 4px", fontWeight: 500 }}>{itemLabel(item)}</td>
                  <td style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ padding: "8px 4px" }}>{item.stockLocation ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {pickup.notes ? (
            <div style={{ marginTop: "16px", border: "1px solid #d1d5db", padding: "12px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280", margin: "0 0 4px" }}>
                Notering
              </p>
              <p style={{ fontSize: "13px", margin: 0 }}>{pickup.notes}</p>
            </div>
          ) : null}

        </div>
      ))}
    </div>
  );
}
