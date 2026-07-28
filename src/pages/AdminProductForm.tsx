import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products as initialProducts } from '../data/products';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { supabase } from '../lib/supabase';
import { AdminCard, AdminInput, AdminTextarea } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { CaretLeft, FloppyDisk } from '@phosphor-icons/react';

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const isEditMode = Boolean(id);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [isMutating, setIsMutating] = useState(false);
  
  // Confirmation Dialog states
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    composition: '',
    benefits: '',
    usage: '',
    packSize: '',
    mrp: '',
    sellingPrice: '',
    isActive: true,
    shelfLife: '',
    safetyNote: '',
    image: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEditMode) return;

    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const { data, error: dbErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (dbErr) throw dbErr;

        if (data) {
          const staticP = initialProducts.find((p) => p.id === id);
          setFormData({
            id: data.id,
            name: data.name || '',
            category: data.category || '',
            composition: staticP?.composition || '',
            benefits: staticP?.benefits.join(', ') || '',
            usage: staticP?.usage || '',
            packSize: data.pack_size || '',
            mrp: String(data.mrp || 0),
            sellingPrice: String(data.selling_price || 0),
            isActive: data.is_active ?? true,
            shelfLife: staticP?.shelfLife || '',
            safetyNote: staticP?.safetyNote || '',
            image: staticP?.image || ''
          });
        }
      } catch (err: any) {
        console.error('Failed to load product details:', err);
        showToast('Failed to load product details from database.', 'error');
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.id.trim()) tempErrors.id = 'Product Slug/ID is required.';
    if (!formData.name.trim()) tempErrors.name = 'Formulation Title is required.';
    if (!formData.category.trim()) tempErrors.category = 'Category is required.';
    if (!formData.packSize.trim()) tempErrors.packSize = 'Pack size is required.';
    
    const mrpNum = Number(formData.mrp);
    const sellingPriceNum = Number(formData.sellingPrice);

    if (!formData.mrp.trim() || isNaN(mrpNum) || mrpNum <= 0) {
      tempErrors.mrp = 'MRP must be a positive number.';
    }
    if (!formData.sellingPrice.trim() || isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
      tempErrors.sellingPrice = 'Selling Price must be a positive number.';
    } else if (sellingPriceNum > mrpNum) {
      tempErrors.sellingPrice = 'Selling Price cannot exceed MRP.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setIsCancelDialogOpen(true);
    } else {
      navigate('/admin/products');
    }
  };

  const handleSubmitAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please correct form validation errors.', 'error');
      return;
    }
    setIsSubmitDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitDialogOpen(false);
    setIsMutating(true);
    
    const payload = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      category: formData.category.trim(),
      mrp: Number(formData.mrp),
      selling_price: Number(formData.sellingPrice),
      pack_size: formData.packSize.trim(),
      is_active: formData.isActive
    };

    try {
      if (isEditMode) {
        const { error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', id);

        if (updateErr) throw updateErr;
        showToast(`Successfully updated product "${formData.name}".`, 'success');
      } else {
        const { error: insertErr } = await supabase
          .from('products')
          .insert(payload);

        if (insertErr) throw insertErr;
        showToast(`Successfully published product "${formData.name}".`, 'success');
      }

      setIsDirty(false);
      navigate('/admin/products');
    } catch (err: any) {
      console.error('Failed to save product changes:', err);
      showToast(err.message || 'Failed to save product changes.', 'error');
    } finally {
      setIsMutating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          color: '#1A1A1A'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #F5F0E8',
            borderTop: '4px solid #2D5016',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#667068' }}>Loading product details...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <button 
            type="button" 
            onClick={handleCancelClick}
            className="admin-btn-icon !min-h-[44px] !min-w-[44px] !p-0 flex items-center justify-center"
            aria-label="Back to formulations list"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
        </div>

        {/* Structured Form Container */}
        <form onSubmit={handleSubmitAttempt} className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#000000]">
              {isEditMode ? `Edit Formulation: ${formData.name}` : 'Scaffold New Formulation'}
            </h2>
          </div>

          {/* Section 1: Basic Product Identifiers */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">1. Basic Product Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <AdminInput
                label="Formulation Slug / ID *"
                type="text"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                disabled={isEditMode}
                placeholder="e.g. moon-light-cream"
                error={errors.id}
              />
              <span className="text-[0.68rem] text-[#71717a] mt-0.5 block">Unique URL identifier. Cannot be edited after creation.</span>

              <AdminInput
                label="Formulation Title *"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Moon Light Cream"
                error={errors.name}
              />

              <AdminInput
                label="Ayurvedic Category *"
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g. Ayurvedic Skin Care Cream"
                error={errors.category}
              />

              <AdminInput
                label="Pack Size (Volume / Count) *"
                type="text"
                name="packSize"
                value={formData.packSize}
                onChange={handleInputChange}
                placeholder="e.g. 50 gms / 60 Pills"
                error={errors.packSize}
              />
            </div>
          </AdminCard>

          {/* Section 2: Pricing & Technical Specifications */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">2. Pricing & Technical Specifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <AdminInput
                label="Maximum Retail Price (INR MRP) *"
                type="text"
                name="mrp"
                value={formData.mrp}
                onChange={handleInputChange}
                className="font-mono"
                placeholder="e.g. 2999"
                error={errors.mrp}
              />

              <AdminInput
                label="Selling Price (INR) *"
                type="text"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                className="font-mono"
                placeholder="e.g. 2499"
                error={errors.sellingPrice}
              />

              <AdminInput
                label="Shelf Life Duration"
                type="text"
                name="shelfLife"
                value={formData.shelfLife}
                onChange={handleInputChange}
                placeholder="e.g. 36 Months from Mfg Date"
              />

              <AdminInput
                label="Product Media Image URL"
                type="text"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                className="font-mono"
                placeholder="products/moonlight/hero.webp"
              />
            </div>

            <div className="flex items-center gap-3 bg-[#f8fafc] border border-[#e2e8f0] p-3.5 rounded-lg">
              <input
                type="checkbox"
                id="is_active_toggle"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, isActive: e.target.checked }));
                  setIsDirty(true);
                }}
                className="h-4.5 w-4.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <label htmlFor="is_active_toggle" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                Storefront Active & Available (is_active)
                <span className="block font-medium text-slate-500 text-[0.68rem] mt-0.5">When disabled, this product will be hidden from customer purchase catalog.</span>
              </label>
            </div>

            <AdminTextarea
              label="Ayurvedic Composition Details"
              rows={3}
              name="composition"
              value={formData.composition}
              onChange={handleInputChange}
              placeholder="e.g. Aloe Vera, Turmeric, Chandan, Kesar Extracts..."
            />
          </AdminCard>

          {/* Section 3: Indications & Directions */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">3. Indications & Guidance</h3>
            </div>
            <div className="space-y-3 text-xs">
              <AdminInput
                label="Key Indications & Benefits (Comma-separated)"
                type="text"
                name="benefits"
                value={formData.benefits}
                onChange={handleInputChange}
                placeholder="Moisturizes skin, Enhances glow, Soothes inflammation"
              />

              <AdminTextarea
                label="Directions for Use / Dosage"
                rows={2}
                name="usage"
                value={formData.usage}
                onChange={handleInputChange}
                placeholder="Apply gently over affected skin areas twice daily."
              />

              <AdminInput
                label="Safety & Storage Precaution Note"
                type="text"
                name="safetyNote"
                value={formData.safetyNote}
                onChange={handleInputChange}
                placeholder="For external application only. Store in a cool, dry place."
              />
            </div>
          </AdminCard>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isMutating}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="admin-btn-primary"
            >
              <FloppyDisk size={15} weight="bold" />
              <span>{isEditMode ? 'Save Product Changes' : 'Publish Formulation'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cancel Unsaved Changes Dialog */}
      <AdminConfirmDialog
        isOpen={isCancelDialogOpen}
        title="Discard Unsaved Changes?"
        message="You have unsaved edits in this product form. Are you sure you want to discard your changes?"
        confirmLabel="Discard Edits"
        cancelLabel="Keep Editing"
        isDestructive={true}
        onConfirm={() => {
          setIsCancelDialogOpen(false);
          navigate('/admin/products');
        }}
        onCancel={() => setIsCancelDialogOpen(false)}
      />

      {/* Submit Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isSubmitDialogOpen}
        title={isEditMode ? 'Save Formulation Changes?' : 'Publish New Formulation?'}
        message={
          isEditMode
            ? `Confirm saving updated details for formulation "${formData.name}"?`
            : `Confirm publishing formulation "${formData.name}" to production catalog?`
        }
        confirmLabel={isEditMode ? 'Save Changes' : 'Publish Product'}
        cancelLabel="Review Form"
        isDestructive={false}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setIsSubmitDialogOpen(false)}
      />
    </AdminLayout>
  );
}
