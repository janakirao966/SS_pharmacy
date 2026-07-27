import { useState, memo } from 'react';
import type { Product } from '../../data/products';
import { ShoppingBag, CheckCircle2, ShieldCheck, ArrowRight, Star } from 'lucide-react';
import { renderAyurvedicText } from '../../utils/lang';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onClick: (id: string) => void;
  onEnquire?: () => void;
}

// Clean helper to extract herbal names with guaranteed spacing
function getCleanIngredients(composition: string): string[] {
  if (!composition) return [];
  const rawParts = composition
    .split(/[,/]/)
    .map((item) =>
      item
        .replace(/\(.*\)/g, '')
        .replace(/per \d+.*/gi, '')
        .replace(/as shown on label.*/gi, '')
        .replace(/Shuddha/gi, '')
        .replace(/Purified/gi, '')
        .replace(/Swarasa/gi, '')
        .replace(/Churna/gi, '')
        .replace(/Puvvu/gi, '')
        .trim()
    )
    .filter((item) => item.length > 1 && item.length < 24);

  return Array.from(new Set(rawParts)).slice(0, 3);
}

const ProductCard = memo(function ProductCard({
  product,
  onClick,
  onEnquire
}: ProductCardProps) {
  const { handleAddToCart, handleBuyNow } = useCart();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const activeIngredients = getCleanIngredients(product.composition);

  return (
    <article
      onClick={() => onClick(product.id)}
      className="product-card-luxury group cursor-pointer"
    >
      {/* 1. Image Media Container */}
      <div className="product-card-media">
        {/* Top Badges */}
        <div className="product-badge-strip">
          <span className="product-mfg-badge">
            <ShieldCheck size={12} className="text-[#C5A059]" />
            <span>Govt. Licensed</span>
          </span>
          <span className="product-rating-badge">
            <Star size={11} className="fill-[#C5A059] text-[#C5A059]" />
            <span>4.9</span>
          </span>
        </div>

        {imageLoading && <div className="shimmer-effect" />}
        {imageError ? (
          <div className="product-image-fallback">
            <ShoppingBag size={32} className="text-[#1D3A28]" />
            <span>{renderAyurvedicText(product.name)}</span>
          </div>
        ) : (
          <img
            src={product.transparentImage || product.image}
            alt={product.name}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="product-card-img"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
      </div>

      {/* 2. Content Info Body */}
      <div className="product-card-body">
        {/* Category & Pack Size */}
        <div className="product-header-row">
          <span className="product-category-text">
            {renderAyurvedicText(product.category)}
          </span>
          {product.packSize && (
            <span className="product-pack-pill">
              {product.packSize}
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 className="product-title-text">
          {renderAyurvedicText(product.name)}
        </h3>

        {/* Key Active Herbs */}
        {activeIngredients.length > 0 && (
          <div className="product-herbs-block">
            <span className="product-herbs-label">Key Actives &amp; Herbs</span>
            <div className="product-herbs-chips flex flex-wrap gap-1.5">
              {activeIngredients.map((herb, idx) => (
                <span key={idx} className="product-herb-chip">
                  <span className="herb-dot" />
                  {herb}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key Benefits Bullet List */}
        {product.benefits && product.benefits.length > 0 && (
          <ul className="product-benefits-list">
            {product.benefits.slice(0, 2).map((benefit, idx) => (
              <li key={idx} className="product-benefit-item">
                <CheckCircle2 size={13} className="text-[#C5A059] shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Price Row (Clean vertical center alignment for price & tax badge) */}
        <div className="product-price-row">
          <div>
            <span className="product-price-label">Best Price (MRP)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="product-price-val">₹{product.mrp}</span>
              <span className="product-tax-badge">Incl. all taxes</span>
            </div>
          </div>
          <span className="text-[#2D5016] text-[11px] font-bold">In Stock</span>
        </div>

        {/* Action Buttons: Add to Cart & Buy Now */}
        <div className="product-cta-actions">
          <button
            type="button"
            className="btn-card-add-cart"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart(product, 1);
            }}
          >
            <ShoppingBag size={15} />
            <span>Add</span>
          </button>

          <button
            type="button"
            className="btn-card-buy-now"
            onClick={(e) => {
              e.stopPropagation();
              handleBuyNow(product);
            }}
          >
            <span>Buy Now</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {onEnquire && (
          <button
            type="button"
            className="btn-card-enquire mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onEnquire();
            }}
          >
            Enquire B2B Wholesale
          </button>
        )}
      </div>
    </article>
  );
});

export default ProductCard;
