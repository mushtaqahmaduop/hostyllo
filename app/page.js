'use client'
import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hostyllo-production.up.railway.app'

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'checking') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Checking...
    </span>
  )
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
      Online
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      {status}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Room Row ─────────────────────────────────────────────────────────────────
function RoomRow({ room, bed, tenant, status }) {
  const colors = {
    occupied: 'bg-red-500/20 text-red-400 border-red-500/30',
    available: 'bg-green-500/20 text-green-400 border-green-500/30',
    maintenance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  }
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">{room}</div>
        <div>
          <p className="text-sm text-slate-200">{bed}</p>
          <p className="text-xs text-slate-500">{tenant || 'Vacant'}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status]}`}>
        {status}
      </span>
    </div>
  )
}

// ─── Payment Row ──────────────────────────────────────────────────────────────
function PaymentRow({ name, amount, date, type }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{name}</p>
        <p className="text-xs text-slate-500">{date}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
          {type === 'in' ? '+' : '-'}PKR {amount.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [health, setHealth] = useState({ api: 'checking', db: 'checking', redis: 'checking' })
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ api: 'error', db: 'unknown', redis: 'unknown' }))
  }, [])

  const tabs = ['dashboard', 'rooms', 'payments', 'tenants']

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Top Nav ── */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white text-sm">H</div>
          <div>
            <span className="font-bold text-white text-sm">HOSTYLLO</span>
            <span className="ml-2 text-xs text-slate-500">City Hostel Lahore</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>API</span><StatusBadge status={health.api === 'ok' || health.api === undefined ? 'ok' : health.api} />
            <span className="ml-2">DB</span><StatusBadge status={health.db} />
            <span className="ml-2">Redis</span><StatusBadge status={health.redis} />
          </div>
          <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold">W</div>
        </div>
      </nav>

      <div className="flex">

        {/* ── Sidebar ── */}
        <aside className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 p-4 hidden md:block">
          <nav className="space-y-1">
            {[
              { id: 'dashboard', icon: '▦', label: 'Dashboard' },
              { id: 'rooms', icon: '⊞', label: 'Rooms & Beds' },
              { id: 'tenants', icon: '👥', label: 'Tenants' },
              { id: 'payments', icon: '₨', label: 'Payments' },
              { id: 'reports', icon: '📊', label: 'Reports' },
              { id: 'settings', icon: '⚙', label: 'Settings' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === item.id
                    ? 'bg-sky-500/20 text-sky-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Plan badge */}
          <div className="mt-8 p-3 rounded-xl bg-gradient-to-br from-sky-900/40 to-blue-900/40 border border-sky-800/50">
            <p className="text-xs text-sky-400 font-semibold">PRO PLAN</p>
            <p className="text-xs text-slate-400 mt-0.5">Unlimited tenants</p>
            <p className="text-xs text-slate-500 mt-1">PKR 4,999/mo</p>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 p-6">

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white">Good evening, Warden 👋</h1>
                <p className="text-slate-400 text-sm mt-1">Here's what's happening at City Hostel Lahore today.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Beds" value="48" sub="4 floors · 12 rooms" />
                <StatCard label="Occupied" value="41" sub="85% occupancy" color="text-sky-400" />
                <StatCard label="Available" value="7" sub="Ready to rent" color="text-green-400" />
                <StatCard label="This Month" value="PKR 2.1L" sub="↑ 12% vs last month" color="text-yellow-400" />
              </div>

              {/* Two columns */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* Recent Payments */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-slate-200 mb-4">Recent Payments</h2>
                  <PaymentRow name="Ahmed Raza — Bed 3B" amount={8500} date="Today, 2:30 PM" type="in" />
                  <PaymentRow name="Bilal Khan — Bed 7A" amount={9000} date="Today, 11:00 AM" type="in" />
                  <PaymentRow name="Usman Ali — Bed 12C" amount={7500} date="Yesterday" type="in" />
                  <PaymentRow name="Electricity Bill" amount={15000} date="Jun 1" type="out" />
                </div>

                {/* System Status */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-slate-200 mb-4">🔌 System Status</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Railway API (Singapore)', key: 'api' },
                      { label: 'Supabase Database (Mumbai)', key: 'db' },
                      { label: 'Upstash Redis (Cache)', key: 'redis' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">{item.label}</span>
                        <StatusBadge status={item.key === 'api' ? (health.api !== undefined ? 'ok' : 'checking') : health[item.key] || 'checking'} />
                      </div>
                    ))}
                    <div className="mt-4 pt-3 border-t border-slate-700">
                      <p className="text-xs text-slate-500">
                        Last checked: {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Fetching...'}
                      </p>
                      <a
                        href={`${API_URL}/test`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-sky-400 hover:text-sky-300 underline"
                      >
                        Run full connection test →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rooms Tab */}
          {activeTab === 'rooms' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">Rooms & Beds</h1>
                <button className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2 rounded-lg transition">+ Add Room</button>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <RoomRow room="R1" bed="Bed 1A — Single" tenant="Ahmed Raza" status="occupied" />
                <RoomRow room="R1" bed="Bed 1B — Single" tenant="Bilal Khan" status="occupied" />
                <RoomRow room="R2" bed="Bed 2A — Double" tenant="" status="available" />
                <RoomRow room="R2" bed="Bed 2B — Double" tenant="Usman Ali" status="occupied" />
                <RoomRow room="R3" bed="Bed 3A — Single" tenant="" status="maintenance" />
                <RoomRow room="R3" bed="Bed 3B — Single" tenant="Hamza Butt" status="occupied" />
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">Payments</h1>
                <button className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2 rounded-lg transition">+ Record Payment</button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Collected This Month" value="PKR 1.89L" color="text-green-400" />
                <StatCard label="Pending Dues" value="PKR 42,000" color="text-red-400" />
                <StatCard label="Overdue (7+ days)" value="3 tenants" color="text-yellow-400" />
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <PaymentRow name="Ahmed Raza — Bed 1A" amount={8500} date="Jun 6, 2:30 PM" type="in" />
                <PaymentRow name="Bilal Khan — Bed 1B" amount={9000} date="Jun 6, 11:00 AM" type="in" />
                <PaymentRow name="Usman Ali — Bed 2B" amount={7500} date="Jun 5, 4:00 PM" type="in" />
                <PaymentRow name="Hamza Butt — Bed 3B" amount={8000} date="Jun 4, 1:00 PM" type="in" />
                <PaymentRow name="Electricity Bill" amount={15000} date="Jun 1" type="out" />
              </div>
            </div>
          )}

          {/* Tenants Tab */}
          {activeTab === 'tenants' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">Tenants</h1>
                <button className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2 rounded-lg transition">+ Add Tenant</button>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">CNIC</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Bed</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Rent</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Ahmed Raza', cnic: '35201-****-1', bed: '1A', rent: 8500, status: 'paid' },
                      { name: 'Bilal Khan', cnic: '35202-****-3', bed: '1B', rent: 9000, status: 'paid' },
                      { name: 'Usman Ali', cnic: '35203-****-7', bed: '2B', rent: 7500, status: 'due' },
                      { name: 'Hamza Butt', cnic: '35204-****-2', bed: '3B', rent: 8000, status: 'overdue' },
                    ].map((t, i) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                        <td className="px-4 py-3 text-slate-200 font-medium">{t.name}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.cnic}</td>
                        <td className="px-4 py-3 text-slate-300">Bed {t.bed}</td>
                        <td className="px-4 py-3 text-slate-300">PKR {t.rent.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            t.status === 'paid' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            t.status === 'due' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other tabs placeholder */}
          {!['dashboard', 'rooms', 'payments', 'tenants'].includes(activeTab) && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-4xl mb-3">🚧</p>
                <p className="text-slate-400">Coming in Phase 2</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
