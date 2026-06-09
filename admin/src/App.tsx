import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import AddProductPage from './pages/AddProductPage';
import EditProductPage from './pages/EditProductPage';
import CouponsPage from './pages/CouponsPage';
import AddCouponPage from './pages/AddCouponPage';
import EditCouponPage from './pages/EditCouponPage';
import PartyPage from './pages/PartyPage';
import OrdersPage from './pages/OrdersPage';
import './index.css';

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }

  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/add" element={<AddProductPage />} />
          <Route path="/products/edit/:id" element={<EditProductPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/coupons/add" element={<AddCouponPage />} />
          <Route path="/coupons/edit/:code" element={<EditCouponPage />} />
          <Route path="/parties" element={<PartyPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
