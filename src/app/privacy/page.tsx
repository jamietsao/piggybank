import type { Metadata } from "next";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Privacy policy | Piggybank",
  description: "How Piggybank uses Google sign-in, spreadsheet data, and login cookies.",
};

export default function PrivacyPage() {
  return <div className="app-shell">
    <header className="app-header"><Brand /><a className="footer-link" href="/">Back to app</a></header>
    <main className="privacy-page">
      <div className="privacy-heading">
        <div className="eyebrow">YOUR MONEY, YOUR INFORMATION</div>
        <h1>Privacy policy</h1>
        <p className="privacy-updated">Updated <time dateTime="2026-10-13">October 13, 2026</time></p>
        <p>Piggybank is a private family app operated by Jamie Tsao. It helps configured family members track physical cash using their own Google Sheets.</p>
      </div>
      <section className="privacy-section" aria-labelledby="privacy-data">
        <h2 id="privacy-data">Information the app uses</h2>
        <p>Google sign-in provides your Google account ID and basic profile information, including your email address. Piggybank uses the account ID to check access. A parent configures your display name and the spreadsheet connected to your account.</p>
        <p>The app reads dates, amounts, balances, and descriptions from that connected spreadsheet. Adding, spending, or recounting money appends a new entry to the same spreadsheet.</p>
      </section>
      <section className="privacy-section" aria-labelledby="privacy-use">
        <h2 id="privacy-use">How that information is used</h2>
        <p>Your information is used to sign you in, open your connected sheet, display your balance and history, and save the entries you request. Google file access is limited to files you authorize through the app, including the spreadsheet selected in Google Picker.</p>
        <p>Google account and spreadsheet data are not sold, used for advertising, or used to train AI models. Their use follows the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including its Limited Use requirements.</p>
      </section>
      <section className="privacy-section" aria-labelledby="privacy-storage">
        <h2 id="privacy-storage">Storage and login cookies</h2>
        <p>Your transaction history stays in Google Sheets. Piggybank has no separate financial database. The app temporarily processes sheet data to display it and record requested changes.</p>
        <p>Private server configuration stores the account IDs, display names, and spreadsheet connections set up by a parent. Google access credentials and login information are kept in an encrypted login cookie that expires after up to 30 days. A separate sign-in cookie lasts up to 10 minutes. Signing out clears the login cookie; it does not delete spreadsheet entries or revoke Google's permission grant.</p>
      </section>
      <section className="privacy-section" aria-labelledby="privacy-services">
        <h2 id="privacy-services">Services that help run the app</h2>
        <p>Google provides sign-in, file selection, and spreadsheet storage. Vercel hosts Piggybank and processes app requests; its operational logs may include request metadata such as IP addresses and URLs. Google Fonts supplies the fonts and receives the metadata needed to serve them.</p>
        <p>The family member managing Piggybank can administer its configuration and hosting. Access by other people to your spreadsheet is controlled by your Google Sheets sharing settings. Piggybank does not add advertising or analytics tools.</p>
      </section>
      <section className="privacy-section" aria-labelledby="privacy-choices">
        <h2 id="privacy-choices">Your choices</h2>
        <p>You can sign out and <a href="https://myaccount.google.com/connections">remove Piggybank's access in your Google account</a>. Your spreadsheet and existing entries remain in Google Drive until you change or delete them there. Ask a parent to remove your account's connection from Piggybank's configuration if you stop using the app.</p>
        <p>Google and Vercel manage their own service data and retention. This page will be updated if Piggybank's data practices change.</p>
      </section>
      <section className="privacy-section" aria-labelledby="privacy-contact">
        <h2 id="privacy-contact">Questions or requests</h2>
        <p>Contact Jamie Tsao at <a href="mailto:piggybank@jamietsao.com">piggybank@jamietsao.com</a> about Piggybank's use of your information or its configured account connections.</p>
      </section>
    </main>
    <footer className="app-footer"><span>A happy little home for your savings.</span><a className="footer-link" href="/">Back to app</a></footer>
  </div>;
}
