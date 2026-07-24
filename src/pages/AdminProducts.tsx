import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { products as initialProducts, type Product } from '../data/products';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminMobileRecord, 
  AdminFilterBar, 
  AdminPagination, 
  PreviewModeBadge,
  AdminEmptyState 
} from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { Plus, Eye, Copy, Trash } from '@phosphor-icons/react';

export default function AdminProducts() {
  const { showToast } = useToast();
  const [productList, setProductList] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'archive' | 'duplicate'; productId: string } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    // Load products from sessionStorage if edited in session, or fall back to static list
    const saved = sessionStorage.getItem('ssp-mock-products');
    if (saved) {
      setProductList(JSON.parse(saved));
    } else {
      setProductList(initialProducts);
      sessionStorage.setItem('ssp-mock-products', JSON.stringify(initialProducts));
    }
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

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    setIsConfirmOpen(false);

    const { type, productId } = pendingAction;
    const target = productList.find(p => p.id === productId);
    if (!target) return;

    if (type === 'duplicate') {
      const copy: Product = {
        ...target,
        id: `${target.id}-copy-${Math.floor(100 + Math.random() * 900)}`,
        name: `${target.name} (Copy)`
      };
      const updated = [...productList, copy];
      setProductList(updated);
      sessionStorage.setItem('ssp-mock-products', JSON.stringify(updated));
      showToast(`Duplicated "${target.name}" in Preview Mode.`, 'success');
    } else if (type === 'archive') {
      // Filter out of current list for demonstration
      const updated = productList.filter(p => p.id !== productId);
      setProductList(updated);
      sessionStorage.setItem('ssp-mock-products', JSON.stringify(updated));
      showToast(`Archived "${target.name}" in Preview Mode.`, 'success');
    }

    setPendingAction(null);
  };

  const filterOptions = categories.map(cat => ({
    label: cat === 'all' ? 'All Categories' : cat,
    value: cat
  }));

  const columns = [
    { 
      header: 'Product Name', 
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <img 
            src={p.image || `${import.meta.env.BASE_URL}products/logo/logo.webp`}
            alt={p.name} 
            className="w-10 h-10 object-contain bg-[#FEFDF8] border border-[#E8E2D5] rounded-lg p-1"
          />
          <div>
            <span className="font-bold text-[#1D3A28] block">{p.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
          </div>
        </div>
      )
    },
    { header: 'Category', render: (p: Product) => <span className="text-xs text-slate-600">{p.category}</span> },
    { header: 'Pack Size', render: (p: Product) => <span className="font-mono text-xs">{p.packSize}</span> },
    { header: 'MRP Price', render: (p: Product) => <span className="font-mono font-bold">₹{p.mrp}</span> },
    { header: 'Status', render: () => <AdminStatusBadge status="active" /> },
    { 
      header: 'Actions', 
      render: (p: Product) => (
        <div className="flex items-center justify-end gap-1">
          <button 
            type="button" 
            onClick={() => window.location.href = `/admin/products/${p.id}`}
            className="admin-btn-action"
            title="Edit product info"
          >
            <Eye size={12} />
            <span>Edit</span>
          </button>
          <button 
            type="button" 
            onClick={(e) => handleActionClick('duplicate', p.id, e)}
            className="admin-btn-action"
            title="Duplicate product details"
          >
            <Copy size={12} />
          </button>
          <button 
            type="button" 
            onClick={(e) => handleActionClick('archive', p.id, e)}
            className="admin-btn-action danger"
            title="Archive product"
          >
            <Trash size={12} />
          </button>
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">Catalog Inventory</h2>
              <PreviewModeBadge />
            </div>
            <h1 className="text-xl font-bold font-display text-[#1D3A28] mt-0.5">Ayurvedic Formulations & Packshots</h1>
          </div>

          <Link to="/admin/products/new" className="admin-btn-primary">
            <Plus size={16} weight="bold" />
            <span>Add Formulation</span>
          </Link>
        </div>

        {/* Filter controls */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search product name or categories..."
            selectedFilter={categoryFilter}
            onFilterChange={setCategoryFilter}
            filterOptions={filterOptions}
            filterLabel="Category"
          />
        </AdminCard>

        {/* Listings Workspace */}
        {totalRecords === 0 ? (
          <AdminEmptyState
            title="No Products Found"
            description="No formulations match your search parameters. You can add a new one in Preview Mode."
            actionLabel="Add Formulation"
            onActionClick={() => window.location.href = '/admin/products/new'}
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedProducts}
                  keyExtractor={(p) => p.id}
                  onRowClick={(p) => window.location.href = `/admin/products/${p.id}`}
                />
              </AdminCard>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedProducts.map((p) => (
                <AdminMobileRecord
                  key={p.id}
                  title={p.name}
                  subtitle={p.category}
                  meta={`MRP: ₹${p.mrp} · ${p.packSize}`}
                  badge={<AdminStatusBadge status="active" />}
                  actionUrl={`/admin/products/${p.id}`}
                />
              ))}
            </div>

            {/* Pagination */}
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

      {/* Confirmation guard */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={pendingAction?.type === 'duplicate' ? 'Duplicate Formulation?' : 'Archive Formulation?'}
        message={
          pendingAction?.type === 'duplicate'
            ? 'Are you sure you want to duplicate this product schema details? A copy will be added to your preview catalog.'
            : 'Are you sure you want to archive this product? It will be removed from your preview catalog listing.'
        }
        confirmLabel={pendingAction?.type === 'duplicate' ? 'Duplicate' : 'Archive'}
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
