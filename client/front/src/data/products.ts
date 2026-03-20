export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string;
  images?: string[];
  rating: number;
  badge?: string;
  description?: string;
  inStock: boolean;
  stock: number;
  saleMode?: 'fixed' | 'auction' | 'hybrid';
}

export const PRODUCTS: Product[] = [];

export function isShopCatalogProduct(product: Product) {
  return String(product.saleMode || 'fixed').toLowerCase() === 'fixed';
}
