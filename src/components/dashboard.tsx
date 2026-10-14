"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, LogOut, PiggyBank, RefreshCw, Scale, Sparkles, Wallet } from "lucide-react";
import { Brand } from "./brand";
import { TransactionDialog } from "./transaction-dialog";
import { chooseSpreadsheet } from "./sheet-picker";
import { formatMoney } from "@/lib/money";
import type { Action, ApiError, Ledger, Viewer } from "@/lib/types";

export function Dashboard({ viewer }: { viewer: Viewer }) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [active, setActive] = useState<Action | null>(null);
  const [visible, setVisible] = useState(20);
  const [connecting, setConnecting] = useState(false);
  const requestId = useRef(0);
  const pickerBusy = useRef(false);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await fetch("/api/ledger", { cache: "no-store", signal: AbortSignal.timeout(25_000) });
      const data = await response.json();
      if (requestId.current !== id) return;
      if (!response.ok) { setError(data); return; }
      setLedger(data); setError(null);
    } catch {
      if (requestId.current === id) setError({ error: "Couldn’t load your money. Check your connection, then refresh.", code: "NETWORK" });
    } finally { if (requestId.current === id) setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const focus = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("focus", focus);
    return () => { ++requestId.current; document.removeEventListener("visibilitychange", focus); window.removeEventListener("focus", focus); };
  }, [refresh]);

  async function connect() {
    if (pickerBusy.current) return;
    pickerBusy.current = true;
    setConnecting(true);
    try {
      const response = await fetch("/api/connection", { cache: "no-store" });
      const credentials = await response.json();
      if (!response.ok) { setError(credentials); return; }
      const spreadsheetId = await chooseSpreadsheet(credentials);
      if (!spreadsheetId) return;
      const verified = await fetch("/api/connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spreadsheetId }) });
      if (!verified.ok) { setError(await verified.json()); return; }
      setStatus("Your piggybank is connected.");
      await refresh();
    } catch { setError({ error: "Couldn’t connect your spreadsheet. Check your connection and try again.", code: "PICKER" }); }
    finally { pickerBusy.current = false; setConnecting(false); }
  }

  const canWrite = Boolean(ledger?.canWrite && !error && !loading);
  return <div className="app-shell">
    <header className="app-header"><Brand /><div className="header-right">{viewer.demo ? <span className="demo-tag">LOCAL PREVIEW · FICTIONAL DATA</span> : <><span className="profile-chip"><span className="avatar">{viewer.name.slice(0, 1).toUpperCase()}</span><span>{viewer.name}</span></span><form action="/api/auth/logout" method="POST"><button className="icon-button" aria-label="Sign out" title="Sign out"><LogOut size={19} /></button></form></>}</div></header>
    <main className="dashboard">
      <section className="welcome"><div><div className="eyebrow">YOUR LITTLE MONEY CORNER</div><h1>Hey, {viewer.name}<span className="greeting-sparkle" aria-hidden="true">✦</span></h1><p>Every little bit adds up.</p></div><button className="button refresh-button" disabled={loading} onClick={() => { setStatus(null); void refresh(); }}><RefreshCw size={16} className={loading ? "spinning" : ""} /><span>{loading ? "Refreshing" : "Refresh"}</span></button></section>
      {status && <div className="notice success" role="status">{status}<button className="text-button" onClick={() => setStatus(null)} aria-label="Dismiss message">Dismiss</button></div>}
      {error && <div className="notice error" role="alert"><p>{error.error}</p>{["UNAUTHENTICATED", "RECONNECT"].includes(error.code) ? <a className="button secondary" href="/api/auth/login">Reconnect Google</a> : ["SHEET_ACCESS", "WRONG_SHEET", "PICKER"].includes(error.code) && <button className="button secondary" disabled={connecting} onClick={() => void connect()}>{connecting ? "Connecting…" : "Connect my spreadsheet"}</button>}</div>}
      {ledger?.problem && <div className="notice warning" role="alert">{ledger.problem}</div>}
      {ledger && !ledger.canWrite && !ledger.problem && <div className="notice">Your piggybank is in read-only mode while a parent finishes setup.</div>}
      <section className={`balance-card${error ? " stale" : ""}`} aria-label="Current balance">
        <div className="balance-content"><div className="balance-label"><Wallet size={18} /> {error && ledger ? "LAST LOADED BALANCE" : "IN YOUR PIGGYBANK"}</div><div className={`balance-number${ledger?.balanceCents !== null && (ledger?.balanceCents ?? 0) < 0 ? " negative" : ""}`} aria-live="polite">{ledger ? ledger.balanceCents === null ? "—" : formatMoney(ledger.balanceCents) : loading ? <span className="skeleton balance-skeleton" /> : "—"}</div><div className="balance-note"><span className="small-dot" />{viewer.demo ? "A little preview of your money corner" : "A little saved, a little more possibility"}</div></div>
        <div className="pig-illustration" aria-hidden="true"><span className="floating-coin">$</span><PiggyBank size={114} strokeWidth={1.2} /><span className="pig-sparkle">✦</span><span className="pig-ground" /></div>
      </section>
      <section className="money-actions" aria-label="Record a money change">
        <button className="money-action" disabled={!canWrite} onClick={() => { setStatus(null); setActive("add"); }}><span className="action-symbol add"><ArrowDownLeft size={23} /></span><span><strong>Add money</strong><small>A little more in</small></span><ArrowUpRight size={17} className="action-chevron" /></button>
        <button className="money-action" disabled={!canWrite} onClick={() => { setStatus(null); setActive("spend"); }}><span className="action-symbol spend"><ArrowUpRight size={23} /></span><span><strong>Spend money</strong><small>Something worth it</small></span><ArrowUpRight size={17} className="action-chevron" /></button>
        <button className="money-action" disabled={!canWrite} onClick={() => { setStatus(null); setActive("recount"); }}><span className="action-symbol recount"><Scale size={23} /></span><span><strong>Recount cash</strong><small>Make sure it matches</small></span><ArrowUpRight size={17} className="action-chevron" /></button>
      </section>
      <section className="history" aria-labelledby="history-title"><div className="section-heading"><div><h2 id="history-title">The little ins & outs</h2><p>Your money’s story, one entry at a time.</p></div><span className="history-count">{ledger ? `${ledger.entries.length} ${ledger.entries.length === 1 ? "entry" : "entries"}` : ""}</span></div>
        {!ledger && loading ? <div className="history-loading" aria-label="Loading transactions">{[0, 1, 2].map(value => <div className="skeleton history-skeleton" key={value} />)}</div> : ledger?.entries.length ? <><ul className="transaction-list">{ledger.entries.slice(0, visible).map(entry => {
          const Icon = entry.kind === "recount" ? Scale : entry.kind === "spend" ? ArrowUpRight : ArrowDownLeft;
          return <li className="transaction-row" key={entry.row}><span className={`transaction-icon ${entry.kind}`}><Icon size={19} /></span><div className="transaction-details"><strong>{entry.description || (entry.kind === "recount" ? "Balance reset" : "Money entry")}</strong><span>{entry.date || "No date recorded"}{entry.kind === "recount" && <span className="recount-tag">RECOUNT</span>}</span></div><div className="transaction-money"><strong className={entry.kind === "add" ? "money-in" : ""}>{entry.amountCents === null ? "Balance set" : `${entry.amountCents >= 0 ? "+" : "−"}${formatMoney(Math.abs(entry.amountCents))}`}</strong><span>{entry.balanceCents === null ? "Balance unavailable" : `${formatMoney(entry.balanceCents)} balance`}</span></div></li>;
        })}</ul>{visible < ledger.entries.length && <button className="show-more" onClick={() => setVisible(value => value + 20)}>Show more <ChevronDown size={16} /></button>}</> : <div className="empty-state"><Sparkles size={27} /><p>{error ? "Your entries will appear here once we can load your sheet." : "Your money’s story starts here."}</p></div>}
      </section>
      <div className="bottom-note"><PiggyBank size={19} /><span>Big dreams start with small savings.</span></div>
    </main>
    <footer className="app-footer"><span>A happy little home for your savings.</span><a className="footer-link" href="/privacy">Privacy policy</a></footer>
    <TransactionDialog action={active} balanceCents={ledger?.balanceCents ?? null} onClose={() => setActive(null)} onRefresh={refresh} onSaved={async () => { setStatus("Your entry is saved."); await refresh(); }} />
  </div>;
}
