import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatCard from '../components/StatCard.jsx';

export default function DashboardPage() {
  const [vehicleStats, setVehicleStats] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [rentalStats, setRentalStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/vehicles/stats'),
      api.get('/customers/stats'),
      api.get('/rentals/stats'),
    ])
      .then(([v, c, r]) => {
        setVehicleStats(v.data);
        setCustomerStats(c.data);
        setRentalStats(r.data);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load stats'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Live overview from the vehicle, customer, and rental services.
        </p>
      </div>
      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total vehicles"
          value={vehicleStats?.total ?? '—'}
          hint={`${vehicleStats?.cars ?? 0} cars · ${vehicleStats?.vans ?? 0} vans`}
          accent="brand"
        />
        <StatCard
          label="Available"
          value={vehicleStats?.available ?? '—'}
          hint="Ready to rent"
          accent="emerald"
        />
        <StatCard
          label="On rent"
          value={vehicleStats?.onRent ?? '—'}
          hint="Currently rented out"
          accent="amber"
        />
        <StatCard
          label="Customers"
          value={customerStats?.total ?? '—'}
          hint="Registered accounts"
          accent="slate"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active rentals"
          value={rentalStats?.active ?? '—'}
          accent="amber"
        />
        <StatCard
          label="Completed rentals"
          value={rentalStats?.completed ?? '—'}
          accent="emerald"
        />
        <StatCard
          label="Total revenue"
          value={
            rentalStats
              ? `$${(rentalStats.totalRevenue || 0).toFixed(2)}`
              : '—'
          }
          accent="brand"
          hint="From completed rentals"
        />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 mb-2">Architecture</h2>
        <p className="text-sm text-slate-600">
          The browser communicates with a single API gateway. The gateway authenticates
          requests using JWT and forwards them to the auth, vehicle, or customer
          microservice. Each service owns its own MongoDB database and exposes a REST API.
          Services collaborate over HTTP — for example, creating a rental causes the
          customer service to mark the chosen vehicle as on-rent in the vehicle service.
        </p>
        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
          <li>• <span className="font-medium">Auth service</span> issues JWT tokens</li>
          <li>• <span className="font-medium">Vehicle service</span> manages cars and vans</li>
          <li>• <span className="font-medium">Customer service</span> manages customers + rentals (pricing engine)</li>
          <li>• <span className="font-medium">API gateway</span> routes traffic and validates tokens</li>
        </ul>
      </div>
    </div>
  );
}
