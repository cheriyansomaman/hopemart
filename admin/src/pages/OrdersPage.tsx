import { useEffect, useState } from 'react';
import { orderService, type Order, type TrackingStep } from '../services/orderService';

type StatusFilter = 'all' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

function parseDate(timestamp: unknown): Date {
  if (!timestamp) return new Date();
  if (typeof timestamp === 'string' || typeof timestamp === 'number' || timestamp instanceof Date) {
    return new Date(timestamp as string | number | Date);
  }
  return new Date();
}

function formatCurrency(val: number): string {
  return `£${val.toFixed(2)}`;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped:   'bg-amber-50 text-amber-700 border-amber-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-blue-500',
  shipped:   'bg-amber-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-400',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const fetched = await orderService.listAll();
      fetched.sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
      setOrders(fetched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string, label: string) => {
    setUpdatingStatus(newStatus);
    try {
      await orderService.updateStatus(orderId, newStatus, { status: newStatus, label });
      const step: TrackingStep = { status: newStatus, label, timestamp: new Date().toISOString() };
      const applyUpdate = (o: Order): Order =>
        o.id === orderId
          ? { ...o, status: newStatus, trackingSteps: [...o.trackingSteps, step] }
          : o;
      setOrders(prev => prev.map(applyUpdate));
      setSelectedOrder(prev => (prev?.id === orderId ? applyUpdate(prev) : prev));
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Error updating order status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const counts: Record<StatusFilter, number> = {
    all:       orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || o.id.toLowerCase().includes(q) || o.userId.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'confirmed', label: 'New' },
    { key: 'shipped',   label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm animate-pulse h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 overflow-x-auto flex-shrink-0">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === f.key
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                statusFilter === f.key ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by order ID or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400
                       placeholder:text-slate-400 text-slate-700"
          />
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-40 cursor-pointer ml-auto"
        >
          Reload
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-600 mb-1">No orders found</p>
            <p className="text-[11px] text-slate-400">Try a different filter or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Coupon</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filtered.map(o => {
                  const date = parseDate(o.createdAt);
                  const formattedDate = date.toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  });
                  const itemsCount = o.items?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
                  const styleBadge = STATUS_STYLES[o.status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
                  const styleDot   = STATUS_DOT[o.status]   ?? 'bg-slate-400';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs text-slate-400 truncate max-w-[120px] inline-block">
                          {o.id}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-slate-500 truncate max-w-[100px] inline-block">
                          {o.userId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{formattedDate}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3.5 text-slate-900 font-semibold">{formatCurrency(o.total ?? 0)}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {o.couponCode
                          ? <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{o.couponCode}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styleBadge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${styleDot}`} />
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                     text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-200
                                     transition-all duration-150 cursor-pointer"
                        >
                          Manage
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Order Details</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Customer</p>
                <p className="text-xs font-mono bg-slate-50 rounded border border-slate-150 px-2.5 py-1.5 text-slate-600">
                  User UID: {selectedOrder.userId}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ordered Items</p>
                <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {selectedOrder.items?.map(item => (
                    <div key={item.itemId} className="p-3 bg-white hover:bg-slate-50/50 flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatCurrency(item.price)} × {item.qty}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {formatCurrency(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-xs font-medium text-slate-600 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-800">{formatCurrency(selectedOrder.subtotal ?? 0)}</span>
                </div>
                {(selectedOrder.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Net Total</span>
                  <span>{formatCurrency(selectedOrder.total ?? 0)}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fulfillment Timeline</p>
                <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {selectedOrder.trackingSteps?.map((step, idx) => {
                    const d = parseDate(step.timestamp);
                    const timeStr = d.toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    });
                    return (
                      <div key={idx} className="flex gap-4 relative">
                        <div className="w-6 h-6 rounded-full bg-violet-100 border-2 border-violet-500 flex items-center justify-center flex-shrink-0 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{step.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{timeStr}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Status:{' '}
                <span className="font-semibold text-slate-700 capitalize">{selectedOrder.status}</span>
              </span>
              <div className="flex gap-2 flex-wrap">
                {selectedOrder.status === 'confirmed' && (
                  <button
                    disabled={updatingStatus !== null}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled', 'Order Cancelled')}
                    className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <button
                    disabled={updatingStatus !== null}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'shipped', 'Order Shipped')}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Ship Order
                  </button>
                )}
                {selectedOrder.status === 'shipped' && (
                  <button
                    disabled={updatingStatus !== null}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered', 'Order Delivered')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Deliver Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
