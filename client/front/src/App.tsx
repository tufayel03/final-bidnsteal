/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TrackScene } from './components/TrackScene';
import { ShopPage } from './components/ShopPage';
import { ProductPage } from './components/ProductPage';
import { CheckoutPage } from './components/CheckoutPage';
import { AccountPage } from './components/AccountPage';
import { AuctionPage } from './components/AuctionPage';
import { AuctionDetailPage } from './components/AuctionDetailPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Navbar } from './components/Navbar';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={
                <main className="w-full h-[100svh] overflow-hidden bg-[#0D0D0F]">
                  <Navbar />
                  <TrackScene />
                </main>
              } />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:id" element={<ProductPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/auction" element={<AuctionPage />} />
              <Route path="/auction/:id" element={<AuctionDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
          </Router>
        </CartProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
