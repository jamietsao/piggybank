"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Scale, X } from "lucide-react";
import { formatMoney, localToday } from "@/lib/money";
import { validateTransaction } from "@/lib/transactions";
import type { Action, ApiError, TransactionInput } from "@/lib/types";

const titles = { add: "Add a little money", spend: "Record something you spent", recount: "Count what’s in your piggybank" };

export function TransactionDialog({ action, balanceCents, onClose, onSaved, onRefresh }: {
  action: Action | null; balanceCents: number | null; onClose: () => void; onSaved: () => Promise<void>; onRefresh: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousAction = useRef<Action | null>(null);
  const submitting = useRef(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uncertain, setUncertain] = useState(false);

  useEffect(() => {
    if (action) {
      if (previousAction.current !== action) {
        setAmount(""); setDescription(""); setDate(localToday()); setError(null); setConfirming(false);
      }
      previousAction.current = action;
      if (!date) setDate(localToday());
      dialog.current?.showModal();
    } else dialog.current?.close();
  // Preserve the draft when closing and reopening the same action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const currentAction = action || previousAction.current || "add";
  const Icon = currentAction === "add" ? ArrowDownLeft : currentAction === "spend" ? ArrowUpRight : Scale;
  let nextBalance = balanceCents;
  try {
    const parsed = validateTransaction({ action: currentAction, amount, description, date });
    if (balanceCents !== null) nextBalance = currentAction === "recount" ? parsed.cents : balanceCents + (currentAction === "spend" ? -parsed.cents : parsed.cents);
  } catch { /* Preview appears once the fields are valid. */ }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || uncertain || balanceCents === null) return;
    setError(null);
    let input: TransactionInput;
    try {
      input = { action: currentAction, amount, description, date, confirmed: confirming, expectedBalanceCents: balanceCents };
      const parsed = validateTransaction(input);
      if (!confirming && (currentAction === "recount" || (currentAction === "spend" && balanceCents - parsed.cents < 0))) {
        setConfirming(true); return;
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Check your entry."); return; }
    submitting.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(25_000) });
      const result = await response.json() as ApiError & { saved?: boolean };
      if (!response.ok) {
        setError(result.error || "Could not save your entry.");
        setConfirming(false);
        if (result.uncertain || response.status >= 500) { setUncertain(true); await onRefresh(); }
        if (result.code === "CONFIRMATION_REQUIRED") await onRefresh();
        return;
      }
      if (!result.saved) throw new Error("Unconfirmed save");
      setAmount(""); setDescription(""); setDate(localToday()); setConfirming(false);
      onClose();
      await onSaved();
    } catch {
      setError("We couldn’t confirm whether this entry saved. Close this window, refresh, and check your history before trying again.");
      setUncertain(true);
      setConfirming(false);
      await onRefresh();
    } finally { submitting.current = false; setSaving(false); }
  }

  return <dialog ref={dialog} className="transaction-dialog" aria-labelledby="transaction-title" onCancel={event => { if (saving) event.preventDefault(); else onClose(); }}>
    <div className="dialog-top"><span className={`action-symbol ${currentAction}`}><Icon size={24} /></span><button type="button" className="icon-button" aria-label="Close entry" disabled={saving} onClick={onClose}><X size={21} /></button></div>
    <h2 id="transaction-title">{titles[currentAction]}</h2>
    <p className="dialog-description">{currentAction === "recount" ? "Count your cash, then enter the total here. This becomes your new balance." : currentAction === "add" ? "A gift, pocket money, or a job well done." : "What did you use your money for?"}</p>
    <form onSubmit={submit}>
      <fieldset disabled={saving || confirming || uncertain}>
        <label htmlFor="amount">{currentAction === "recount" ? "Counted total" : "Amount"}</label>
        <div className="amount-input"><span aria-hidden="true">$</span><input id="amount" name="amount" inputMode="decimal" type="text" autoComplete="off" placeholder="0.00" required value={amount} onChange={event => setAmount(event.target.value)} maxLength={9} /></div>
        <label htmlFor="description">{currentAction === "recount" ? "Note (optional)" : "Description"}</label>
        <input id="description" name="description" type="text" placeholder={currentAction === "add" ? "e.g. Birthday money" : currentAction === "spend" ? "e.g. A new book" : "e.g. Counted my coins, too"} required={currentAction !== "recount"} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} />
        <label htmlFor="date">Date</label>
        <input id="date" name="date" type="date" required min="1900-01-01" max="9999-12-31" value={date} onChange={event => setDate(event.target.value)} />
      </fieldset>
      {nextBalance !== null && <div className="balance-preview"><span>{currentAction === "recount" ? "New balance" : "Balance after this entry"}</span><strong>{formatMoney(nextBalance)}</strong></div>}
      {confirming && <div className="notice warning" role="status">{currentAction === "recount" ? `Your balance will change from ${formatMoney(balanceCents!)} to ${formatMoney(nextBalance!)}. Save this recount?` : `This will take your balance below zero, to ${formatMoney(nextBalance!)}. Save it anyway?`}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
      {uncertain ? <div className="uncertain-actions"><button type="button" className="button secondary" onClick={onClose}>Close and check history</button><button type="button" className="text-button" onClick={() => { setUncertain(false); setError(null); }}>I checked; this entry wasn’t saved</button></div> : <div className="dialog-actions">{confirming && <button type="button" className="button secondary" disabled={saving} onClick={() => setConfirming(false)}>Go back</button>}<button type="submit" className="button primary" disabled={saving || balanceCents === null}><Check size={18} />{saving ? "Saving…" : confirming ? "Confirm and save" : "Save entry"}</button></div>}
    </form>
  </dialog>;
}
