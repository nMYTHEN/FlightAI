/**
 * Lead-Speicher. Nimmt Kontaktanfragen entgegen (Name/E-Mail/Telefon + Kontext)
 * und hängt sie an leads.json an. leads.json ist gitignored (enthält PII!).
 *
 * TODO: Zustellung an Martireisen (E-Mail/Webhook) — Ziel per Env konfigurierbar,
 * sobald bekannt (LEAD_WEBHOOK_URL / LEAD_EMAIL). Aktuell: lokale Ablage + Log.
 */
import { promises as fs } from "fs";

const FILE = new URL("./leads.json", import.meta.url);

export async function appendLead(lead) {
  const entry = { ...lead, receivedAt: new Date().toISOString() };
  let list = [];
  try {
    list = JSON.parse(await fs.readFile(FILE, "utf-8"));
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  list.push(entry);
  await fs.writeFile(FILE, JSON.stringify(list, null, 2));

  // Optionaler Webhook (z. B. an Martireisen), wenn konfiguriert.
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch (e) {
      console.error("Lead-Webhook-Fehler:", e.message);
    }
  }

  console.log("📥 LEAD:", JSON.stringify({ name: entry.name, email: entry.email, phone: entry.phone, hotel: entry.hotel }));
  return list.length;
}
