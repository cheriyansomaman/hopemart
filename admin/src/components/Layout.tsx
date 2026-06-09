import { signOut } from 'firebase/auth';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';

const navGroups = [
  {
    label: 'General',
    items: [
      {
        to: '/dashboard',
        exact: true,
        label: 'Dashboard',
        subtitle: 'Store overview, revenue charts, and order management',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Products',
    items: [
      {
        to: '/products',
        exact: true,
        label: 'All Products',
        subtitle: 'Browse and manage your product catalog',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
      {
        to: '/products/add',
        exact: false,
        label: 'Add Product',
        subtitle: 'Add a new product to your store catalog',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Coupons',
    items: [
      {
        to: '/coupons',
        exact: true,
        label: 'All Coupons',
        subtitle: 'View and manage your discount codes',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
      },
      {
        to: '/coupons/add',
        exact: false,
        label: 'Add Coupon',
        subtitle: 'Create discount codes for your customers',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Orders',
    items: [
      {
        to: '/orders',
        exact: true,
        label: 'All Orders',
        subtitle: 'View and manage customer orders',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Customers',
    items: [
      {
        to: '/parties',
        exact: true,
        label: 'All Parties',
        subtitle: 'View registered customers and their details',
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

const allItems = navGroups.flatMap(g => g.items);

function matchNav(pathname: string) {
  // Most specific match first (exact), then prefix
  return (
    allItems.find(n => n.exact && pathname === n.to) ??
    allItems.find(n => !n.exact && pathname.startsWith(n.to))
  );
}

export default function Layout() {
  const location = useLocation();
  const currentNav = matchNav(location.pathname);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 fixed h-full z-20">

        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-none">Hopemart</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label} className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium
                       transition-all duration-150 cursor-pointer relative ${
                        isActive
                          ? 'bg-violet-50 text-violet-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-600 rounded-r" />
                        )}
                        <span className={isActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13.5px]
                       font-medium text-slate-500 hover:bg-red-50 hover:text-red-600
                       transition-all duration-150 cursor-pointer group"
          >
            <svg className="w-[18px] h-[18px] text-slate-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 ml-64">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Hopemart</span>
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-slate-800">{currentNav?.label ?? 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-50
                            border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Online
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-slate-900">{currentNav?.label ?? 'Dashboard'}</h1>
            <p className="text-sm text-slate-500 mt-1">{currentNav?.subtitle ?? 'Manage your Hopemart store'}</p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
