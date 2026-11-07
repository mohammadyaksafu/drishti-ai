import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DIVISIONS } from '../utils/bangladesh';
import AuthLayout from '../components/AuthLayout';
import { useLang } from '../i18n';

export default function Register() {
  const { register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    phone: '',
    district: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password.length < 8) return setError(t('reg.err.short'));
    if (form.password !== form.confirm) return setError(t('reg.err.match'));

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        district: form.district,
      });
      navigate('/report', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={t('reg.eyebrow')}
      title={t('reg.title')}
      description={t('reg.desc')}
      footer={
        <>
          {t('reg.have')}{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-600">
            {t('reg.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="label">{t('f.name')}</label>
          <input id="name" type="text" required autoComplete="name" className="field" value={form.name} onChange={set('name')} />
        </div>

        <div>
          <label htmlFor="email" className="label">{t('f.email')}</label>
          <input id="email" type="email" required autoComplete="email" className="field" value={form.email} onChange={set('email')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="label">{t('f.phone')} <span className="font-normal text-ink-muted">{t('f.optional')}</span></label>
            <input id="phone" type="tel" autoComplete="tel" className="field" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label htmlFor="district" className="label">{t('f.division')}</label>
            <select id="district" className="field" value={form.district} onChange={set('district')}>
              <option value="">{t('f.select')}</option>
              {DIVISIONS.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="label">{t('f.password')}</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password" className="field" value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label htmlFor="confirm" className="label">{t('f.confirm')}</label>
            <input id="confirm" type="password" required autoComplete="new-password" className="field" value={form.confirm} onChange={set('confirm')} />
          </div>
        </div>

        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {t('reg.submit')}
        </button>
      </form>
    </AuthLayout>
  );
}
