import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function defaultReturnDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    customerId: '',
    vehicleId: '',
    expectedReturnDate: defaultReturnDate(),
  });
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = statusFilter === 'all' ? {} : { status: statusFilter };
      const r = await api.get('/rentals', { params });
      setRentals(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load rentals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function openCreate() {
    setError('');
    setQuote(null);
    setQuoteError('');
    try {
      const [c, v] = await Promise.all([
        api.get('/customers'),
        api.get('/vehicles', { params: { available: true } }),
      ]);
      setCustomers(c.data);
      setVehicles(v.data);
      setForm({
        customerId: c.data[0]?.id || '',
        vehicleId: v.data[0]?.id || '',
        expectedReturnDate: defaultReturnDate(),
      });
      setOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open rental form');
    }
  }

  async function refreshQuote(next = form) {
    setQuoteError('');
    if (!next.customerId || !next.vehicleId || !next.expectedReturnDate) {
      setQuote(null);
      return;
    }
    try {
      const r = await api.post('/rentals/quote', next);
      setQuote(r.data);
    } catch (err) {
      setQuote(null);
      setQuoteError(err.response?.data?.error || 'Could not generate quote');
    }
  }

  useEffect(() => {
    if (open) refreshQuote(form);
  }, [open, form.customerId, form.vehicleId, form.expectedReturnDate]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/rentals', form);
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create rental');
    }
  }

  async function handleReturn(rental) {
    if (!confirm(`Return ${rental.vehicleSnapshot.registrationNumber}?`)) return;
    try {
      await api.post(`/rentals/${rental.id}/return`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to return rental');
    }
  }

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === form.vehicleId),
    [vehicles, form.vehicleId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rentals</h1>
          <p className="text-sm text-slate-500">
            Active and historical rental agreements.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + New rental
        </button>
      </div>

      <div className="flex gap-2">
        {[
          ['active', 'Active'],
          ['completed', 'Completed'],
          ['all', 'All'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
              statusFilter === k
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Vehicle</th>
              <th className="px-4 py-3 font-semibold">Period</th>
              <th className="px-4 py-3 font-semibold">Days</th>
              <th className="px-4 py-3 font-semibold">Pricing</th>
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
            {!loading && rentals.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-slate-400">
                  No rentals.
                </td>
              </tr>
            )}
            {rentals.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {r.customerSnapshot?.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Age {r.customerSnapshot?.age}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono">{r.vehicleSnapshot?.registrationNumber}</div>
                  <div className="text-xs text-slate-500">
                    {r.vehicleSnapshot?.make} {r.vehicleSnapshot?.model} · {r.vehicleSnapshot?.type}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{fmtDate(r.startDate)}</div>
                  <div className="text-xs text-slate-500">
                    → {fmtDate(r.actualReturnDate || r.expectedReturnDate)}
                    {!r.actualReturnDate && ' (expected)'}
                  </div>
                </td>
                <td className="px-4 py-3">{r.daysRented}</td>
                <td className="px-4 py-3">
                  <div>
                    Base: ${r.baseCost?.toFixed(2)}{' '}
                    <span className="text-slate-500">
                      {r.ageAdjustment >= 0 ? '+' : ''}
                      ${r.ageAdjustment?.toFixed(2)}
                    </span>
                  </div>
                  <div className="font-semibold">
                    Total: ${r.status === 'completed' ? r.finalAmount?.toFixed(2) : r.totalCost?.toFixed(2)}
                  </div>
                  {r.penaltyCharges > 0 && (
                    <div className="text-xs text-rose-600">
                      Penalty: ${r.penaltyCharges.toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.status === 'active' ? (
                    <span className="badge bg-amber-50 text-amber-700">Active</span>
                  ) : (
                    <span className="badge bg-emerald-50 text-emerald-700">Completed</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'active' && (
                    <button onClick={() => handleReturn(r)} className="btn-success">
                      Return
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
        title="New rental"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button form="rental-form" type="submit" className="btn-primary">
              Confirm rental
            </button>
          </>
        }
      >
        <form id="rental-form" onSubmit={handleCreate} className="space-y-3">
          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div>
            <label className="label">Customer</label>
            <select
              className="input"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              required
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (age {c.age})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Vehicle</label>
            <select
              className="input"
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              required
            >
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.make} {v.model} (${v.dailyRate}/day)
                </option>
              ))}
            </select>
            {vehicles.length === 0 && (
              <div className="mt-1 text-xs text-rose-600">
                No vehicles are currently available.
              </div>
            )}
          </div>
          <div>
            <label className="label">Expected return date</label>
            <input
              type="date"
              className="input"
              value={form.expectedReturnDate}
              onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
              required
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Quote (live from customer service)
            </div>
            {quoteError && (
              <div className="text-sm text-rose-700">{quoteError}</div>
            )}
            {!quote && !quoteError && (
              <div className="text-sm text-slate-500">
                Pick a customer, vehicle, and return date to see pricing.
              </div>
            )}
            {quote && (
              <div className="text-sm space-y-1">
                <div>
                  Days: <span className="font-medium">{quote.days}</span>
                </div>
                <div>
                  Daily rate: ${selectedVehicle?.dailyRate?.toFixed(2) ?? quote.vehicle.dailyRate}
                </div>
                <div>
                  Base cost: <span className="font-medium">${quote.baseCost.toFixed(2)}</span>
                </div>
                <div>
                  Adjustment: <span className="font-medium">${quote.ageAdjustment.toFixed(2)}</span>{' '}
                  <span className="text-slate-500">({quote.ageAdjustmentReason})</span>
                </div>
                <div className="pt-1 border-t border-slate-200 mt-1">
                  Total:{' '}
                  <span className="text-lg font-bold text-slate-900">
                    ${quote.totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
