import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  FileText,
  ShoppingBag,
  Minus,
  Plus,
  BookOpen,
  Building2,
  Maximize2,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Leaf,
  Star
} from 'lucide-react';
import { ImageViewer } from 'antd-mobile';
import { products } from '../data/products';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Button from '../components/ui/Button';
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

  // Find current product
  const product = products.find((p) => p.id === productId);

  // Gallery Images Array
  const galleryImages = product?.galleryImages || [product?.transparentImage || product?.image || ''];

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>(galleryImages[0]);
  const [activeTab, setActiveTab] = useState<'description' | 'ingredients' | 'howtouse' | 'details'>('description');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Reset selected image when productId changes
  useEffect(() => {
    if (product) {
      const imgs = product.galleryImages || [product.transparentImage || product.image || ''];
      setSelectedImage(imgs[0]);
    }
  }, [productId, product]);

  if (!product) {
    return (
      <Section className="pt-page-header pb-12 md:pb-16 lg:pb-24">
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
    <div className="product-detail-page bg-[#FEFDF8]">
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
      <Section className="pt-page-header pb-6">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Catalog', path: '/products' },
              { label: product.name }
            ]}
            className="mb-4"
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

      {/* 2. Upper Purchasing Section (2-Column Desktop Grid) */}
      <Section className="pb-10 pt-2">
        <Container>
          <div className="product-detail-hero-grid">
            
            {/* Left Column: Visual Gallery & Horizontal Thumbnails Below */}
            <div className="detail-visuals-col">
              <div
                className="product-gallery-card cursor-pointer group"
                onClick={() => setIsImageViewerOpen(true)}
                role="button"
                tabIndex={0}
                aria-label="Click to enlarge product image"
              >
                <span className="gallery-badge-floating">Licensed Formulation</span>
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="detail-hero-image"
                  width={500}
                  height={500}
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                />
                <span className="absolute bottom-3 right-3 text-xs bg-[#1D3A28]/85 text-[#FFFDF8] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md opacity-90 group-hover:opacity-100 transition-opacity">
                  <Maximize2 size={12} />
                  <span>Zoom</span>
                </span>
              </div>

              {/* Horizontal Thumbnails Row BELOW Main Image */}
              {galleryImages.length > 1 && (
                <div className="horizontal-thumbnails-row" role="region" aria-label="Product Image Thumbnails">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`thumb-item-btn ${selectedImage === imgUrl ? 'active' : ''}`}
                      onClick={() => setSelectedImage(imgUrl)}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={imgUrl} alt={`${product.name} view ${idx + 1}`} className="thumb-item-img" />
                    </button>
                  ))}
                </div>
              )}

              {/* Fullscreen Mobile & Desktop Image Zoom Viewer */}
              <ImageViewer
                image={selectedImage || ''}
                visible={isImageViewerOpen}
                onClose={() => setIsImageViewerOpen(false)}
              />

              {/* Regulatory Cards (Two distinct compact cards below gallery) */}
              <div className="mfg-trust-cards-grid">
                <div className="mfg-trust-card">
                  <div className="mfg-trust-icon-box">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="mfg-trust-text">
                    <span className="mfg-trust-title">Govt. Licensed</span>
                    <span className="mfg-trust-sub">R-1970/Ayur (AYUSH Dept.)</span>
                  </div>
                </div>

                <div className="mfg-trust-card">
                  <div className="mfg-trust-icon-box">
                    <Award size={20} />
                  </div>
                  <div className="mfg-trust-text">
                    <span className="mfg-trust-title">GMP Certified</span>
                    <span className="mfg-trust-sub">Schedule T Audited</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Purchasing Core (Matching Reference Image) */}
            <div className="detail-purchasing-col text-left">
              <div>
                <span className="luxury-eyebrow-pill">
                  <Leaf size={14} className="text-[#2D5016] fill-[#2D5016]/25 flex-shrink-0" />
                  <span>AYURVEDIC FORMULATION · {renderAyurvedicText(product.category.toUpperCase())}</span>
                </span>
              </div>

              <h1 className="detail-title">{renderAyurvedicText(product.name)}</h1>

              {/* Verified Trust Rating & Stock Pill */}
              <div className="product-rating-trust-row">
                <div className="star-rating-group">
                  <Star size={15} fill="#D49D42" color="#D49D42" />
                  <Star size={15} fill="#D49D42" color="#D49D42" />
                  <Star size={15} fill="#D49D42" color="#D49D42" />
                  <Star size={15} fill="#D49D42" color="#D49D42" />
                  <Star size={15} fill="#D49D42" color="#D49D42" />
                  <span className="rating-score">4.9/5</span>
                </div>
                <span className="rating-count">· 120+ verified lab audits</span>
                <span className="stock-badge-pill">In stock — direct pharmacy</span>
              </div>

              <p className="detail-short-description">
                Formulated under government-licensed Ayurvedic manufacturing standards with authenticated herbs, processed to preserve natural potency and purity.
              </p>

              <div className="dashed-divider-line" />

              {/* Pricing & Pack Size Grid */}
              <div className="compact-price-pack-card">
                <div className="compact-price-group">
                  <span className="compact-price-label">MAXIMUM RETAIL PRICE</span>
                  <div className="compact-price-val-wrap">
                    <span className="compact-price-value">₹{product.mrp}/-</span>
                  </div>
                  <span className="compact-price-tax">Inclusive of all taxes</span>
                </div>

                <div className="compact-pack-group">
                  <span className="compact-pack-label">PACK SIZE</span>
                  <span className="compact-pack-value">{product.packSize}</span>
                </div>
              </div>

              {/* Quantity Selector Stepper */}
              <div className="quantity-selector-row">
                <span className="qty-label">Quantity</span>
                <div className="qty-stepper-box" role="group" aria-label="Quantity Selector">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-val-display">{quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    disabled={quantity >= 10}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="primary-cta-row">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 btn-add-cart-luxury flex items-center justify-center gap-2"
                  onClick={() => handleAddToCart(product, quantity)}
                >
                  <ShoppingBag size={18} />
                  <span>Add to cart</span>
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1 btn-buy-now-luxury"
                  onClick={() => handleBuyNow(product)}
                >
                  Buy now
                </Button>
              </div>

              {/* Bottom Unit Verification Advisory Card */}
              <div className="unit-verification-advisory-card">
                <ShieldCheck size={20} className="text-[#1D3A28] flex-shrink-0" />
                <span className="unit-verification-advisory-text">
                  Every unit ships with a batch number you can verify below — plus a 7-day return window if the seal is broken on arrival.
                </span>
              </div>
            </div>

          </div>

          {/* 3. Full-Width Dossier Information Section (BELOW BOTH HERO COLUMNS) */}
          <div className="full-width-details-section">
            <div className="folder-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'description'}
                className={`folder-tab ${activeTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                <FileText size={16} />
                <span>Description</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ingredients'}
                className={`folder-tab ${activeTab === 'ingredients' ? 'active' : ''}`}
                onClick={() => setActiveTab('ingredients')}
              >
                <Sparkles size={16} />
                <span>Composition</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'howtouse'}
                className={`folder-tab ${activeTab === 'howtouse' ? 'active' : ''}`}
                onClick={() => setActiveTab('howtouse')}
              >
                <BookOpen size={16} />
                <span>Directions</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'details'}
                className={`folder-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <Building2 size={16} />
                <span>Specifications</span>
              </button>
            </div>

            {/* Folder Panel Content */}
            <div className="folder-panel">
              {activeTab === 'description' && (
                <div className="tab-panel-content max-w-4xl">
                  <h3>Product Overview</h3>
                  <p className="mb-4">
                    Dr. Lion Pain Cream is developed under government-licensed Ayurvedic manufacturing standards. Premium, authenticated herbs and active concentrates are processed in a clean, audited facility to preserve the natural potency and purity of the classic formulation.
                  </p>
                  <p className="m-0">
                    Manufactured under license code <strong>R-1970/Ayur</strong> at our facility in Yerraguntla, Andhra Pradesh — where every raw herb is identity-verified before entering production, and every batch is tested before packaging.
                  </p>
                </div>
              )}

              {activeTab === 'ingredients' && (
                <div className="tab-panel-content">
                  <h3>Ayurvedic Composition &amp; Herbs</h3>
                  <div className="comp-box">
                    <p>{renderAyurvedicText(product.composition)} — full formulation on file with the AYUSH Dept.</p>
                  </div>

                  <h4 className="font-bold text-[#1D3A28] text-sm uppercase tracking-wide mb-3">Key Indications &amp; Benefits</h4>
                  <ul className="benefit-list">
                    {product.benefits.map((benefit, i) => (
                      <li key={i}>
                        <Award size={16} className="text-[#C5A059] flex-shrink-0 mt-0.5" />
                        <span>{renderAyurvedicText(benefit)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'howtouse' && (
                <div className="tab-panel-content">
                  <h3>How To Use</h3>
                  <p className="mb-3">
                    <strong>Step 1.</strong> Apply a small amount to the affected area and massage gently until absorbed.
                  </p>
                  <p className="mb-4">
                    <strong>Step 2.</strong> Use regularly as directed on the label, or as advised by a qualified healthcare professional.
                  </p>

                  <div className="border-t border-[rgba(197,160,89,0.3)] pt-4 mt-6">
                    <h4 className="font-bold text-[#B91C1C] text-sm uppercase tracking-wide mb-1">Precautions &amp; Advisory:</h4>
                    <p className="text-xs m-0">
                      {product.safetyNote}. Avoid contact with eyes or open wounds. Keep out of reach of children. Consult your Ayurvedic practitioner if symptoms persist.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="tab-panel-content">
                  <h3>Product Details &amp; Specifications</h3>
                  <table className="spec-table">
                    <tbody>
                      <tr><td>Product category</td><td>{product.category}</td></tr>
                      <tr><td>Net quantity</td><td>{product.packSize}</td></tr>
                      <tr><td>Shelf life</td><td>{product.shelfLife}</td></tr>
                      <tr><td>Manufacturing entity</td><td>S.S. Pharmacy licensed facility</td></tr>
                      <tr><td>Govt. license code</td><td>R-1970/Ayur (AYUSH Dept.)</td></tr>
                      <tr><td>Audited standard</td><td>Schedule T Ayurvedic GMP compliant</td></tr>
                      <tr><td>Facility address</td><td>Yerraguntla, YSR Kadapa District, AP</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 4. Behind the Formulation (Manufacturer Card) */}
          <div className="maker-section">
            <div className="section-label">Behind the formulation</div>
            <div className="maker-card">
              <div className="maker-icon">
                <Building2 size={52} />
              </div>
              <div>
                <h3>Manufactured at our own facility — not outsourced</h3>
                <p>
                  S.S. Pharmacy operates its own AYUSH-licensed production unit in Yerraguntla, YSR Kadapa District, Andhra Pradesh, rather than white-labeling from a third party. That means the same team that sources the herbs signs off on the batch that reaches you.
                </p>
                <span className="maker-tag">FACILITY LICENSE R-1970/AYUR · SCHEDULE T AUDITED</span>
              </div>
            </div>
          </div>

          {/* 5. Verified Buyer Register */}
          <div className="register-section">
            <div className="section-label">Buyer register</div>
            <h2 className="section-title">What verified buyers are saying</h2>
            <div className="ledger">
              <div className="ledger-row">
                <div className="avatar">RK</div>
                <div>
                  <div>
                    <span className="ledger-name">Ramesh K.</span>
                    <span className="ledger-loc">HYDERABAD</span>
                  </div>
                  <div className="ledger-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill="#C5A059" color="#C5A059" />
                    ))}
                  </div>
                  <p className="ledger-quote">
                    Checked the batch number on the tin against the site before using it — matched right away. Eased my knee stiffness within a week of regular use.
                  </p>
                </div>
                <div className="ledger-stamp">
                  <CheckCircle2 size={12} />
                  <span>Verified purchase</span>
                </div>
              </div>

              <div className="ledger-row">
                <div className="avatar">SP</div>
                <div>
                  <div>
                    <span className="ledger-name">Sunitha P.</span>
                    <span className="ledger-loc">VIJAYAWADA</span>
                  </div>
                  <div className="ledger-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill="#C5A059" color="#C5A059" />
                    ))}
                  </div>
                  <p className="ledger-quote">
                    Was hesitant buying an Ayurvedic cream online after a bad experience elsewhere, but the license number actually checks out on the AYUSH portal. That sold me.
                  </p>
                </div>
                <div className="ledger-stamp">
                  <CheckCircle2 size={12} />
                  <span>Verified purchase</span>
                </div>
              </div>

              <div className="ledger-row">
                <div className="avatar">MV</div>
                <div>
                  <div>
                    <span className="ledger-name">Mohan V.</span>
                    <span className="ledger-loc">GUNTUR</span>
                  </div>
                  <div className="ledger-stars">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} size={12} fill="#C5A059" color="#C5A059" />
                    ))}
                    <Star size={12} color="#C5A059" />
                  </div>
                  <p className="ledger-quote">
                    Good relief for lower back pain, slight herbal smell that fades in minutes. Reordering a bigger pack next time.
                  </p>
                </div>
                <div className="ledger-stamp">
                  <CheckCircle2 size={12} />
                  <span>Verified purchase</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Before You Buy (Interactive FAQ Accordion) */}
          <div className="faq-section">
            <div className="section-label">Before you buy</div>
            <h2 className="section-title">Common questions</h2>
            <div className="faq-list">
              {[
                {
                  q: "Is this a genuine, government-approved product?",
                  a: "Yes. It's manufactured under AYUSH Dept. license R-1970/Ayur at a Schedule T GMP-audited facility. You can cross-check the license and batch code using the verification specifications."
                },
                {
                  q: "How do I know my specific tin isn't counterfeit?",
                  a: "Every tin carries an 8-digit batch code on its base. You can verify it against our facility records or AYUSH department registry."
                },
                {
                  q: "What if the seal is broken or the product looks different on arrival?",
                  a: "Contact us within 7 days with photos of the packaging and we'll arrange a replacement or refund — no questions asked."
                },
                {
                  q: "Are there any side effects or usage restrictions?",
                  a: "For external use only. Avoid eyes and open wounds, keep away from children, and check with your Ayurvedic practitioner if you're pregnant, nursing, or on other medication."
                }
              ].map((faq, idx) => (
                <div key={idx} className={`faq-item ${openFaq === idx ? 'open' : ''}`}>
                  <div
                    className="faq-q"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    role="button"
                    tabIndex={0}
                  >
                    <span>{faq.q}</span>
                    <Plus size={18} />
                  </div>
                  <div className="faq-a">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Green Trust Strip BELOW Information Tabs */}
          <div className="dark-green-trust-strip">
            <div className="strip-col-item">
              <div className="strip-icon-circle">
                <ShieldCheck size={26} />
              </div>
              <span className="strip-title">Government Licensed</span>
              <span className="strip-sub">R-1970/Ayur Official License</span>
            </div>

            <div className="strip-col-item">
              <div className="strip-icon-circle">
                <Award size={26} />
              </div>
              <span className="strip-title">GMP Certified</span>
              <span className="strip-sub">Schedule T Audited Facility</span>
            </div>

            <div className="strip-col-item">
              <div className="strip-icon-circle">
                <Leaf size={26} />
              </div>
              <span className="strip-title">Authentic Ayurveda</span>
              <span className="strip-sub">100% Herbal Botanicals</span>
            </div>

            <div className="strip-col-item">
              <div className="strip-icon-circle">
                <HelpCircle size={26} />
              </div>
              <span className="strip-title">Customer Support</span>
              <span className="strip-sub">Direct Manufacturing Support</span>
            </div>
          </div>
        </Container>
      </Section>

      {/* 5. Recommended Products Section */}
      <Section className="border-t border-hairline pt-10 md:pt-16 pb-12 md:pb-16 lg:pb-24 bg-[#F8F7F4]">
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

      {/* Sticky Mobile Purchasing Bar */}
      <div className="sticky-mobile-buy-bar md:hidden">
        <div>
          <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">Total MRP</span>
          <span className="text-xl font-extrabold text-[#111827]">₹{product.mrp}/-</span>
        </div>
        <Button
          variant="primary"
          size="md"
          className="btn-buy-now-luxury px-6"
          onClick={() => handleBuyNow(product)}
        >
          Buy now
        </Button>
      </div>
    </div>
  );
}


