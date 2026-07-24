import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products as initialProducts, type Product } from '../data/products';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, PreviewModeBadge } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { CaretLeft, FloppyDisk, X } from '@phosphor-icons/react';

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
        packSize: target.packSize,
        mrp: String(target.mrp),
        shelfLife: target.shelfLife,
        safetyNote: target.safetyNote,
        image: target.image || ''
      });
    } else {
      showToast('Formulation not found in local preview list.', 'error');
      navigate('/admin/products');
    }
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
    if (!formData.name.trim()) tempErrors.name = 'Formulation Name is required.';
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
      // Check for duplicate slug
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
      <div className="space-y-6 animate-fadeIn">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <button 
            type="button" 
            onClick={handleCancelClick}
            className="admin-btn-back"
          >
            <CaretLeft size={16} weight="bold" />
            <span>Formulations List</span>
          </button>
          
          <div className="flex items-center gap-2">
            <PreviewModeBadge />
          </div>
        </div>

        {/* Form Container */}
        <AdminCard>
          <form onSubmit={handleSubmitAttempt} className="space-y-6">
            <h3 className="font-display font-bold text-lg text-[#1D3A28] border-b border-slate-100 pb-2">
              {isEditMode ? `Edit: ${formData.name}` : 'Scaffold New Formulation'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slug ID field */}
              <div className="admin-field-group">
                <label className="admin-field-label">Formulation Slug / ID *</label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  disabled={isEditMode}
                  className={`admin-input-field ${errors.id ? 'border-[#B91C1C]' : ''}`}
                  placeholder="e.g. moon-light-cream"
                />
                {errors.id && <span className="text-[10px] font-semibold text-[#B91C1C] mt-1">{errors.id}</span>}
                <p className="text-[10px] text-slate-400 mt-1">Unique URL identifier. Cannot be edited after creation.</p>
              </div>

              {/* Formulation Name field */}
              <div className="admin-field-group">
                <label className="admin-field-label">Formulation Title *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`admin-input-field ${errors.name ? 'border-[#B91C1C]' : ''}`}
                  placeholder="e.g. Moon Light Cream"
                />
                {errors.name && <span className="text-[10px] font-semibold text-[#B91C1C] mt-1">{errors.name}</span>}
              </div>

              {/* Category select or text */}
              <div className="admin-field-group">
                <label className="admin-field-label">Ayurvedic Category *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`admin-input-field ${errors.category ? 'border-[#B91C1C]' : ''}`}
                  placeholder="e.g. Ayurvedic Skin Care Cream"
                />
                {errors.category && <span className="text-[10px] font-semibold text-[#B91C1C] mt-1">{errors.category}</span>}
              </div>

              {/* Pack Size field */}
              <div className="admin-field-group">
                <label className="admin-field-label">Pack size (volume/count) *</label>
                <input
                  type="text"
                  name="packSize"
                  value={formData.packSize}
                  onChange={handleInputChange}
                  className={`admin-input-field ${errors.packSize ? 'border-[#B91C1C]' : ''}`}
                  placeholder="e.g. 50 gms / 60 Pills"
                />
                {errors.packSize && <span className="text-[10px] font-semibold text-[#B91C1C] mt-1">{errors.packSize}</span>}
              </div>

              {/* MRP Price field */}
              <div className="admin-field-group">
                <label className="admin-field-label">Maximum Retail Price (INR MRP) *</label>
                <input
                  type="text"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleInputChange}
                  className={`admin-input-field ${errors.mrp ? 'border-[#B91C1C]' : ''}`}
                  placeholder="e.g. 2999"
                />
                {errors.mrp && <span className="text-[10px] font-semibold text-[#B91C1C] mt-1">{errors.mrp}</span>}
              </div>

              {/* Shelf Life field */}
              <div className="admin-field-group">
                <label className="admin-field-label">Shelf Life Period</label>
                <input
                  type="text"
                  name="shelfLife"
                  value={formData.shelfLife}
                  onChange={handleInputChange}
                  className="admin-input-field"
                  placeholder="e.g. 3 Years"
                />
              </div>

              {/* Composition field */}
              <div className="admin-field-group md:col-span-2">
                <label className="admin-field-label">Herbal Formulation Composition</label>
                <textarea
                  name="composition"
                  value={formData.composition}
                  onChange={handleInputChange}
                  className="admin-input-field h-24 py-2"
                  placeholder="List active ingredients and quantities..."
                />
              </div>

              {/* Benefits list (comma separated) */}
              <div className="admin-field-group md:col-span-2">
                <label className="admin-field-label">Key Therapeutic Benefits (Comma-separated)</label>
                <textarea
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleInputChange}
                  className="admin-input-field h-20 py-2"
                  placeholder="Benefit 1, Benefit 2, Benefit 3..."
                />
              </div>

              {/* Usage / Directions field */}
              <div className="admin-field-group md:col-span-2">
                <label className="admin-field-label">Usage Instructions / Dosage</label>
                <textarea
                  name="usage"
                  value={formData.usage}
                  onChange={handleInputChange}
                  className="admin-input-field h-20 py-2"
                  placeholder="Directions for application or daily dosage guidelines..."
                />
              </div>

              {/* Safety Warning note */}
              <div className="admin-field-group md:col-span-2">
                <label className="admin-field-label">Safety Warnings & Indications</label>
                <input
                  type="text"
                  name="safetyNote"
                  value={formData.safetyNote}
                  onChange={handleInputChange}
                  className="admin-input-field"
                  placeholder="e.g. Ayurvedic cream for external use only"
                />
              </div>

              {/* Image URL path */}
              <div className="admin-field-group md:col-span-2">
                <label className="admin-field-label">Product Image Path Reference</label>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  className="admin-input-field font-mono"
                  placeholder="e.g. products/Dr lion pain cream/Pain cream front view.webp"
                />
              </div>
            </div>

            {/* Action Triggers */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelClick}
                className="admin-btn-secondary"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="admin-btn-primary"
              >
                <FloppyDisk size={14} />
                <span>Save Formulation</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      {/* Safety cancel warning */}
      <AdminConfirmDialog
        isOpen={isCancelDialogOpen}
        title="Discard Changes?"
        message="You have unsaved form modifications. If you leave this page, your edits will be permanently lost."
        confirmLabel="Discard & Leave"
        cancelLabel="Keep Editing"
        isDestructive={true}
        onConfirm={() => {
          setIsCancelDialogOpen(false);
          setIsDirty(false);
          navigate('/admin/products');
        }}
        onCancel={() => setIsCancelDialogOpen(false)}
      />

      {/* Submission confirm */}
      <AdminConfirmDialog
        isOpen={isSubmitDialogOpen}
        title={isEditMode ? 'Update formulation details?' : 'Publish formulation?'}
        message={
          isEditMode
            ? `Are you sure you want to write changes for "${formData.name}" to the preview catalog?`
            : `Are you sure you want to scaffold and publish the formulation "${formData.name}" to the preview catalog?`
        }
        confirmLabel="Save"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setIsSubmitDialogOpen(false)}
      />
    </AdminLayout>
  );
}
