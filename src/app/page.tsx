import { PiggyBank, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Dashboard } from "@/components/dashboard";
import { demoEnabled, googleConfigured, isAllowedAccount, resolveSheetConnection } from "@/lib/config";
import { oauthSession, userSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ signin?: string }> }) {
  if (demoEnabled()) return <Dashboard viewer={{ name: "Alex", demo: true }} />;
  const configured = googleConfigured();
  let error: string | undefined;
  let setupSubject: string | undefined;
  if (configured) {
    try {
      const session = await userSession();
      if (session.googleSub && isAllowedAccount(session.googleSub)) return <Dashboard viewer={{ name: resolveSheetConnection(session.googleSub).displayName, demo: false }} />;
      const oauth = await oauthSession();
      error = oauth.error;
      setupSubject = oauth.setupSubject;
    } catch { error = "The family account configuration needs attention. Ask a parent to check the setup guide."; }
  }
  const query = await searchParams;
  if (query.signin === "expired") error = "That sign-in attempt expired. Please try again.";
  if (query.signin === "configuration") error = "Google sign-in needs a little more setup. Ask a parent to check the setup guide.";
  return <div className="landing-shell">
    <header className="app-header"><Brand /><span className="header-tag">SMALL SAVINGS. BIG POSSIBILITIES.</span></header>
    <main className="landing">
      <div className="eyebrow"><span className="small-dot" /> YOUR MONEY, ALL TOGETHER</div>
      <h1>A little saved.<br /><span>A lot to look forward to.</span></h1>
      <p className="landing-description">Birthday money, a job well done, something you’ve been saving for. Keep track of every little bit.</p>
      <p className="landing-details">See your balance and history, add money, record spending, or recount your cash. Your money record stays in your own Google Sheet.</p>
      <div className="landing-illustration" aria-hidden="true"><span className="coin coin-one">$</span><span className="coin coin-two">$</span><span className="coin coin-three">$</span><PiggyBank size={126} strokeWidth={1.25} /><span className="sparkle">✦</span></div>
      {error && <div className="notice error" role="alert">{error}{setupSubject && <p className="setup-id">Google account ID: <code>{setupSubject}</code></p>}</div>}
      {configured ? <a className="button primary google-signin" href="/api/auth/login"><span className="google-g" aria-hidden="true">G</span> Continue with Google <ArrowUpRight size={18} /></a> : <div className="notice">Google sign-in isn’t connected yet. A parent can follow the project’s setup guide to get started.</div>}
      <p className="signin-caption"><ShieldCheck size={15} /> Connected to your own Google account.</p>
    </main>
    <footer className="app-footer"><span>A happy little home for your savings.</span><a className="footer-link" href="/privacy">Privacy policy</a></footer>
  </div>;
}
