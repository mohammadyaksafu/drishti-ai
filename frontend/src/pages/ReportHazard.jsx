import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileText,
  Loader2,
  MapPin,
  Send,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ImageUploader from '../components/ImageUploader';
import LocationPicker from '../components/LocationPicker';
import { reportsApi } from '../services/api';
import { isInsideBangladesh } from '../utils/bangladesh';
import { formatCoords } from '../utils/format';
import { useLang } from '../i18n';

const STEPS = [
  { key: 'photo', label: 'rep.s1', icon: Camera, hint: 'rep.s1.h' },
  { key: 'location', label: 'rep.s2', icon: MapPin, hint: 'rep.s2.h' },
  { key: 'review', label: 'rep.s3', icon: FileText, hint: 'rep.s3.h' },
];

/** Horizontal stepper with an animated progress track. */
function Stepper({ step, canReach, onJump }) {
  const { t, num } = useLang();
  return (
    <ol className="relative grid grid-cols-3 gap-2">
      <span className="absolute left-[16.6%] right-[16.6%] top-5 h-[3px] rounded-full bg-ink-line" aria-hidden="true">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-600 to-magenta-500 transition-[width] duration-500 ease-out"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
      </span>
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const reachable = canReach(i);
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onJump(i)}
              aria-current={active ? 'step' : undefined}
              aria-label={`${num(i + 1)}: ${t(s.label)}`}
              className={`relative z-10 grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition-all duration-300 disabled:cursor-not-allowed ${
                done
                  ? 'bg-brand-gradient text-white shadow-btn-primary'
                  : active
                  ? 'scale-110 bg-white text-brand-700 ring-2 ring-brand-600 shadow-glow'
                  : 'bg-white text-ink-muted ring-1 ring-ink-line'
              }`}
            >
              {done ? <Check className="h-5 w-5" aria-hidden="true" /> : <s.icon className="h-[18px] w-[18px]" aria-hidden="true" />}
            </button>
            <span className={`mt-2 text-sm font-semibold ${active || done ? 'text-ink' : 'text-ink-muted'}`}>
              {t(s.label)}
            </span>
            <span className="hidden text-xs text-ink-muted sm:block">{t(s.hint)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ReportHazard() {
  const navigate = useNavigate();
  const { t, num } = useLang();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('next');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [location, setLocation] = useState({});
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const locationReady = isInsideBangladesh(location.latitude, location.longitude);
  const stepValid = [Boolean(file), locationReady, true];
  const canReach = (i) => i === 0 || stepValid.slice(0, i).every(Boolean);

  useEffect(() => {
    if (!file) return setPreview('');
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const go = (target) => {
    if (target === step || !canReach(target) || submitting) return;
    setDir(target > step ? 'next' : 'back');
    setError('');
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      if (stepValid[step]) go(step + 1);
      return;
    }
    setError('');
    if (!file) return setError(t('rep.err.photo'));
    if (!locationReady) return setError(t('rep.err.loc'));

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
      setError(err.message || t('rep.err.upload'));
      setSubmitting(false);
    }
  }

  const nextLabel = t(['rep.next1', 'rep.next2', 'rep.submit'][step]);
  const blockedHint = ['rep.need1', 'rep.need2', ''][step] ? t(['rep.need1', 'rep.need2'][step]) : '';

  return (
    <>
      <PageHeader
        eyebrow={t('rep.eyebrow', { n: num(step + 1), total: num(STEPS.length) })}
        title={t('rep.title')}
        description={t('rep.desc')}
      />

      <div className="container-page -mt-6 pb-28 sm:pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="card relative p-5 sm:p-6">
            <Stepper step={step} canReach={canReach} onJump={go} />
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div key={step} data-dir={dir} className="step-panel card p-5 sm:p-7">
              {step === 0 && (
                <>
                  <h2 className="font-display text-xl font-bold text-ink">{t('rep.p1.title')}</h2>
                  <p className="mb-5 mt-1 text-sm text-ink-muted">{t('rep.p1.body')}</p>
                  <ImageUploader file={file} onChange={setFile} disabled={submitting} />
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="font-display text-xl font-bold text-ink">{t('rep.p2.title')}</h2>
                  <p className="mb-5 mt-1 text-sm text-ink-muted">{t('rep.p2.body')}</p>
                  <LocationPicker value={location} onChange={setLocation} disabled={submitting} />
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="font-display text-xl font-bold text-ink">{t('rep.p3.title')}</h2>
                  <p className="mb-5 mt-1 text-sm text-ink-muted">{t('rep.p3.body')}</p>

                  <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                    <button
                      type="button"
                      onClick={() => go(0)}
                      className="group relative overflow-hidden rounded-xl border border-ink-line"
                      title={t('rep.changePhoto')}
                    >
                      {preview && <img src={preview} alt={t('rep.yourPhoto')} className="h-40 w-full object-cover sm:h-full" />}
                      <span className="absolute inset-0 grid place-items-center bg-night-950/60 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {t('rep.changePhoto')}
                      </span>
                    </button>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => go(1)}
                        className="flex w-full items-center gap-3 rounded-xl border border-ink-line bg-canvas p-3 text-left transition-colors hover:border-brand-200"
                      >
                        <span className="icon-tile">
                          <MapPin className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">{location.district || t('rep.locationSet')}</span>
                          <span className="block font-mono text-xs text-ink-muted">
                            {formatCoords(location.latitude, location.longitude)}
                          </span>
                        </span>
                        <span className="ml-auto text-xs font-semibold text-brand-700">{t('rep.change')}</span>
                      </button>

                      <div>
                        <label htmlFor="locationName" className="label">
                          {t('rep.landmark')}
                        </label>
                        <input
                          id="locationName"
                          type="text"
                          className="field"
                          placeholder={t('rep.landmark.ph')}
                          value={locationName}
                          maxLength={160}
                          disabled={submitting}
                          onChange={(e) => setLocationName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="description" className="label">
                      {t('rep.what')}
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      className="field resize-y"
                      placeholder={t('rep.what.ph')}
                      value={description}
                      maxLength={600}
                      disabled={submitting}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <p className="mt-1 text-right font-mono text-xs text-ink-muted">{num(description.length)}/{num(600)}</p>
                  </div>

                  {submitting && (
                    <div className="mt-2 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                      <div className="flex justify-between text-sm font-medium text-brand-900">
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          {t('rep.uploading')}
                        </span>
                        <span className="font-mono">{num(progress)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-magenta-500 transition-[width] duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                    {t('rep.privacy')}
                  </p>
                </>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>

            {/* Action bar: pinned to the bottom of the screen on phones, inline on desktop. */}
            <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-ink-line bg-white/90 px-4 py-3 backdrop-blur-xl sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <div className="mx-auto flex max-w-3xl items-center gap-3">
                {step > 0 ? (
                  <button type="button" onClick={() => go(step - 1)} disabled={submitting} className="btn-secondary px-4 py-3">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('rep.back')}
                  </button>
                ) : (
                  <span className="hidden text-sm text-ink-muted sm:block">{!stepValid[0] && blockedHint}</span>
                )}
                {step > 0 && !stepValid[step] && (
                  <span className="hidden text-sm text-ink-muted sm:block">{blockedHint}</span>
                )}
                <button
                  type="submit"
                  disabled={!stepValid[step] || submitting}
                  className={`btn-primary ml-auto flex-1 py-3 sm:flex-none sm:px-7 ${
                    stepValid[step] && !submitting ? 'btn-glow' : ''
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {t('rep.submitting')}
                    </>
                  ) : step === STEPS.length - 1 ? (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      {nextLabel}
                    </>
                  ) : (
                    <>
                      {nextLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
