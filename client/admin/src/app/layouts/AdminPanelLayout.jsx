import React, { useEffect, useState } from "react";
import { useLocation, useMatch } from "react-router-dom";

import { useAdmin } from "../../panel/AdminContext";
import { AdminSidebar } from "../../panel/components/AdminSidebar";
import { AdminTopbar } from "../../panel/components/AdminTopbar";
import { AuctionDetailsPage } from "../../panel/components/auctions/AuctionDetailsPage";
import { ProductBuyersPage } from "../../panel/components/inventory/ProductBuyersPage";
import { AdminModals } from "../../panel/components/modals/AdminModals";
import { OrderDetailsPage } from "../../panel/components/orders/OrderDetailsPage";
import { UserDetailsPage } from "../../panel/components/users/UserDetailsPage";
import { AnalyticsTab } from "../../panel/tabs/AnalyticsTab";
import { AuctionsTab } from "../../panel/tabs/AuctionsTab";
import { CampaignsTab } from "../../panel/tabs/CampaignsTab";
import { CouponsTab } from "../../panel/tabs/CouponsTab";
import { DashboardTab } from "../../panel/tabs/DashboardTab";
import { InventoryTab } from "../../panel/tabs/InventoryTab";
import { MediaTab } from "../../panel/tabs/MediaTab";
import { OrdersTab } from "../../panel/tabs/OrdersTab";
import { ProductFormTab } from "../../panel/tabs/ProductFormTab";
import { ReportsTab } from "../../panel/tabs/ReportsTab";
import { SettingsTab } from "../../panel/tabs/SettingsTab";
import { SubscribersTab } from "../../panel/tabs/SubscribersTab";
import { UsersTab } from "../../panel/tabs/UsersTab";
import {
  ADMIN_AUCTION_DETAILS_PATH,
  ADMIN_ORDER_DETAILS_PATH,
  ADMIN_PANEL_PATH,
  ADMIN_PRODUCT_BUYERS_PATH,
  ADMIN_USER_DETAILS_PATH
} from "../router/adminPaths";

function AdminLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100 font-sans">
      <div className="flex flex-col items-center">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{ border: "4px solid rgba(180, 204, 87, 0.18)", borderTopColor: "#b4cc57" }}
        />
        <p className="mt-4 text-sm text-zinc-400">Loading Control Panel...</p>
      </div>
    </div>
  );
}

function renderActiveAdminView(admin, matches) {
  const {
    orderDetailsMatch,
    auctionDetailsMatch,
    productBuyersMatch,
    userDetailsMatch
  } = matches;

  if (orderDetailsMatch) return <OrderDetailsPage />;
  if (auctionDetailsMatch) return <AuctionDetailsPage />;
  if (productBuyersMatch) return <ProductBuyersPage />;
  if (userDetailsMatch) return <UserDetailsPage />;

  switch (admin.activeTab) {
    case "dashboard":
      return <DashboardTab />;
    case "inventory":
    case "products":
      return <InventoryTab />;
    case "product-form":
      return <ProductFormTab />;
    case "media":
      return <MediaTab />;
    case "auctions":
      return <AuctionsTab />;
    case "orders":
      return <OrdersTab />;
    case "analytics":
      return <AnalyticsTab />;
    case "settings":
      return <SettingsTab />;
    case "users":
    case "customers":
      return <UsersTab />;
    case "subscribers":
      return <SubscribersTab />;
    case "campaigns":
    case "marketing":
      return <CampaignsTab />;
    case "coupons":
    case "discounts":
      return <CouponsTab />;
    case "reports":
      return <ReportsTab />;
    default:
      return (
        <div className="flex h-64 items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl">
          <div className="text-center">
            <h3 className="text-lg font-bold text-zinc-400">{admin.activeTab}</h3>
            <p className="text-sm text-zinc-600 mt-2">
              This module is under construction in the new React architecture.
            </p>
          </div>
        </div>
      );
  }
}

export function AdminPanelLayout() {
  const admin = useAdmin();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();
  const orderDetailsMatch = useMatch(ADMIN_ORDER_DETAILS_PATH);
  const auctionDetailsMatch = useMatch(ADMIN_AUCTION_DETAILS_PATH);
  const productBuyersMatch = useMatch(ADMIN_PRODUCT_BUYERS_PATH);
  const userDetailsMatch = useMatch(ADMIN_USER_DETAILS_PATH);
  const isBasePanelRoute = location.pathname === ADMIN_PANEL_PATH;
  const requestedTab = isBasePanelRoute ? new URLSearchParams(location.search).get("tab") : null;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsLoaded(true);
      if (admin.initPanel) {
        admin.initPanel();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [admin]);

  useEffect(() => {
    if (!isLoaded) return;

    if (orderDetailsMatch) {
      if (admin.activeTab !== "orders" && admin.setActiveTab) {
        admin.setActiveTab("orders");
      }
      return;
    }

    if (auctionDetailsMatch) {
      if (admin.activeTab !== "auctions" && admin.setActiveTab) {
        admin.setActiveTab("auctions");
      }
      return;
    }

    if (productBuyersMatch) {
      if (admin.activeTab !== "inventory" && admin.setActiveTab) {
        admin.setActiveTab("inventory");
      }
      return;
    }

    if (userDetailsMatch) {
      if (admin.activeTab !== "users" && admin.setActiveTab) {
        admin.setActiveTab("users");
      }
      return;
    }

    if (!isBasePanelRoute || !requestedTab) return;

    const knownTabs = new Set((admin.menuItems || []).map((item) => item.id));
    if (!knownTabs.has(requestedTab)) return;

    if (admin.activeTab !== requestedTab && admin.setActiveTab) {
      admin.setActiveTab(requestedTab);
    }
  }, [
    admin,
    auctionDetailsMatch,
    isBasePanelRoute,
    isLoaded,
    orderDetailsMatch,
    productBuyersMatch,
    requestedTab,
    userDetailsMatch
  ]);

  if (!isLoaded) {
    return <AdminLoadingState />;
  }

  const isDashboardSurface =
    admin.activeTab === "dashboard" &&
    !orderDetailsMatch &&
    !auctionDetailsMatch &&
    !productBuyersMatch &&
    !userDetailsMatch;

  return (
    <div className={`admin-layout admin-layout--soft ${admin.localSettings?.sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <AdminSidebar />
      <div className="admin-main">
        <AdminTopbar />

        <main className={`admin-content custom-scrollbar ${isDashboardSurface ? "admin-content--dashboard" : ""}`}>
          {renderActiveAdminView(admin, {
            orderDetailsMatch,
            auctionDetailsMatch,
            productBuyersMatch,
            userDetailsMatch
          })}
        </main>
      </div>

      <AdminModals />
    </div>
  );
}
