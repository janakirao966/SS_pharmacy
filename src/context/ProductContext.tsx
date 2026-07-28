import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { products as staticProducts, type Product } from '../data/products';

interface ProductContextType {
  products: Product[];
  getProductById: (id: string) => Product | undefined;
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('id, mrp, selling_price, pack_size, is_active');
      
      if (dbErr) throw dbErr;
      if (!data || data.length === 0) {
        throw new Error('No products returned from database');
      }

      // Validate required core products exist in database response
      const requiredIds = ['dr-lion-pain-cream', 'dr-lion-pain-pills', 'moon-light-cream'];
      for (const reqId of requiredIds) {
        if (!data.some(p => p.id === reqId)) {
          throw new Error(`Required product ${reqId} is missing in database`);
        }
      }

      const mapped: Product[] = [];
      for (const dbP of data) {
        const staticP = staticProducts.find(p => p.id === dbP.id);
        if (staticP) {
          const mrpVal = Number(dbP.mrp);
          const sellingPriceVal = Number(dbP.selling_price);

          if (dbP.mrp === null || isNaN(mrpVal) || mrpVal <= 0) {
            throw new Error(`Invalid MRP for product ${dbP.id}: ${dbP.mrp}`);
          }
          if (dbP.selling_price === null || isNaN(sellingPriceVal) || sellingPriceVal <= 0) {
            throw new Error(`Invalid selling price for product ${dbP.id}: ${dbP.selling_price}`);
          }
          if (sellingPriceVal > mrpVal) {
            throw new Error(`Selling price cannot exceed MRP for product ${dbP.id}`);
          }
          if (!dbP.pack_size || typeof dbP.pack_size !== 'string' || dbP.pack_size.trim() === '') {
            throw new Error(`Invalid pack size for product ${dbP.id}: ${dbP.pack_size}`);
          }

          mapped.push({
            ...staticP,
            mrp: mrpVal,
            sellingPrice: sellingPriceVal,
            packSize: dbP.pack_size,
            isActive: dbP.is_active ?? true
          });
        }
      }

      setProducts(mapped);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load authoritative products:', err);
      setError(err.message || 'Failed to load product catalog');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getProductById = (id: string) => {
    return products.find(p => p.id === id);
  };

  return (
    <ProductContext.Provider value={{ products, getProductById, loading, error, refreshProducts: fetchProducts }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
