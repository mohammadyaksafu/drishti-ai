import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload, X, RefreshCw, Camera } from 'lucide-react';
import { useLang } from '../i18n';

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

/** Drag-and-drop road image picker with preview, replace and remove. */
export default function ImageUploader({ file, onChange, disabled = false }) {
  const { t, num } = useLang();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = useCallback(
    (candidate) => {
      if (!candidate) return;
      if (!ACCEPTED.includes(candidate.type)) {
        setError(t('up.badType'));
        return;
      }
      if (candidate.size > MAX_BYTES) {
        setError(t('up.tooBig', { size: num((candidate.size / 1048576).toFixed(1)) }));
        return;
      }
      setError('');
      onChange(candidate);
    },
    [onChange, t, num]
  );

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files?.[0]);
  };

  if (file && preview) {
    return (
      <div className="space-y-3">
        <figure className="relative overflow-hidden rounded-2xl border border-ink-line bg-zinc-50">
          <img src={preview} alt="Road image selected for analysis" className="h-72 w-full object-cover" />
          <figcaption className="flex items-center justify-between gap-3 border-t border-ink-line bg-white px-4 py-2.5">
            <span className="min-w-0 truncate text-sm text-ink-soft" title={file.name}>
              {file.name}
            </span>
            <span className="shrink-0 font-mono text-xs text-ink-muted">
              {(file.size / 1048576).toFixed(2)} MB
            </span>
          </figcaption>
        </figure>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="btn-secondary flex-1"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('up.replace')}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="btn-danger"
            aria-label="Remove selected image"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t('up.remove')}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={t('up.title')}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? 'border-brand-600 bg-brand-50'
            : 'border-ink-line bg-white hover:border-brand-300 hover:bg-brand-50/40'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <ImagePlus className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="font-display text-base font-semibold text-ink">{t('up.title')}</p>
        <p className="mt-1 text-sm text-ink-muted">{t('up.sub')}</p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
          {t('up.formats')}
        </p>
      </div>

      {/* On a phone this opens the camera directly, which is how most reports will arrive. */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary">
          <Camera className="h-4 w-4" aria-hidden="true" />
          {t('up.take')}
        </button>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary">
          <Upload className="h-4 w-4" aria-hidden="true" />
          {t('up.choose')}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        onChange={(e) => accept(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => accept(e.target.files?.[0])}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
