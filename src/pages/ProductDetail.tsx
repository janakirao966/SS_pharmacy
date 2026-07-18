import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Award, FileText, ShoppingBag } from 'lucide-react';
import { products } from '../data/products';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CleanCard from '../components/cards/CleanCard';
import ProductCard from '../components/cards/ProductCard';
import SectionHeader from '../components/ui/SectionHeader';
import { renderAyurvedicText } from '../utils/lang';
import SEO from '../components/ui/SEO';
import { useCart } from '../context/CartContext';

interface ProductDetailProps {
  productId: string;
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const { handleAddToCart, handleBuyNow } = useCart();
  const navigate = useNavigate();
  const [activeAccordion, setActiveAccordion] = useState<'ingredients' | 'usage' | 'manufacturer' | null>('ingredients');

  // Find current product
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return (
      <Section className="pt-page-header pb-24">
        <Container>
          <div className="text-center">
            <h3>Formulation Not Found</h3>
            <p className="mt-4 text-secondary">The requested Ayurvedic medicine is not listed in our repository.</p>
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => navigate('/products')}
            >
              Back to Catalog
            </Button>
          </div>
        </Container>
      </Section>
    );
  }

  // Find other products for recommendations
  const relatedProducts = products.filter((p) => p.id !== productId).slice(0, 3);

  const handleBackToCatalog = () => {
    navigate('/products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRelatedProductClick = (id: string) => {
    navigate(`/products/${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="product-detail-page">
      <SEO
        title={`${product.name} Details - S.S. PHARMACY`}
        description={`Read chemical composition, indications for use, active ingredients, packaging sizes, and manufacturing quality details of S.S. PHARMACY's ${product.name}.`}
        canonical={`https://sspharmacy.com/products/${product.id}`}
        ogImage={`https://sspharmacy.com${product.image}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "image": `https://sspharmacy.com${product.image}`,
          "description": product.category,
          "brand": {
            "@type": "Brand",
            "name": "S.S. PHARMACY"
          },
          "manufacturer": {
            "@type": "Organization",
            "name": "S.S. PHARMACY",
            "logo": "https://sspharmacy.com/products/logo/logo.webp"
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "INR",
            "price": product.mrp,
            "availability": "https://schema.org/InStock",
            "url": `https://sspharmacy.com/products/${product.id}`
          }
        }}
      />
      
      {/* 1. Page Header & Back Navigation */}
      <Section className="pt-page-header pb-8">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Catalog', path: '/products' },
              { label: product.name }
            ]}
            className="mb-6"
          />
          <Button
            variant="ghost"
            onClick={handleBackToCatalog}
            className="group flex items-center space-x-2 -ml-3"
          >
            <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
            <span>Back to Catalog</span>
          </Button>
        </Container>
      </Section>

      {/* 2. Product Detail Core Layout */}
      <Section className="pb-16 pt-4">
        <Container>
          <div className="product-detail-grid">
            {/* Left Column: Visuals Container */}
            <div className="product-detail-visuals">
              <CleanCard variant="default" innerClassName="detail-image-box flex items-center justify-center p-8 bg-white">
                <img
                  src={product.transparentImage || product.image}
                  alt={product.name}
                  className="detail-primary-image max-h-[450px] object-contain hover:scale-105 transition-transform duration-500"
                  width={500}
                  height={500}
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                />
              </CleanCard>
            </div>

            {/* Right Column: Details Info */}
            <div className="product-detail-content text-left">
              <div className="w-fit">
                <Badge variant="tag">{renderAyurvedicText(product.category)}</Badge>
              </div>
              <h1 className="detail-title">{renderAyurvedicText(product.name)}</h1>
              
              <div className="detail-meta-price-box">
                <div className="price-tag">
                  <span className="label">Maximum Retail Price (MRP)</span>
                  <div className="price-value-container">
                    <span className="value">₹{product.mrp}/-</span>
                    <span className="subtext">(Inclusive of all taxes)</span>
                  </div>
                </div>
                <div className="pack-tag">
                  <span className="label">Pack Weight / Size</span>
                  <span className="value">{product.packSize}</span>
                </div>
              </div>

              {/* Product overview description */}
              <div className="detail-description-section">
                <p className="text-secondary leading-relaxed">
                  {renderAyurvedicText(product.name)} is developed under government-licensed Ayurvedic manufacturing standards. We utilize premium, authenticated herbs and active concentrates in clean processing settings to preserve the natural potency and purity of classic Ayurvedic medicine.
                </p>
              </div>

              {/* Redesigned Accordion Tabs */}
              <div className="detail-accordion">
                
                {/* Accordion Item 1: Ingredients & Benefits */}
                <div className="accordion-item">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'ingredients' ? null : 'ingredients')}
                    className="accordion-header"
                    aria-expanded={activeAccordion === 'ingredients'}
                  >
                    <span>1. Composition & Key Ingredients</span>
                    <span className="accordion-header-icon" />
                  </button>
                  <div className={`accordion-panel ${activeAccordion === 'ingredients' ? 'expanded' : ''}`}>
                    <div className="accordion-inner">
                      <div className="pb-6">
                        <div className="ingredients-header-row">
                          <FileText size={18} className="text-[#C4A35A]" />
                          <h4 className="font-semibold text-brand-primary">Ayurvedic Composition</h4>
                        </div>
                        <CleanCard variant="default" className="mb-6" innerClassName="ingredients-composition-box">
                          <p className="composition-text">{renderAyurvedicText(product.composition)}</p>
                        </CleanCard>
                        <h4 className="font-semibold text-brand-primary mb-3">Key Benefits & Indications</h4>
                        <ul className="detail-benefits-list">
                          {product.benefits.map((benefit, i) => (
                            <li key={i}>
                              <Award size={16} className="benefit-icon mt-0.5 flex-shrink-0" />
                              <span>{renderAyurvedicText(benefit)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion Item 2: Directions & Safety */}
                <div className="accordion-item">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'usage' ? null : 'usage')}
                    className="accordion-header"
                    aria-expanded={activeAccordion === 'usage'}
                  >
                    <span>2. Directions for Use & Safety Information</span>
                    <span className="accordion-header-icon" />
                  </button>
                  <div className={`accordion-panel ${activeAccordion === 'usage' ? 'expanded' : ''}`}>
                    <div className="accordion-inner">
                      <div className="pb-6 text-left">
                        <div className="usage-warning-header">
                          <ShieldAlert size={18} className="text-[#B91C1C]" />
                          <h4 className="font-semibold text-[#B91C1C]">Usage Instructions</h4>
                        </div>
                        <p className="text-secondary text-sm leading-relaxed mb-4">
                          {renderAyurvedicText(product.usage)}
                        </p>
                        <div className="bg-[#B91C1C]/5 border border-[#B91C1C]/20 p-4 rounded-xl">
                          <p className="text-[#B91C1C] text-xs font-semibold leading-relaxed m-0">
                            Regulatory Warning: Consult your Ayurvedic physician or general medical practitioner if symptoms persist. Avoid contact with eyes or open wounds. Keep out of reach of children.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion Item 3: Manufacturing Details */}
                <div className="accordion-item">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'manufacturer' ? null : 'manufacturer')}
                    className="accordion-header"
                    aria-expanded={activeAccordion === 'manufacturer'}
                  >
                    <span>3. Manufacturer & License Compliance</span>
                    <span className="accordion-header-icon" />
                  </button>
                  <div className={`accordion-panel ${activeAccordion === 'manufacturer' ? 'expanded' : ''}`}>
                    <div className="accordion-inner">
                      <div className="pb-6 text-left">
                        <table className="compliance-table-inline">
                          <tbody>
                            <tr className="border-b border-hairline">
                              <td className="py-2.5 font-semibold text-brand-primary w-1/3">Manufacturer</td>
                              <td className="py-2.5 text-secondary">S.S. PHARMACY licensed facility</td>
                            </tr>
                            <tr className="border-b border-hairline">
                              <td className="py-2.5 font-semibold text-brand-primary">License Code</td>
                              <td className="py-2.5 font-mono text-secondary">R-1970/Ayur (AP Department)</td>
                            </tr>
                            <tr className="border-b border-hairline">
                              <td className="py-2.5 font-semibold text-brand-primary">Audited Standard</td>
                              <td className="py-2.5 text-secondary">Ayurvedic GMP Certified Unit</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 font-semibold text-brand-primary">Factory Location</td>
                              <td className="py-2.5 text-secondary">Yerraguntla, Kadapa District, AP</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons Row */}
              <div className="detail-actions-row">
                <Button
                  variant="outline"
                  size="lg"
                  rounded="full"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => handleAddToCart(product, 1)}
                >
                  <ShoppingBag size={18} />
                  <span>Add to Cart</span>
                </Button>
                
                <Button
                  variant="primary"
                  size="lg"
                  rounded="full"
                  className="flex-1 btn-buy-now-premium"
                  onClick={() => handleBuyNow(product)}
                >
                  Buy Now
                </Button>
              </div>

            </div>
          </div>
        </Container>
      </Section>

      {/* 3. Recommended Products Section */}
      <Section className="border-t border-hairline pt-16 pb-24 bg-[#F8F7F4]">
        <Container>
          <SectionHeader
            eyebrow="Recommendations"
            title="Other Ayurvedic Formulations"
            subtitle="Explore our other licensed Ayurvedic remedies prepared under standard quality controls."
          />
          
          <div className="related-products-grid mt-12">
            <Grid cols={3} gap="lg">
              {relatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={handleRelatedProductClick}
                />
              ))}
            </Grid>
          </div>
        </Container>
      </Section>
    </div>
  );
}
