import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
      header: 'Formulation Product', 
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <img 
            src={p.image || `${import.meta.env.BASE_URL}products/logo/logo.webp`}
            alt={p.name} 
            className="w-9 h-9 object-contain bg-[#ffffff] border border-[#e4e4e7] rounded-md p-1 shrink-0"
          />
          <div>
            <span className="font-semibold text-[#000000] block text-xs">{p.name}</span>
            <span className="text-[0.7rem] text-[#71717a] font-mono">ID: {p.id}</span>
          </div>
        </div>
      )
    },
    { header: 'Category', render: (p: Product) => <span className="text-xs text-[#71717a]">{p.category}</span> },
    { header: 'Pack Size', render: (p: Product) => <span className="font-mono text-xs text-[#000000]">{p.packSize}</span> },
    { header: 'MRP Price', render: (p: Product) => <span className="font-mono font-semibold text-[#000000]">₹{p.mrp?.toLocaleString('en-IN')}</span> },
    { header: 'Status', render: () => <AdminStatusBadge status="active" /> },
    { 
      header: 'Actions', 
      render: (p: Product) => (
        <div className="flex items-center justify-end gap-1.5">
          <button 
            type="button" 
            onClick={() => navigate(`/admin/products/${p.id}`)}
            className="admin-btn-outline !min-h-[30px] !py-1 !px-2 text-[0.7rem]"
            title="Edit product formulation"
          >
            <Eye size={13} />
            <span>Edit</span>
          </button>
          <button 
            type="button" 
            onClick={(e) => handleActionClick('duplicate', p.id, e)}
            className="admin-btn-icon"
            title="Duplicate product"
          >
            <Copy size={13} />
          </button>
          <button 
            type="button" 
            onClick={(e) => handleActionClick('archive', p.id, e)}
            className="admin-btn-icon !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2]"
            title="Archive product"
          >
            <Trash size={13} />
          </button>
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
              <PreviewModeBadge />
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
        {totalRecords === 0 ? (
          <AdminEmptyState
            title="No Products Found"
            description="No formulations match your search parameters. You can create a new formulation in Preview Mode."
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
                  meta={`MRP: ₹${p.mrp} · ${p.packSize}`}
                  badge={<AdminStatusBadge status="active" />}
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
            ? 'Are you sure you want to duplicate this formulation in local Preview Mode?'
            : 'Are you sure you want to archive this formulation? It will be removed from your active session catalog.'
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
