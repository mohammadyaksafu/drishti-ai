import { FlagBD } from './Footer';

export const SLOGAN = 'সবার আগে বাংলাদেশ';

/** The national slogan, flown above every page in the flag's colours. */
export default function SloganBar() {
  return (
    <div className="relative overflow-hidden bg-[#006a4e] text-white">
      {/* a slow sheen travelling across the strip */}
      <span
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-[sheen_6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent"
        aria-hidden="true"
      />
      <p className="container-page relative flex h-9 items-center justify-center gap-3 text-center" lang="bn">
        <FlagBD className="h-3.5 w-6 shadow-sm ring-1 ring-white/30" />
        <span className="font-bangla text-xl leading-none tracking-wide">{SLOGAN}</span>
        <span className="h-2.5 w-2.5 rounded-full bg-[#f42a41] shadow-[0_0_10px_2px_rgba(244,42,65,0.7)]" aria-hidden="true" />
      </p>
    </div>
  );
}
