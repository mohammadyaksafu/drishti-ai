import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-800">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-sm uppercase tracking-[0.2em] text-brand-700">Error 404</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">This road does not exist</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          The page you asked for is not part of DRISHTI AI. Head back to the map or report a hazard.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">Back to home</Link>
          <Link to="/map" className="btn-secondary">Open road map</Link>
        </div>
      </div>
    </div>
  );
}
