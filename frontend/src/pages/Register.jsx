import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DIVISIONS } from '../utils/bangladesh';

export default function Register() {
  const { register } = useAuth();
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

    if (form.password.length < 8) return setError('Your password needs at least 8 characters.');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');

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
    <div className="container-page grid place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="card p-7">
          <p className="eyebrow">Join the network</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Report hazards, follow their analysis, and see when they get fixed.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <input id="name" type="text" required autoComplete="name" className="field" value={form.name} onChange={set('name')} />
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" required autoComplete="email" className="field" value={form.email} onChange={set('email')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="label">Phone <span className="font-normal text-ink-muted">(optional)</span></label>
                <input id="phone" type="tel" autoComplete="tel" className="field" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label htmlFor="district" className="label">Division</label>
                <select id="district" className="field" value={form.district} onChange={set('district')}>
                  <option value="">Select…</option>
                  {DIVISIONS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="label">Password</label>
                <input id="password" type="password" required minLength={8} autoComplete="new-password" className="field" value={form.password} onChange={set('password')} />
              </div>
              <div>
                <label htmlFor="confirm" className="label">Confirm password</label>
                <input id="confirm" type="password" required autoComplete="new-password" className="field" value={form.confirm} onChange={set('confirm')} />
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              Create account
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-800 hover:text-brand-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
