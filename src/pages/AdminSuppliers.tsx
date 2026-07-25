import { useState, useEffect } from 'react';
import { supabase, type DatabaseSupplier } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Buildings, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react';

export default function AdminSuppliers() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<DatabaseSupplier[]>([]);
  const [search, setSearch] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err: any) {
      console.error('Fetch suppliers error:', err);
      showToast('Failed to load supplier directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    s.legal_name.toLowerCase().includes(search.toLowerCase()) ||
    s.supplier_code.toLowerCase().includes(search.toLowerCase()) ||
    (s.gstin && s.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Buildings size={28} className="text-[#C5A059]" />
              <span>Pharmaceutical Suppliers Directory</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage licensed Ayurvedic raw material & finished goods vendors, GSTIN details, and drug licenses.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <AdminCard>
          <div className="relative max-w-md">
            <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Supplier Name, Code, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </AdminCard>

        {/* Suppliers List */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : filteredSuppliers.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Suppliers Registered</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Vendor records will appear here as procurement purchase orders are configured.
              </p>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Supplier Code</th>
                    <th>Legal Name / Trade Name</th>
                    <th>GSTIN</th>
                    <th>Drug License #</th>
                    <th>Contact Person</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(s => (
                    <tr key={s.id}>
                      <td className="font-mono font-bold text-[#1D3A28]">{s.supplier_code}</td>
                      <td>
                        <div className="font-bold">{s.legal_name}</div>
                        {s.trade_name && <div className="text-[10px] text-slate-500">{s.trade_name}</div>}
                      </td>
                      <td className="font-mono text-[11px]">{s.gstin || 'Unconfigured'}</td>
                      <td className="font-mono text-[11px]">{s.drug_license_number || 'N/A'}</td>
                      <td>
                        <div>{s.contact_person || 'N/A'}</div>
                        <div className="font-mono text-[10px] text-slate-500">{s.phone || s.email}</div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-slate-500">
                        {new Date(s.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}
      </div>
    </AdminLayout>
  );
}
