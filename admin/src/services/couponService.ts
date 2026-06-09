import { api } from './api';

export interface Coupon {
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
}

export const couponService = {
  list: async (): Promise<Coupon[]> => {
    const res = await api.get('/coupons');
    return res.data.coupons ?? [];
  },

  getByCode: async (code: string): Promise<Coupon> => {
    const res = await api.get(`/coupons/${code}`);
    return res.data;
  },

  create: async (coupon: Omit<Coupon, 'usedCount'>): Promise<void> => {
    await api.post('/coupons', { ...coupon, usedCount: 0 });
  },

  update: async (code: string, fields: Partial<Omit<Coupon, 'code'>>): Promise<void> => {
    await api.put(`/coupons/${code}`, fields);
  },

  delete: async (code: string): Promise<void> => {
    await api.delete(`/coupons/${code}`);
  },
};
