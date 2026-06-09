import { api } from './api';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  productImage?: string;
  category: string;
  stock: number;
  stockType: string;
  totalWeight?: number;
  weightUnit?: string;
  createdAt: string;
}

export const productService = {
  list: async (): Promise<Product[]> => {
    const res = await api.get('/products', { params: { limit: 100 } });
    return res.data.items ?? [];
  },

  getById: async (id: string): Promise<Product> => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },

  create: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const res = await api.post('/products', product);
    return res.data;
  },

  update: async (id: string, fields: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> => {
    await api.put(`/products/${id}`, fields);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post('/products/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url as string;
  },

  imageFileToBase64: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  },
};
