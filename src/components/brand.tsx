import { PiggyBank } from "lucide-react";

export function Brand() {
  return <a className="brand" href="/" aria-label="Piggybank home"><span className="brand-icon"><PiggyBank size={25} strokeWidth={1.8} /></span><span>piggybank<span className="brand-dot">.</span></span></a>;
}
