import { api } from './api';

export interface TrackingStep {
  status: string;
  label: string;
  timestamp: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  couponCode?: string;
  status: string;
  trackingSteps: TrackingStep[];
  createdAt: string;
  updatedAt: string;
}

export const orderService = {
  listAll: async (): Promise<Order[]> => {
    const res = await api.get('/orders/all');
    return res.data.orders ?? [];
  },

  updateStatus: async (
    orderId: string,
    status: string,
    step: Omit<TrackingStep, 'timestamp'>,
  ): Promise<void> => {
    await api.patch(`/orders/${orderId}/status`, { status, step });
  },
};
