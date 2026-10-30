import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div className="bg-grid-light mask-fade-b pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="container-page relative grid min-h-[65vh] place-items-center py-16 text-center">
        <div className="animate-fade-up">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Compass className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="mt-8 font-display text-7xl font-bold tracking-tight text-ink/10 sm:text-8xl">404</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">This road does not exist</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-muted">
            The page you asked for is not part of DRISHTI AI. Head back to the map or report a hazard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">Back to home</Link>
            <Link to="/map" className="btn-secondary">Open road map</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
