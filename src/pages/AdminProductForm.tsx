import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products as initialProducts, type Product } from '../data/products';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, PreviewModeBadge } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { CaretLeft, FloppyDisk } from '@phosphor-icons/react';

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const isEditMode = Boolean(id);
  const [isDirty, setIsDirty] = useState(false);
  
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
    shelfLife: '',
    safetyNote: '',
    image: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEditMode) return;

    // Load from sessionStorage catalog
    const saved = sessionStorage.getItem('ssp-mock-products');
    const list: Product[] = saved ? JSON.parse(saved) : initialProducts;
    const target = list.find((p) => p.id === id);

    if (target) {
      setFormData({
        id: target.id,
        name: target.name,
        category: target.category,
        composition: target.composition,
        benefits: target.benefits.join(', '),
        usage: target.usage,
        packSize: target.packSize || '',
        mrp: String(target.mrp || 0),
        shelfLife: target.shelfLife,
        safetyNote: target.safetyNote,
        image: target.image || ''
      });
    } else {
      showToast('Formulation not found in local preview list.', 'error');
      navigate('/admin/products');
    }
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
    if (!formData.mrp.trim() || isNaN(Number(formData.mrp))) tempErrors.mrp = 'MRP must be a valid number.';

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

  const handleConfirmSubmit = () => {
    setIsSubmitDialogOpen(false);
    
    // Save to sessionStorage list
    const saved = sessionStorage.getItem('ssp-mock-products');
    const list: Product[] = saved ? JSON.parse(saved) : initialProducts;

    const updatedProduct: Product = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      category: formData.category.trim(),
      composition: formData.composition.trim(),
      benefits: formData.benefits.split(',').map((b) => b.trim()).filter(Boolean),
      usage: formData.usage.trim(),
      packSize: formData.packSize.trim(),
      mrp: Number(formData.mrp),
      shelfLife: formData.shelfLife.trim(),
      safetyNote: formData.safetyNote.trim(),
      image: formData.image.trim() || undefined,
      transparentImage: formData.image.trim() || undefined
    };

    let updatedList: Product[];
    if (isEditMode) {
      updatedList = list.map((p) => (p.id === id ? updatedProduct : p));
      showToast(`Updated "${formData.name}" details in Preview Mode.`, 'success');
    } else {
      if (list.some((p) => p.id === updatedProduct.id)) {
        setErrors((prev) => ({ ...prev, id: 'Product Slug/ID already exists in catalog.' }));
        showToast('Slug conflict. Product Slug/ID must be unique.', 'error');
        return;
      }
      updatedList = [...list, updatedProduct];
      showToast(`Published "${formData.name}" to Preview catalog.`, 'success');
    }

    sessionStorage.setItem('ssp-mock-products', JSON.stringify(updatedList));
    setIsDirty(false);
    navigate('/admin/products');
  };

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <button 
            type="button" 
            onClick={handleCancelClick}
            className="admin-btn-icon"
            aria-label="Back to formulations list"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          
          <div className="flex items-center gap-2">
            <PreviewModeBadge />
          </div>
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
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Formulation Slug / ID *</label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  disabled={isEditMode}
                  className={`w-full p-2 border border-[#e4e4e7] rounded-lg text-xs font-mono focus:outline-none focus:border-[#000000] ${errors.id ? '!border-[#dc2626]' : ''}`}
                  placeholder="e.g. moon-light-cream"
                />
                {errors.id && <span className="text-[0.7rem] font-semibold text-[#dc2626] mt-0.5 block">{errors.id}</span>}
                <span className="text-[0.68rem] text-[#71717a] mt-0.5 block">Unique URL identifier. Cannot be edited after creation.</span>
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Formulation Title *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000] ${errors.name ? '!border-[#dc2626]' : ''}`}
                  placeholder="e.g. Moon Light Cream"
                />
                {errors.name && <span className="text-[0.7rem] font-semibold text-[#dc2626] mt-0.5 block">{errors.name}</span>}
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Ayurvedic Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000] ${errors.category ? '!border-[#dc2626]' : ''}`}
                  placeholder="e.g. Ayurvedic Skin Care Cream"
                />
                {errors.category && <span className="text-[0.7rem] font-semibold text-[#dc2626] mt-0.5 block">{errors.category}</span>}
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Pack Size (Volume / Count) *</label>
                <input
                  type="text"
                  name="packSize"
                  value={formData.packSize}
                  onChange={handleInputChange}
                  className={`w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000] ${errors.packSize ? '!border-[#dc2626]' : ''}`}
                  placeholder="e.g. 50 gms / 60 Pills"
                />
                {errors.packSize && <span className="text-[0.7rem] font-semibold text-[#dc2626] mt-0.5 block">{errors.packSize}</span>}
              </div>
            </div>
          </AdminCard>

          {/* Section 2: Pricing & Technical Specifications */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">2. Pricing & Technical Specifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Maximum Retail Price (INR MRP) *</label>
                <input
                  type="text"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleInputChange}
                  className={`w-full p-2 border border-[#e4e4e7] rounded-lg text-xs font-mono focus:outline-none focus:border-[#000000] ${errors.mrp ? '!border-[#dc2626]' : ''}`}
                  placeholder="e.g. 2999"
                />
                {errors.mrp && <span className="text-[0.7rem] font-semibold text-[#dc2626] mt-0.5 block">{errors.mrp}</span>}
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Shelf Life Duration</label>
                <input
                  type="text"
                  name="shelfLife"
                  value={formData.shelfLife}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000]"
                  placeholder="e.g. 36 Months from Mfg Date"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Product Media Image URL</label>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-[#e4e4e7] rounded-lg text-xs font-mono focus:outline-none focus:border-[#000000]"
                  placeholder="products/moonlight/hero.webp"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-[#000000] mb-1">Ayurvedic Composition Details</label>
              <textarea
                rows={3}
                name="composition"
                value={formData.composition}
                onChange={handleInputChange}
                className="w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000]"
                placeholder="e.g. Aloe Vera, Turmeric, Chandan, Kesar Extracts..."
              />
            </div>
          </AdminCard>

          {/* Section 3: Indications & Directions */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">3. Indications & Guidance</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Key Indications & Benefits (Comma-separated)</label>
                <input
                  type="text"
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000]"
                  placeholder="Moisturizes skin, Enhances glow, Soothes inflammation"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Directions for Use / Dosage</label>
                <textarea
                  rows={2}
                  name="usage"
                  value={formData.usage}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000]"
                  placeholder="Apply gently over affected skin areas twice daily."
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Safety & Storage Precaution Note</label>
                <input
                  type="text"
                  name="safetyNote"
                  value={formData.safetyNote}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000]"
                  placeholder="For external application only. Store in a cool, dry place."
                />
              </div>
            </div>
          </AdminCard>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelClick}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
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
            : `Confirm publishing formulation "${formData.name}" to local catalog?`
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
