import { useState, useMemo } from 'react';
import { Heart } from 'lucide-react';
import { products, type Product } from '../data/products';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SectionHeader from '../components/ui/SectionHeader';
import ProductCard from '../components/cards/ProductCard';
import useWishlist from '../hooks/useWishlist';
import Modal from '../components/ui/Modal';
import { renderAyurvedicText } from '../utils/lang';
import SEO from '../components/ui/SEO';

// Reading this as: Informational product catalog for Ayurvedic proprietary medicines, with a clean organic layout, utilizing Search and Category filtering controls, and detailed product showcase cards.
// DESIGN_VARIANCE: 6
// MOTION_INTENSITY: 5
// VISUAL_DENSITY: 3

interface ProductsProps {
  setActiveTab: (tab: string) => void;
  setSelectedProductId: (id: string) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product) => void;
}

export default function Products({ setActiveTab, setSelectedProductId, onAddToCart, onBuyNow }: ProductsProps) {
  const [filter, setFilter] = useState('all');
  const { isFavorited, toggleWishlist } = useWishlist();
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const handleToggleCompare = (productId: string) => {
    setCompareList((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 3) {
        alert("You can compare up to 3 formulations at a time.");
        return prev;
      }
      return [...prev, productId];
    });
  };

  const categories = [
    { id: 'all', label: 'All Formulations' },
    { id: 'pain-relief', label: 'Pain Relief' },
    { id: 'skincare', label: 'Skincare' },
    { id: 'wishlist', label: 'Favorites' }
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (filter === 'all') return true;
      if (filter === 'wishlist') return isFavorited(product.id);
      if (filter === 'pain-relief') {
        return product.category.toLowerCase().includes('pain') || product.id.includes('pain');
      }
      if (filter === 'skincare') {
        return product.category.toLowerCase().includes('skin') || product.id.includes('skin');
      }
      return true;
    });
  }, [filter, isFavorited]);

  const handleProductDetail = (id: string) => {
    setSelectedProductId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnquire = () => {
    setActiveTab('distributor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="products-page">
      <SEO
        title="Ayurvedic Proprietary Remedies Catalog - S.S. PHARMACY"
        description="Explore and compare our range of licensed Ayurvedic proprietary formulations, including Dr. Lion Pain Cream, Dr. Lion Pain Pills, and Moon Light Cream."
        canonical="https://sspharmacy.com/products"
        schema={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "S.S. PHARMACY Ayurvedic Catalog",
          "numberOfItems": products.length,
          "itemListElement": products.map((prod, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `https://sspharmacy.com/products/${prod.id}`,
            "name": prod.name
          }))
        }}
      />
      {/* 1. Page Header & Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs items={[{ label: 'Catalog' }]} className="mb-6" />
          
          <div className="products-header-block">
            <SectionHeader
              eyebrow="Our Catalogue"
              title="Ayurvedic Proprietary Remedies"
              subtitle="Explore our range of licensed formulations manufactured with authentic ingredients to support natural healing and musculoskeletal wellness."
              align="left"
              isPageHeader
            />

            {/* Category Filter Pills */}
            <div className="catalog-controls-container mt-8">
              <div className="category-filters-row">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`filter-pill-btn ${filter === cat.id ? 'active' : ''}`}
                    onClick={() => setFilter(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 2. Products Grid */}
      <Section className="pb-24 pt-4">
        <Container>
          {filteredProducts.length === 0 ? (
            <div className="catalog-empty-card">
              <div className="w-16 h-16 rounded-full bg-[#F2ECE4] flex items-center justify-center text-[#8B6914] mb-6">
                <Heart size={28} />
              </div>
              <h4 className="font-display text-lg text-[#2D5016] font-semibold mb-2">No Favorites Added</h4>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                You haven't favorited any formulations yet. Click the heart icon on product cards to add them here.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                }}
                className="btn-pill btn-pill-primary text-xs py-2.5 px-6"
              >
                Reset Catalogue Filters
              </button>
            </div>
          ) : (
            <Grid cols={3} gap="lg" className="products-catalogue-grid-container">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={handleProductDetail}
                  onEnquire={handleEnquire}
                  isWishlisted={isFavorited(product.id)}
                  onWishlistToggle={() => toggleWishlist(product.id)}
                  isComparing={compareList.includes(product.id)}
                  onCompareToggle={() => handleToggleCompare(product.id)}
                  onAddToCart={onAddToCart}
                  onBuyNow={onBuyNow}
                />
              ))}
            </Grid>
          )}
        </Container>
      </Section>

      {/* 3. Floating Comparison Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[500px] bg-white border border-[#EBE6DC] shadow-lg rounded-full px-6 py-3 flex items-center justify-between animate-slideUp">
          <div className="flex items-center space-x-3">
            <span className="bg-[#2D5016] text-white text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {compareList.length}
            </span>
            <span className="text-xs font-semibold text-[#2D5016] font-sans">
              Formulation{compareList.length > 1 ? 's' : ''} Selected
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCompareList([])}
              className="text-xs font-medium text-[#8B6914] hover:underline bg-transparent border-0 cursor-pointer px-2"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className="px-4 py-2 bg-[#2D5016] text-white text-xs font-semibold rounded-full border border-[#2D5016] hover:bg-white hover:text-[#2D5016] transition-all cursor-pointer"
            >
              Compare Now
            </button>
          </div>
        </div>
      )}

      {/* 4. Comparison Table Modal */}
      <Modal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        title="Formulation Comparison"
        ariaLabel="Comparison details side by side"
      >
        <div className="overflow-x-auto p-2">
          <table className="comparison-table w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#F2ECE4]">
                <th className="p-3 text-[#8B6914] font-semibold w-1/4">Specification</th>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <th key={p.id} className="p-3 text-center w-1/4 font-semibold text-[#2D5016]">
                    <img src={p.image} alt={p.name} className="w-16 h-16 object-contain mx-auto mb-2" width={64} height={64} loading="lazy" decoding="async" />
                    <span className="text-xs block leading-tight">{renderAyurvedicText(p.name)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-hairline hover:bg-[#FDFCF7]">
                <td className="p-3 font-semibold text-[#8B6914] text-xs">Category</td>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <td key={p.id} className="p-3 text-center text-[#2D5016] text-xs">{renderAyurvedicText(p.category)}</td>
                ))}
              </tr>
              <tr className="border-b border-hairline hover:bg-[#FDFCF7]">
                <td className="p-3 font-semibold text-[#8B6914] text-xs">Composition</td>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <td key={p.id} className="p-3 text-xs text-[#8B6914] leading-relaxed">{renderAyurvedicText(p.composition)}</td>
                ))}
              </tr>
              <tr className="border-b border-hairline hover:bg-[#FDFCF7]">
                <td className="p-3 font-semibold text-[#8B6914] text-xs">Pack Size</td>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <td key={p.id} className="p-3 text-center text-[#2D5016] text-xs">{p.packSize}</td>
                ))}
              </tr>
              <tr className="border-b border-hairline hover:bg-[#FDFCF7]">
                <td className="p-3 font-semibold text-[#8B6914] text-xs">MRP</td>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <td key={p.id} className="p-3 text-center font-bold text-[#2D5016] text-xs">₹{p.mrp}</td>
                ))}
              </tr>
              <tr className="border-b border-hairline hover:bg-[#FDFCF7]">
                <td className="p-3 font-semibold text-[#8B6914] text-xs">Shelf Life</td>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <td key={p.id} className="p-3 text-center text-[#2D5016] text-xs">{p.shelfLife}</td>
                ))}
              </tr>
              <tr className="border-b border-hairline hover:bg-[#FDFCF7]">
                <td className="p-3 font-semibold text-[#8B6914] text-xs">Suggested Usage</td>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <td key={p.id} className="p-3 text-xs text-[#8B6914] leading-relaxed">{p.usage}</td>
                ))}
              </tr>
              <tr className="border-b border-hairline hover:bg-[#FDFCF7]">
                <td className="p-3 font-semibold text-[#8B6914] text-xs">Safety Notes</td>
                {products.filter(p => compareList.includes(p.id)).map(p => (
                  <td key={p.id} className="p-3 text-xs text-red-700 leading-relaxed">{p.safetyNote}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
