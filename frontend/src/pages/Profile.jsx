import { useEffect, useState } from 'react';
import { Loader2, Save, FileBarChart } from 'lucide-react';
import ReportCard from '../components/ReportCard';
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { authApi, reportsApi } from '../services/api';
import { DIVISIONS } from '../utils/bangladesh';

export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState({ name: '', phone: '', district: '', organization: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [stats, setStats] = useState({ total: 0, resolved: 0 });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        district: user.district || '',
        organization: user.organization || '',
      });
    }
  }, [user]);

  useEffect(() => {
    reportsApi
      .list({ mine: 'true', limit: 24 })
      .then((data) => setReports(data.reports))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));

    authApi.me().then((data) => setStats(data.stats)).catch(() => {});
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateProfile(form);
      setMessage('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-page py-10">
      <header>
        <p className="eyebrow">Your account</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">{user?.name}</h1>
        <p className="mt-1.5 text-ink-soft">
          {user?.email} · <span className="capitalize">{user?.role}</span> account
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Reports submitted" value={stats.total} icon={FileBarChart} />
        <StatCard label="Marked resolved" value={stats.resolved} accent="#16a34a" />
        <StatCard
          label="Still open"
          value={Math.max(0, stats.total - stats.resolved)}
          accent="#ea580c"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card h-fit p-5 lg:col-span-1">
          <h2 className="font-display text-lg font-bold text-ink">Profile details</h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <label htmlFor="p-name" className="label">Full name</label>
              <input id="p-name" type="text" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-phone" className="label">Phone</label>
              <input id="p-phone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-district" className="label">Division</label>
              <select id="p-district" className="field" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                <option value="">Select…</option>
                {DIVISIONS.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            {user?.role !== 'citizen' && (
              <div>
                <label htmlFor="p-org" className="label">Organisation</label>
                <input id="p-org" type="text" className="field" placeholder="e.g. Sylhet City Corporation" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              </div>
            )}

            {message && <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              Save changes
            </button>
          </form>
        </section>

        <section className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-ink">Your reports</h2>
          <div className="mt-4">
            {loadingReports && <SkeletonGrid count={4} />}
            {!loadingReports && reports.length === 0 && (
              <EmptyState
                icon={FileBarChart}
                title="You have not reported a hazard yet"
                description="Your submitted reports and their AI analysis will collect here."
                actionLabel="Report a hazard"
                actionTo="/report"
              />
            )}
            {!loadingReports && reports.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {reports.map((report) => (
                  <ReportCard key={report._id} report={report} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
