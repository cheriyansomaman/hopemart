import { api } from './api';

export interface Party {
  uid: string;
  phone: string;
  name?: string;
  lastLoginAt?: string;
}

export const partyService = {
  listAll: async (): Promise<Party[]> => {
    const res = await api.get('/parties');
    return res.data.parties ?? [];
  },
};
