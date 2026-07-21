import { useState, memo } from 'react';
import type { Product } from '../../data/products';
import CleanCard from './CleanCard';
import Button from '../ui/Button';
import { ShoppingBag } from 'lucide-react';
import { renderAyurvedicText } from '../../utils/lang';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onClick: (id: string) => void;
  onEnquire?: () => void;
}

const ProductCard = memo(function ProductCard({
  product,
  onClick,
  onEnquire
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
          <div className="product-image-fallback">
            <ShoppingBag className="product-fallback-icon" size={32} />
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
            className="product-card-image"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
      </div>
      
      <div className="product-info">
        <span className="product-category">{renderAyurvedicText(product.category)}</span>
        <h3 className="product-title">{renderAyurvedicText(product.name)}</h3>
        <p className="product-description">{renderAyurvedicText(product.composition)}</p>
        
        <div className="product-card-divider" />

        <div className="product-footer">
          <div className="product-price">
            <span className="price-label">MRP</span>
            <span className="price-value">₹{product.mrp}</span>
          </div>
          {product.packSize && (
            <div className="product-pack-meta">
              <span className="pack-label">Pack</span>
              <span className="product-size">{product.packSize}</span>
            </div>
          )}
        </div>
        
        <div className="product-actions">
          <Button
            variant="outline"
            size="sm"
            rounded="md"
            className="btn-add-cart flex items-center gap-1.5 justify-center"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart(product, 1);
            }}
          >
            <ShoppingBag size={15} />
            <span>Add</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            rounded="md"
            className="btn-buy-now"
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
              className="btn-enquire"
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
