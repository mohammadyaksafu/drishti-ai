import { Link } from 'react-router-dom';

/** An eye-shaped aperture: "drishti" is Bengali/Sanskrit for sight. */
export default function Logo({ dark = false }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="DRISHTI AI home">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient shadow-btn-primary">
        <span className="grid h-4 w-[22px] place-items-center rounded-[50%] border-2 border-brand-200/90">
          <span className="h-2 w-2 rounded-full bg-magenta-400 transition-transform duration-300 group-hover:scale-125" />
        </span>
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        DRISHTI<span className={dark ? 'text-brand-300' : 'text-brand-700'}> AI</span>
      </span>
    </Link>
  );
}
