import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService, type Product } from '../services/productService';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      setProducts(await productService.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await productService.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <LoadingState />;
  if (!products.length) return <EmptyState />;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">Product</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Category</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Price</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Stock</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Type</th>
            <th className="px-4 py-3.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map(p => (
            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
              {/* Product */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <span className="font-medium text-slate-900">{p.name}</span>
                </div>
              </td>

              {/* Category */}
              <td className="px-4 py-4">
                {p.category ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                   bg-slate-100 text-slate-700">
                    {p.category}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">—</span>
                )}
              </td>

              {/* Price */}
              <td className="px-4 py-4 font-semibold text-slate-800">
                £{p.price?.toFixed(2) ?? '—'}
              </td>

              {/* Stock */}
              <td className="px-4 py-4 text-slate-700">
                {p.stockType === 'weight'
                  ? `${p.totalWeight ?? 0} ${p.weightUnit ?? 'kg'}`
                  : p.stock ?? 0}
              </td>

              {/* Type badge */}
              <td className="px-4 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  p.stockType === 'weight'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-violet-50 text-violet-700 border border-violet-200'
                }`}>
                  {p.stockType === 'weight' ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                  {p.stockType === 'weight' ? 'By Weight' : 'By Qty'}
                </span>
              </td>

              {/* Actions */}
              <td className="px-4 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    to={`/products/edit/${p.id}`}
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
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deleting === p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                               text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200
                               transition-all duration-150 cursor-pointer disabled:opacity-40"
                  >
                    {deleting === p.id ? (
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
          ))}
        </tbody>
      </table>

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-400">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        <button onClick={loadProducts} disabled={loading}
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
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-slate-100 rounded w-40" />
              <div className="h-3 bg-slate-100 rounded w-24" />
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">No products yet</p>
      <p className="text-xs text-slate-400">Add your first product to see it here.</p>
    </div>
  );
}
