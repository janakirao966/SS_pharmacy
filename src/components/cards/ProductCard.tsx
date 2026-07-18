import { useState, memo } from 'react';
import type { Product } from '../../data/products';
import CleanCard from './CleanCard';
import Button from '../ui/Button';
import { Heart, ShoppingBag } from 'lucide-react';
import { renderAyurvedicText } from '../../utils/lang';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onClick: (id: string) => void;
  onEnquire?: () => void;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  isComparing?: boolean;
  onCompareToggle?: () => void;
}

const ProductCard = memo(function ProductCard({
  product,
  onClick,
  onEnquire,
  isWishlisted = false,
  onWishlistToggle,
  isComparing = false,
  onCompareToggle
}: ProductCardProps) {
  const { handleAddToCart, handleBuyNow } = useCart();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <CleanCard
      as="article"
      variant="elevated"
      interactive
      onClick={() => onClick(product.id)}
      className="product-card-modern product-catalog-card"
    >
      <div className="product-image-wrapper">
        {imageLoading && (
          <div className="shimmer-effect" />
        )}
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF8F5] text-center p-4">
            <ShoppingBag className="text-[#B0A796] mb-2" size={32} />
            <span className="text-[10px] text-secondary font-medium font-sans uppercase tracking-wider">{renderAyurvedicText(product.name)}</span>
          </div>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
        {onCompareToggle && (
          <button
            type="button"
            className={`absolute top-4 left-4 z-10 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
              isComparing
                ? 'bg-[#3D6B20] border-[#3D6B20] text-white shadow-md'
                : 'bg-white/90 border-[#EBE6DC] text-[#C4A35A] hover:text-[#3D6B20] shadow-sm'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onCompareToggle();
            }}
            aria-label={isComparing ? "Remove from comparison" : "Add to comparison"}
          >
            <span>{isComparing ? '✓ Comparing' : '+ Compare'}</span>
          </button>
        )}
        {onWishlistToggle && (
          <button
            type="button"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white border border-[#EBE6DC] shadow-sm text-[#C4A35A] hover:text-[#3D6B20] transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onWishlistToggle();
            }}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          >
            <Heart size={15} fill={isWishlisted ? '#C4A35A' : 'transparent'} />
          </button>
        )}
      </div>
      
      <div className="product-info">
        <span className="product-category">{renderAyurvedicText(product.category)}</span>
        <h3 className="product-title">{renderAyurvedicText(product.name)}</h3>
        <p className="product-description">{renderAyurvedicText(product.composition)}</p>
        
        <div className="product-footer">
          <div className="product-price">
            <span className="price-label">MRP</span>
            <span className="price-value">₹{product.mrp}</span>
          </div>
          <span className="product-size">{product.packSize}</span>
        </div>
        
        <div className="product-actions">
          <Button
            variant="outline"
            size="sm"
            rounded="md"
            className="flex items-center gap-1.5 justify-center"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart(product, 1);
            }}
          >
            <ShoppingBag size={14} />
            <span>Add</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            rounded="md"
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
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onEnquire();
              }}
            >
              Enquire
            </Button>
          )}
        </div>
      </div>
    </CleanCard>
  );
});

export default ProductCard;
