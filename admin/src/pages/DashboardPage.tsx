import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService, type Order, type TrackingStep } from '../services/orderService';
import { productService, type Product } from '../services/productService';

function parseDate(timestamp: unknown): Date {
  if (!timestamp) return new Date();
  if (typeof timestamp === 'string' || typeof timestamp === 'number' || timestamp instanceof Date) {
    return new Date(timestamp as string | number | Date);
  }
  return new Date();
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  // Modal / Drawer state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Tab state for orders list: 'new' | 'old'
  const [orderTab, setOrderTab] = useState<'new' | 'old'>('new');

  // Chart hover state
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const loadAll = async () => {
    setOrdersLoading(true);
    setProductsLoading(true);
    try {
      const [fetchedOrders, fetchedProducts] = await Promise.all([
        orderService.listAll(),
        productService.list(),
      ]);
      fetchedOrders.sort((a, b) =>
        parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
      );
      setOrders(fetchedOrders);
      setProducts(fetchedProducts);
    } finally {
      setOrdersLoading(false);
      setProductsLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const formatCurrency = (val: number) => {
    return `£${val.toFixed(2)}`;
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string, label: string) => {
    setUpdatingStatus(newStatus);
    try {
      await orderService.updateStatus(orderId, newStatus, { status: newStatus, label });
      const step: TrackingStep = { status: newStatus, label, timestamp: new Date().toISOString() };
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: newStatus, trackingSteps: [...o.trackingSteps, step] } : o
      ));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev
          ? { ...prev, status: newStatus, trackingSteps: [...prev.trackingSteps, step] }
          : null
        );
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Error updating order status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (ordersLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse h-96" />
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse h-96" />
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalSales = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const grossSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrdersCount = orders.length;
  const aov = activeOrders.length ? totalSales / activeOrders.length : 0;

  // Low Stock Items (Threshold: 10 units for quantity, 5.0 kg for weight)
  const lowStockProducts = products.filter((p) => {
    if (p.stockType === 'weight') {
      return (p.totalWeight ?? 0) <= 5.0;
    }
    return (p.stock ?? 0) <= 10;
  });

  // Month-wise analytics
  // We'll group orders by month
  const monthlyDataMap: Record<string, { monthKey: string; name: string; revenue: number; ordersCount: number; discount: number }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyDataMap[mKey] = {
      monthKey: mKey,
      name: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
      revenue: 0,
      ordersCount: 0,
      discount: 0,
    };
  }

  orders.forEach((o) => {
    if (o.status === 'cancelled') return;
    const date = parseDate(o.createdAt);
    const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    // If it falls within the last 6 months, or if it exists in map, add it
    if (monthlyDataMap[mKey]) {
      monthlyDataMap[mKey].revenue += o.total || 0;
      monthlyDataMap[mKey].ordersCount += 1;
      monthlyDataMap[mKey].discount += o.discount || 0;
    } else {
      // Also track historical months if they are in orders
      const year = date.getFullYear();
      if (year >= 2025) {
        monthlyDataMap[mKey] = {
          monthKey: mKey,
          name: `${monthNames[date.getMonth()]} ${year.toString().slice(-2)}`,
          revenue: o.total || 0,
          ordersCount: 1,
          discount: o.discount || 0,
        };
      }
    }
  });

  const monthlyList = Object.values(monthlyDataMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  // Category sales mapping
  const productCategoryMap: Record<string, string> = {};
  products.forEach((p) => {
    productCategoryMap[p.id] = p.category || 'Uncategorized';
  });

  const categorySalesMap: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.status === 'cancelled') return;
    o.items?.forEach((item) => {
      const cat = productCategoryMap[item.itemId] || 'Uncategorized';
      categorySalesMap[cat] = (categorySalesMap[cat] || 0) + item.price * item.qty;
    });
  });

  const categorySalesList = Object.entries(categorySalesMap)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  const totalCategorySales = categorySalesList.reduce((sum, item) => sum + item.value, 0);

  // New vs Old Orders
  const newOrders = orders.filter((o) => o.status === 'confirmed');
  const oldOrders = orders.filter((o) => o.status !== 'confirmed');

  const displayedOrders = orderTab === 'new' ? newOrders : oldOrders;

  // SVG Month Chart sizing
  const chartHeight = 200;
  const chartWidth = 500;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const maxRevenue = Math.max(...monthlyList.map((m) => m.revenue), 100);
  // Round up max to neat multiples
  const chartMaxY = Math.ceil(maxRevenue / 100) * 100;

  const getCoordinates = (index: number, val: number) => {
    const x = paddingLeft + (index / (monthlyList.length - 1)) * (chartWidth - paddingLeft - paddingRight);
    const y = chartHeight - paddingBottom - (val / chartMaxY) * (chartHeight - paddingTop - paddingBottom);
    return { x, y };
  };

  // Generate SVG path for line
  const linePoints = monthlyList.map((m, idx) => getCoordinates(idx, m.revenue));
  let linePathD = '';
  let areaPathD = '';

  if (linePoints.length > 0) {
    linePathD = `M ${linePoints[0].x} ${linePoints[0].y} ` + linePoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
    areaPathD =
      `${linePathD} L ${linePoints[linePoints.length - 1].x} ${chartHeight - paddingBottom} L ${linePoints[0].x} ${
        chartHeight - paddingBottom
      } Z`;
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Net Sales</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{formatCurrency(totalSales)}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Gross: <span className="font-semibold text-slate-600">{formatCurrency(grossSales)}</span>
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{totalOrdersCount}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Cancelled:{' '}
              <span className="font-semibold text-red-600">{orders.filter((o) => o.status === 'cancelled').length}</span>
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Avg Order Value</p>
            <h3 className="text-xl font-bold text-slate-800 mt-0.5">{formatCurrency(aov)}</h3>
            <p className="text-xs text-slate-400 mt-1">Across active checkout sessions</p>
          </div>
        </div>

        {/* Low Stock Warn */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Low Stock Products</p>
            <h3 className={`text-xl font-bold mt-0.5 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {lowStockProducts.length}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Requires reorder action</p>
          </div>
        </div>
      </div>

      {/* ── Low Stock Products Section ── */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <h4 className="text-sm font-semibold text-amber-800">Inventory Warnings: Low Stock Items</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((p) => {
              const isWeight = p.stockType === 'weight';
              const stockVal = isWeight ? `${p.totalWeight} kg` : `${p.stock} units`;
              const threshold = isWeight ? '5.0 kg' : '10 units';

              return (
                <div key={p.id} className="bg-white p-3 rounded-lg border border-amber-100 flex items-center justify-between shadow-xs">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Stock: <span className="font-semibold text-red-500">{stockVal}</span>{' '}
                      <span className="text-slate-300">·</span> Threshold: {threshold}
                    </p>
                  </div>
                  <Link
                    to={`/products/edit/${p.id}`}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sales Charts Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend SVG Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Monthly Revenue Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Net sales for the last 6 months</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-violet-600 inline-block" />
                  Net Revenue
                </div>
              </div>
            </div>

            {/* SVG Plot */}
            <div className="relative pt-2">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(124, 58, 237)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(124, 58, 237)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const y = paddingTop + r * (chartHeight - paddingTop - paddingBottom);
                  const val = chartMaxY * (1 - r);
                  return (
                    <g key={i} className="opacity-40">
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#E2E8F0"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 4}
                        fill="#94A3B8"
                        fontSize={9}
                        fontFamily="sans-serif"
                        textAnchor="end"
                      >
                        £{Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Gradient area */}
                {areaPathD && <path d={areaPathD} fill="url(#chartGrad)" />}

                {/* Line Path */}
                {linePathD && <path d={linePathD} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" />}

                {/* Data point dots */}
                {linePoints.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredMonthIndex === idx ? 6 : 4}
                      fill={hoveredMonthIndex === idx ? '#7C3AED' : '#FFFFFF'}
                      stroke="#7C3AED"
                      strokeWidth={2}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredMonthIndex(idx)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                    />
                  </g>
                ))}

                {/* X-axis labels */}
                {monthlyList.map((m, idx) => {
                  const pt = getCoordinates(idx, 0);
                  return (
                    <text
                      key={idx}
                      x={pt.x}
                      y={chartHeight - 6}
                      fill="#94A3B8"
                      fontSize={9}
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {m.name}
                    </text>
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredMonthIndex !== null && (
                <div
                  className="absolute bg-slate-900 text-white rounded-lg p-2.5 text-xs shadow-xl pointer-events-none border border-slate-700"
                  style={{
                    left: `${(linePoints[hoveredMonthIndex].x / chartWidth) * 100}%`,
                    top: `${(linePoints[hoveredMonthIndex].y / chartHeight) * 100 - 25}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <p className="font-semibold text-slate-300">{monthlyList[hoveredMonthIndex].name}</p>
                  <p className="font-bold text-sm mt-0.5 text-violet-400">
                    {formatCurrency(monthlyList[hoveredMonthIndex].revenue)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Orders: {monthlyList[hoveredMonthIndex].ordersCount}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Details Table */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Revenue Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-medium border-b border-slate-100 pb-2">
                    <th className="pb-2">Month</th>
                    <th className="pb-2 text-center">Orders</th>
                    <th className="pb-2 text-right">Discounts</th>
                    <th className="pb-2 text-right font-semibold text-slate-600">Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {monthlyList.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-slate-50/50">
                      <td className="py-2.5">{m.name}</td>
                      <td className="py-2.5 text-center">{m.ordersCount}</td>
                      <td className="py-2.5 text-right text-red-500">{m.discount > 0 ? `-${formatCurrency(m.discount)}` : '—'}</td>
                      <td className="py-2.5 text-right text-slate-800 font-bold">{formatCurrency(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Category Share Distribution Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-0.5">Sales by Product Category</h3>
            <p className="text-xs text-slate-400 mb-6">Revenue contributions by category</p>

            {totalCategorySales === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs">
                <svg className="w-10 h-10 mb-2 stroke-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                No sales items recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {categorySalesList.slice(0, 5).map((item, index) => {
                  const pct = totalCategorySales > 0 ? (item.value / totalCategorySales) * 100 : 0;
                  const colors = [
                    'bg-violet-600',
                    'bg-blue-600',
                    'bg-emerald-600',
                    'bg-amber-600',
                    'bg-pink-600',
                  ];
                  const colorClass = colors[index % colors.length];

                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.category}</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(item.value)}{' '}
                          <span className="font-medium text-slate-400 text-[10px]">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colorClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-[11px] text-slate-400 leading-normal mt-4">
            Category calculations map transaction item IDs back to currently defined store catalog categories.
          </div>
        </div>
      </div>

      {/* ── Orders Management Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Panel Header & Tabs */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Order Management</h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage details and fulfillment tracking of customer orders</p>
          </div>
          <button onClick={loadAll} disabled={ordersLoading || productsLoading}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-40 cursor-pointer self-start sm:self-center">
            Reload
          </button>

          {/* Toggle Tab */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 self-start sm:self-center">
            <button
              onClick={() => setOrderTab('new')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                orderTab === 'new' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              New Orders ({newOrders.length})
            </button>
            <button
              onClick={() => setOrderTab('old')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                orderTab === 'old' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Old Orders ({oldOrders.length})
            </button>
          </div>
        </div>

        {/* Orders Table */}
        {displayedOrders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-600 mb-1">No orders in this category</p>
            <p className="text-[11px] text-slate-400">Any customer checkouts will appear here instantly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {displayedOrders.map((o) => {
                  const date = parseDate(o.createdAt);
                  const formattedDate = date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const itemsCount = o.items?.reduce((sum, item) => sum + item.qty, 0) || 0;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* ID */}
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs text-slate-400 truncate max-w-[120px] inline-block">
                          {o.id}
                        </span>
                      </td>

                      {/* Customer UID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-slate-500 truncate max-w-[100px] inline-block">
                          {o.userId}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{formattedDate}</td>

                      {/* Items */}
                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 text-slate-900 font-semibold">{formatCurrency(o.total || 0)}</td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            o.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : o.status === 'shipped'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : o.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              o.status === 'confirmed'
                                ? 'bg-blue-500'
                                : o.status === 'shipped'
                                ? 'bg-amber-500'
                                : o.status === 'delivered'
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </td>

                      {/* Action */}
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

      {/* ── Detailed Order Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Order Management Details</h3>
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Customer</p>
                <p className="text-xs font-mono bg-slate-50 rounded border border-slate-150 px-2.5 py-1.5 text-slate-600">
                  User UID: {selectedOrder.userId}
                </p>
              </div>

              {/* Items List */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ordered Items</p>
                <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {selectedOrder.items?.map((item) => (
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
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
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

              {/* Price Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-xs font-medium text-slate-600 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-800">{formatCurrency(selectedOrder.subtotal || 0)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Net Total</span>
                  <span>{formatCurrency(selectedOrder.total || 0)}</span>
                </div>
              </div>

              {/* Tracking Timeline */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fulfillment Timeline</p>
                <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {selectedOrder.trackingSteps?.map((step, idx) => {
                    const date = parseDate(step.timestamp);
                    const timeStr = date.toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
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

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Current Status:{' '}
                <span className="font-semibold text-slate-700 capitalize">{selectedOrder.status}</span>
              </span>

              <div className="flex gap-2 flex-wrap">
                {/* Cancel Button (only if confirmed) */}
                {selectedOrder.status === 'confirmed' && (
                  <button
                    disabled={updatingStatus !== null}
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, 'cancelled', 'Order Cancelled')
                    }
                    className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
                )}

                {/* Shipped Button (only if confirmed) */}
                {selectedOrder.status === 'confirmed' && (
                  <button
                    disabled={updatingStatus !== null}
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, 'shipped', 'Order Shipped')
                    }
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Ship Order
                  </button>
                )}

                {/* Delivered Button (only if shipped) */}
                {selectedOrder.status === 'shipped' && (
                  <button
                    disabled={updatingStatus !== null}
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, 'delivered', 'Order Delivered')
                    }
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
