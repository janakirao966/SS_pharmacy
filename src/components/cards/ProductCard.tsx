import { useState, memo } from 'react';
import type { Product } from '../../data/products';
import CleanCard from './CleanCard';
import Button from '../ui/Button';
import { ShoppingBag, CheckCircle2 } from 'lucide-react';
import { renderAyurvedicText } from '../../utils/lang';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onClick: (id: string) => void;
  onEnquire?: () => void;
}

// Helper to extract clean key active herb names from composition
function getCleanIngredients(composition: string): string[] {
  if (!composition) return [];
  const items = composition
    .split(/[,/]/)
    .map((item) =>
      item
        .replace(/\(.*\)/g, '')
        .replace(/per \d+.*/gi, '')
        .replace(/as shown on label.*/gi, '')
        .replace(/Shuddha/gi, '')
        .trim()
    )
    .filter((item) => item.length > 1 && item.length < 28);
  return Array.from(new Set(items)).slice(0, 4);
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
    <CleanCard
      as="article"
      variant="elevated"
      interactive
      onClick={() => onClick(product.id)}
      className="product-card-modern product-catalog-card group"
    >
      {/* Top Media Showcase Container (Fixed 210px height for equal baseline alignment across grid) */}
      <div className="product-image-wrapper relative flex items-center justify-center h-[210px] w-full p-4 bg-[#FAF7F2] rounded-t-xl overflow-hidden">
        {imageLoading && <div className="shimmer-effect" />}
        {imageError ? (
          <div className="product-image-fallback">
            <ShoppingBag className="product-fallback-icon" size={32} strokeWidth={1.5} />
            <span className="product-fallback-name">{renderAyurvedicText(product.name)}</span>
          </div>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="product-card-image max-h-[170px] w-auto object-contain transition-transform duration-500 group-hover:scale-105"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
      </div>

      {/* Main Content Info Block (Pixel-perfect 16px padding and flex alignment) */}
      <div className="product-info flex flex-col flex-1 p-4.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="product-category text-[10.5px] font-bold tracking-widest text-[#8A6B29] uppercase line-clamp-1">
            {renderAyurvedicText(product.category)}
          </span>
          {product.packSize && (
            <span className="bg-[#1D3A28] text-white px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide flex-shrink-0">
              {product.packSize}
            </span>
          )}
        </div>

        <h3 className="product-title font-display text-lg font-semibold text-[#1D3A28] leading-snug mb-2.5 min-h-[2.6rem] line-clamp-2">
          {renderAyurvedicText(product.name)}
        </h3>

        {/* Key Actives Herbal Chips */}
        {activeIngredients.length > 0 && (
          <div className="mb-2.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Key Actives & Herbs
            </span>
            <div className="flex flex-wrap gap-1">
              {activeIngredients.map((herb, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium bg-[#F4F7F4] text-[#2D5016] px-2 py-0.5 rounded-md border border-[#2D5016]/15"
                >
                  <span className="w-1 h-1 rounded-full bg-[#C5A059]" />
                  {herb}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Benefits Preview */}
        {product.benefits && product.benefits.length > 0 && (
          <ul className="space-y-1 mb-3">
            {product.benefits.slice(0, 2).map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                <CheckCircle2 size={12} className="text-[#C5A059] flex-shrink-0" />
                <span className="line-clamp-1">{benefit}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="product-card-divider my-2.5 border-t border-slate-100 mt-auto" />

        {/* Price & Guarantee Footer */}
        <div className="product-footer flex items-center justify-between mb-3">
          <div>
            <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider block">Best Price (MRP)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#1D3A28]">₹{product.mrp}</span>
              <span className="text-[10px] text-slate-400">Incl. taxes</span>
            </div>
          </div>

          <span className="text-[10.5px] font-semibold text-[#8A6B29] bg-[#FEFDF8] px-2 py-0.5 rounded border border-[#C5A059]/30">
            Govt. Licensed
          </span>
        </div>

        {/* Action Buttons */}
        <div className="product-actions grid grid-cols-2 gap-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            rounded="md"
            className="btn-add-cart flex items-center gap-1.5 justify-center text-xs font-medium border-[#1D3A28] text-[#1D3A28] hover:bg-[#1D3A28] hover:text-white transition-all py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart(product, 1);
            }}
          >
            <ShoppingBag size={13} strokeWidth={1.75} />
            <span>Add</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            rounded="md"
            className="btn-buy-now bg-[#1D3A28] hover:bg-[#2D5016] text-white text-xs font-medium shadow-sm transition-all py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              handleBuyNow(product);
            }}
          >
            Buy Now
          </Button>

          {onEnquire && (
            <Button
              variant="secondary"
              size="sm"
              rounded="md"
              className="btn-enquire col-span-2 mt-1 py-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onEnquire();
              }}
            >
              Enquire Wholesale
            </Button>
          )}
        </div>
      </div>
    </CleanCard>
  );
});

export default ProductCard;
