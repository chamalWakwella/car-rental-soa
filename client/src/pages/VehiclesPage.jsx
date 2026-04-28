import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const empty = {
  type: 'car',
  make: '',
  model: '',
  registrationNumber: '',
  year: 2024,
  dailyRate: 50,
  seats: 5,
  notes: '',
};

export default function VehiclesPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'cars') params.type = 'car';
      if (filter === 'vans') params.type = 'van';
      if (filter === 'available') params.available = true;
      if (filter === 'rented') params.available = false;
      const r = await api.get('/vehicles', { params });
      setVehicles(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/vehicles', form);
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add vehicle');
    }
  }

  async function handleDelete(v) {
    if (!confirm(`Delete ${v.make} ${v.model} (${v.registrationNumber})?`)) return;
    try {
      await api.delete(`/vehicles/${v.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-sm text-slate-500">Cars and vans in the fleet.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Add vehicle
        </button>
      </div>

      <div className="flex gap-2">
        {[
          ['all', 'All'],
          ['cars', 'Cars'],
          ['vans', 'Vans'],
          ['available', 'Available'],
          ['rented', 'On rent'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
              filter === k
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Reg. number</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Make / Model</th>
              <th className="px-4 py-3 font-semibold">Year</th>
              <th className="px-4 py-3 font-semibold">Daily rate</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && vehicles.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-slate-400">
                  No vehicles found.
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-900">{v.registrationNumber}</td>
                <td className="px-4 py-3 capitalize">
                  <span
                    className={`badge ${
                      v.type === 'van'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-brand-50 text-brand-700'
                    }`}
                  >
                    {v.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {v.make} {v.model}
                </td>
                <td className="px-4 py-3">{v.year || '—'}</td>
                <td className="px-4 py-3">${v.dailyRate}/day</td>
                <td className="px-4 py-3">
                  {v.isOnRent ? (
                    <span className="badge bg-rose-50 text-rose-700">On rent</span>
                  ) : (
                    <span className="badge bg-emerald-50 text-emerald-700">Available</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(v)}
                      disabled={v.isOnRent}
                      className="btn-secondary text-rose-700 hover:bg-rose-50"
                      title={v.isOnRent ? 'Vehicle is on rent' : 'Delete vehicle'}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add vehicle"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button form="vehicle-form" type="submit" className="btn-primary">
              Save
            </button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleAdd} className="space-y-3">
          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="car">Car</option>
                <option value="van">Van</option>
              </select>
            </div>
            <div>
              <label className="label">Registration #</label>
              <input
                className="input"
                value={form.registrationNumber}
                onChange={(e) =>
                  setForm({ ...form, registrationNumber: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Make</label>
              <input
                className="input"
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Model</label>
              <input
                className="input"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Year</label>
              <input
                type="number"
                className="input"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: +e.target.value })}
              />
            </div>
            <div>
              <label className="label">Daily rate ($)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.dailyRate}
                onChange={(e) => setForm({ ...form, dailyRate: +e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Seats</label>
              <input
                type="number"
                className="input"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: +e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows="2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
