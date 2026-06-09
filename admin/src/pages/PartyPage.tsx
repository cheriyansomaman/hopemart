import { useEffect, useState } from 'react';
import { partyService, type Party } from '../services/partyService';

export default function PartyPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  const loadParties = async () => {
    setLoading(true);
    try {
      setParties(await partyService.listAll());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadParties(); }, []);

  const formatDate = (ts?: string) =>
    ts ? new Date(ts).toLocaleString() : '—';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <button onClick={loadParties} disabled={loading}
          className="text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-40 cursor-pointer">
          Reload
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : parties.length === 0 ? (
        <p className="text-gray-500">No customers yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">UID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {parties.map(p => (
                <tr key={p.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-[160px]">{p.uid}</td>
                  <td className="px-4 py-3">{p.phone ?? '—'}</td>
                  <td className="px-4 py-3">{p.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.lastLoginAt as string | undefined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
