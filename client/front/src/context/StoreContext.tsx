import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import type { Auction } from '../types/auction';
import type { Product } from '../data/products';

interface StoreContextValue {
  products: Product[];
  auctions: Auction[];
  loadingProducts: boolean;
  loadingAuctions: boolean;
  refreshProducts: () => Promise<void>;
  refreshAuctions: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingAuctions, setLoadingAuctions] = useState(true);

  const refreshProducts = async () => {
    setLoadingProducts(true);
    try {
      const payload = await apiRequest<Product[]>('/products');
      setProducts(payload);
    } catch (error) {
      console.error('[storefront] failed to load products', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const refreshAuctions = async () => {
    setLoadingAuctions(true);
    try {
      const payload = await apiRequest<Auction[]>('/auctions');
      setAuctions(payload);
    } catch (error) {
      console.error('[storefront] failed to load auctions', error);
      setAuctions([]);
    } finally {
      setLoadingAuctions(false);
    }
  };

  useEffect(() => {
    void refreshProducts();
    void refreshAuctions();
  }, []);

  const value = useMemo(
    () => ({
      products,
      auctions,
      loadingProducts,
      loadingAuctions,
      refreshProducts,
      refreshAuctions
    }),
    [products, auctions, loadingProducts, loadingAuctions]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
