import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { products as initialProducts, type Product } from '../data/products';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { supabase } from '../lib/supabase';
import { 
  AdminCard, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminMobileRecord, 
  AdminFilterBar, 
  AdminPagination, 
  AdminEmptyState,
  AdminSkeleton
} from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, Eye, Copy, Trash } from '@phosphor-icons/react';

export default function AdminProducts() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'archive' | 'duplicate'; productId: string } | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (dbErr) throw dbErr;

      const mapped: Product[] = (data || []).map((dbP: any) => {
        const staticP = initialProducts.find(p => p.id === dbP.id);
        return {
          id: dbP.id,
          name: dbP.name || '',
          category: dbP.category || '',
          mrp: Number(dbP.mrp),
          sellingPrice: Number(dbP.selling_price),
          packSize: dbP.pack_size || '',
          isActive: dbP.is_active,
          composition: staticP?.composition || '',
          benefits: staticP?.benefits || [],
          usage: staticP?.usage || '',
          shelfLife: staticP?.shelfLife || '3 Years',
          safetyNote: staticP?.safetyNote || 'Ayurvedic formulation',
          image: staticP?.image || undefined,
          transparentImage: staticP?.transparentImage || undefined,
          galleryImages: staticP?.galleryImages || []
        };
      });

      setProductList(mapped);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to fetch products from database.');
      showToast('Error fetching products from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter Categories list
  const categories = ['all', ...Array.from(new Set(productList.map((p) => p.category)))];

  // Filtering
  const filteredProducts = productList.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Pagination calculations
  const totalRecords = filteredProducts.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Handle page resets when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const handleActionClick = (type: 'archive' | 'duplicate', productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingAction({ type, productId });
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsConfirmOpen(false);
    setIsMutating(true);
    const { type, productId } = pendingAction;
    const target = productList.find(p => p.id === productId);
    
    if (!target) {
      setIsMutating(false);
      setPendingAction(null);
      return;
    }

    try {
      if (type === 'duplicate') {
        const uniqueId = `${target.id}-copy-${Math.floor(100 + Math.random() * 900)}`;
        const newName = `${target.name} (Copy)`;
        
        const { error: insertErr } = await supabase
          .from('products')
          .insert({
            id: uniqueId,
            name: newName,
            category: target.category,
            mrp: target.mrp || 249,
            selling_price: target.sellingPrice || 199,
            pack_size: target.packSize || '100g Jar',
            is_active: true
          });

        if (insertErr) throw insertErr;

        showToast(`Duplicated "${target.name}" successfully.`, 'success');
        await fetchProducts();
      } else if (type === 'archive') {
        const { error: updateErr } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', productId);

        if (updateErr) throw updateErr;

        showToast(`Archived "${target.name}" successfully.`, 'success');
        await fetchProducts();
      }
    } catch (err: any) {
      console.error(`Failed to execute ${type} action:`, err);
      showToast(err.message || `Failed to execute ${type} action.`, 'error');
    } finally {
      setIsMutating(false);
      setPendingAction(null);
    }
  };

  const filterOptions = categories.map(cat => ({
    label: cat === 'all' ? 'All Categories' : cat,
    value: cat
  }));

  const columns = [
    { 
      header: 'Formulation Product', 
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <img 
            src={p.image || `${import.meta.env.BASE_URL}products/logo/logo.webp`}
            alt={p.name} 
            className="admin-product-thumb shrink-0"
          />
          <div>
            <span className="font-semibold text-[#000000] block text-xs">{p.name}</span>
            <span className="text-[0.7rem] text-[#71717a] font-mono">ID: {p.id}</span>
          </div>
        </div>
      )
    },
    { header: 'Category', render: (p: Product) => <span className="text-xs text-[#71717a]">{p.category}</span> },
    { header: 'Pack Size', render: (p: Product) => <span className="font-mono text-xs text-[#000000]">{p.packSize || '100g Jar'}</span> },
    { header: 'MRP Price', render: (p: Product) => <span className="font-mono font-semibold text-[#000000]">{p.mrp ? `₹${p.mrp.toLocaleString('en-IN')}` : '₹249'}</span> },
    { header: 'Status', render: (p: Product) => <AdminStatusBadge status={p.isActive ? 'active' : 'archived'} /> },
    { 
      header: 'Actions', 
      render: (p: Product) => (
        <div className="flex items-center justify-end gap-1.5">
          <button 
            type="button" 
            onClick={() => navigate(`/admin/products/${p.id}`)}
            disabled={isMutating}
            className="admin-btn-outline !min-h-[44px] !min-w-[44px] !p-0 flex items-center justify-center text-[0.7rem]"
            title="Edit product formulation"
          >
            <Eye size={16} />
          </button>
          <button 
            type="button" 
            onClick={(e) => handleActionClick('duplicate', p.id, e)}
            disabled={isMutating}
            className="admin-btn-icon !min-h-[44px] !min-w-[44px] !p-0 flex items-center justify-center"
            title="Duplicate product"
          >
            <Copy size={16} />
          </button>
          {p.isActive && (
            <button 
              type="button" 
              onClick={(e) => handleActionClick('archive', p.id, e)}
              disabled={isMutating}
              className="admin-btn-icon !min-h-[44px] !min-w-[44px] !p-0 flex items-center justify-center !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2]"
              title="Archive product"
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Workspace Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Catalog Workspace</span>
            </div>
            <p className="text-xs text-[#71717a] margin-0">Manage licensed Ayurvedic formulations, packshots, and prices</p>
          </div>

          <Link to="/admin/products/new" className="admin-btn-primary self-start sm:self-auto">
            <Plus size={15} weight="bold" />
            <span>Add Formulation</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search product title or categories..."
            selectedFilter={categoryFilter}
            onFilterChange={setCategoryFilter}
            filterOptions={filterOptions}
            filterLabel="Category"
          />
        </AdminCard>

        {/* Workspace Listings */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : error ? (
          <AdminCard className="p-8 text-center border-[#dc2626] bg-[#fef2f2]">
            <span className="text-sm font-semibold text-[#dc2626] block">Failed to load product catalog</span>
            <p className="text-xs text-[#71717a] mt-1">{error}</p>
            <button 
              type="button" 
              onClick={fetchProducts} 
              className="admin-btn-secondary mt-4 text-xs"
            >
              Retry Sync
            </button>
          </AdminCard>
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Products Found"
            description="No formulations match your search parameters. You can create a new formulation."
            actionLabel="Add Formulation"
            onActionClick={() => navigate('/admin/products/new')}
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedProducts}
                  keyExtractor={(p) => p.id}
                  onRowClick={(p) => navigate(`/admin/products/${p.id}`)}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden space-y-3">
              {paginatedProducts.map((p) => (
                <AdminMobileRecord
                  key={p.id}
                  title={p.name}
                  subtitle={p.category}
                  meta={`MRP: ${p.mrp ? `₹${p.mrp}` : '₹249'} · ${p.packSize || '100g Jar'}`}
                  badge={<AdminStatusBadge status={p.isActive ? 'active' : 'archived'} />}
                  actionUrl={`/admin/products/${p.id}`}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Confirmation Guard Dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={pendingAction?.type === 'duplicate' ? 'Duplicate Formulation?' : 'Archive Formulation?'}
        message={
          pendingAction?.type === 'duplicate'
            ? 'Are you sure you want to duplicate this formulation in the production database?'
            : 'Are you sure you want to archive this formulation? This will deactivate it on the storefront without deleting historical order data.'
        }
        confirmLabel={pendingAction?.type === 'duplicate' ? 'Duplicate Product' : 'Archive Product'}
        cancelLabel="Cancel"
        isDestructive={pendingAction?.type === 'archive'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setIsConfirmOpen(false);
          setPendingAction(null);
        }}
      />
    </AdminLayout>
  );
}
