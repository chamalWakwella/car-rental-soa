import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const empty = {
  name: '',
  address: '',
  email: '',
  phone: '',
  dateOfBirth: '2000-01-01',
  licenseNumber: '',
};

function ageBadge(age) {
  if (age == null) return null;
  if (age < 25) return <span className="badge bg-rose-50 text-rose-700">Under 25 (+20%)</span>;
  if (age > 50) return <span className="badge bg-emerald-50 text-emerald-700">50+ (-10%)</span>;
  return <span className="badge bg-slate-100 text-slate-700">Standard</span>;
}

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/customers');
      setCustomers(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setMode('create');
    setEditId(null);
    setForm(empty);
    setError('');
    setOpen(true);
  }

  function openEdit(c) {
    setMode('edit');
    setEditId(c.id);
    setForm({
      name: c.name || '',
      address: c.address || '',
      email: c.email || '',
      phone: c.phone || '',
      dateOfBirth: toDateInput(c.dateOfBirth),
      licenseNumber: c.licenseNumber || '',
    });
    setError('');
    setOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'create') {
        await api.post('/customers', form);
      } else {
        await api.put(`/customers/${editId}`, form);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save customer');
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Delete customer ${c.name}?`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">
            {customers.length} registered customer{customers.length === 1 ? '' : 's'}
          </p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary">
            + Add customer
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Address</th>
              <th className="px-4 py-3 font-semibold">Age</th>
              <th className="px-4 py-3 font-semibold">Pricing tier</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                  No customers yet.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{c.name}</div>
                  {c.licenseNumber && (
                    <div className="text-xs text-slate-500">License: {c.licenseNumber}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>{c.email || '—'}</div>
                  <div className="text-xs text-slate-500">{c.phone || ''}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.address}</td>
                <td className="px-4 py-3">{c.age ?? '—'}</td>
                <td className="px-4 py-3">{ageBadge(c.age)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    {canManage && (
                      <button onClick={() => openEdit(c)} className="btn-secondary">
                        Edit
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(c)}
                        className="btn-secondary text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'create' ? 'Add customer' : 'Edit customer'}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button form="customer-form" type="submit" className="btn-primary">
              {mode === 'create' ? 'Create' : 'Save changes'}
            </button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSave} className="space-y-3">
          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Date of birth</label>
              <input
                className="input"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">License #</label>
              <input
                className="input"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              />
            </div>
          </div>
          {mode === 'edit' && (
            <p className="text-xs text-slate-500">
              Changing the date of birth will affect pricing on future rentals (under-25 surcharge / over-50 discount).
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
