import { useState, useEffect } from 'react';
import { api } from '../api';

export default function FinancesTable() {
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    api.getDonations().then(data => {
      setDonations(data.results || data || []);
    }).catch(err => console.error(err));
  }, []);

  const totalDonations = donations.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-6 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">Donations This Month - March 2026</h2>
        <span className="text-xl font-bold text-emerald-600">${totalDonations.toFixed(2)}</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-white border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Service Name</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Session</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Count</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {donations.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No donations recorded this month.</td></tr>
            ) : donations.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-700 font-medium">{row.service_type || 'Regular Service'}</td>
                <td className="px-6 py-4 text-slate-500">{row.date}</td>
                <td className="px-6 py-4 text-slate-500">{row.session || 'Morning'}</td>
                <td className="px-6 py-4">
                  <span className="text-sky-600 font-medium text-xs bg-sky-50 px-2 py-1 rounded">{row.status || 'Completed'}</span>
                </td>
                <td className="px-6 py-4 text-right text-slate-600">-</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600">${parseFloat(row.amount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
