import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { couponService, type Coupon } from '../services/couponService';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      setCoupons(await couponService.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCoupons(); }, []);

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
    setDeleting(code);
    try {
      await couponService.delete(code);
      setCoupons(prev => prev.filter(c => c.code !== code));
    } finally {
      setDeleting(null);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) return <LoadingState />;
  if (!coupons.length) return <EmptyState />;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">Code</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Discount</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Min Order</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Usage</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Expires</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {coupons.map(c => {
            const expired = isExpired(c.expiresAt);
            return (
              <tr key={c.code} className="hover:bg-slate-50/60 transition-colors">

                {/* Code */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tracking-widest text-xs">
                      {c.code}
                    </span>
                  </div>
                </td>

                {/* Discount */}
                <td className="px-4 py-4">
                  <span className="font-semibold text-slate-800">
                    {c.type === 'percent' ? `${c.discount}%` : `£${c.discount?.toFixed(2)}`}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-400">
                    {c.type === 'percent' ? 'off' : 'flat'}
                  </span>
                </td>

                {/* Min order */}
                <td className="px-4 py-4 text-slate-600">
                  {c.minOrder ? `£${c.minOrder.toFixed(2)}` : <span className="text-slate-400 text-xs">None</span>}
                </td>

                {/* Usage */}
                <td className="px-4 py-4">
                  <span className="text-slate-700 font-medium">{c.usedCount ?? 0}</span>
                  <span className="text-slate-400 text-xs">
                    {c.maxUses ? ` / ${c.maxUses}` : ' / ∞'}
                  </span>
                </td>

                {/* Expiry */}
                <td className="px-4 py-4 text-slate-600 text-xs">
                  {c.expiresAt
                    ? new Date(c.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    expired
                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${expired ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                    {expired ? 'Expired' : 'Active'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/coupons/edit/${c.code}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                 text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-200
                                 transition-all duration-150 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(c.code)}
                      disabled={deleting === c.code}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200
                                 transition-all duration-150 cursor-pointer disabled:opacity-40"
                    >
                      {deleting === c.code ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-400">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        <button onClick={loadCoupons} disabled={loading}
          className="text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-40 cursor-pointer">
          Reload
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-slate-100 rounded w-32" />
              <div className="h-3 bg-slate-100 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">No coupons yet</p>
      <p className="text-xs text-slate-400">Create your first coupon to see it here.</p>
    </div>
  );
}
