import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Send } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import LocationPicker from '../components/LocationPicker';
import { reportsApi } from '../services/api';
import { isInsideBangladesh } from '../utils/bangladesh';

export default function ReportHazard() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [location, setLocation] = useState({});
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const locationReady = isInsideBangladesh(location.latitude, location.longitude);
  const canSubmit = Boolean(file) && locationReady && !submitting;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!file) return setError('Add a photo of the road before submitting.');
    if (!locationReady) {
      return setError('Set a location inside Bangladesh using GPS or by tapping the map.');
    }

    const payload = new FormData();
    payload.append('image', file);
    payload.append('latitude', location.latitude);
    payload.append('longitude', location.longitude);
    payload.append('locationName', locationName.trim());
    payload.append('district', location.district || '');
    payload.append('description', description.trim());

    setSubmitting(true);
    setProgress(0);

    try {
      const { report } = await reportsApi.create(payload, (event_) => {
        if (event_.total) setProgress(Math.round((event_.loaded / event_.total) * 100));
      });
      navigate(`/report/${report._id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Capture</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">Report a road hazard</h1>
        <p className="mt-3 text-ink-soft">
          Take one clear photo of the defect and confirm where it is. The AI analysis usually takes
          30–60 seconds and you will watch it happen on the next screen.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-ink">1. Road image</h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Frame the defect so it fills a good part of the photo — the detector reads defect size as
              part of the severity score.
            </p>
            <ImageUploader file={file} onChange={setFile} disabled={submitting} />
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-ink">2. Location</h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Share your device GPS, or tap the exact spot on the map. Coverage is Bangladesh only.
            </p>
            <LocationPicker value={location} onChange={setLocation} disabled={submitting} />
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-ink">3. Details</h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">Optional, but it helps the repair crew.</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="locationName" className="label">
                  Road or landmark
                </label>
                <input
                  id="locationName"
                  type="text"
                  className="field"
                  placeholder="e.g. Zindabazar Point, near the pharmacy"
                  value={locationName}
                  maxLength={160}
                  disabled={submitting}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="description" className="label">
                  What is wrong here?
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="field resize-y"
                  placeholder="e.g. Deep pit in the left lane, water collects here after rain and it is hidden from riders."
                  value={description}
                  maxLength={600}
                  disabled={submitting}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="mt-1 text-right font-mono text-xs text-ink-muted">
                  {description.length}/600
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky summary rail — on mobile it simply stacks last. */}
        <aside className="lg:col-span-2">
          <div className="card sticky top-24 p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-ink">Ready to submit</h2>

            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">Photo</span>
                <span className={file ? 'font-semibold text-sev-low' : 'text-ink-muted'}>
                  {file ? 'Added' : 'Required'}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">Location</span>
                <span className={locationReady ? 'font-semibold text-sev-low' : 'text-ink-muted'}>
                  {locationReady ? location.district || 'Set' : 'Required'}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-ink-soft">Description</span>
                <span className="text-ink-muted">{description ? 'Added' : 'Optional'}</span>
              </li>
            </ul>

            {error && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            {submitting && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-ink-muted">
                  <span>Uploading image</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-brand-700 transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={!canSubmit} className="btn-primary mt-5 w-full py-3">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Submit for analysis
                </>
              )}
            </button>

            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Your photo and coordinates are stored so authorities can locate the hazard. Reports are
              public on the road map.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
