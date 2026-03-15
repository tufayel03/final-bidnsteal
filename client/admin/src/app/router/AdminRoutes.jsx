import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLoginPage } from "../../pages/AdminLoginPage";
import { AdminPanelExactPage } from "../../pages/AdminPanelExactPage";
import {
  ADMIN_AUCTION_DETAILS_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_ORDER_CREATE_PATH,
  ADMIN_ORDER_DETAILS_PATH,
  ADMIN_PANEL_PATH,
  ADMIN_PRODUCT_BUYERS_PATH,
  ADMIN_USER_DETAILS_PATH
} from "./adminPaths";

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
      <Route path={ADMIN_LOGIN_PATH} element={<AdminLoginPage />} />
      <Route path={ADMIN_PANEL_PATH} element={<AdminPanelExactPage />} />
      <Route path={ADMIN_PRODUCT_BUYERS_PATH} element={<AdminPanelExactPage />} />
      <Route path={ADMIN_ORDER_CREATE_PATH} element={<AdminPanelExactPage />} />
      <Route path={ADMIN_ORDER_DETAILS_PATH} element={<AdminPanelExactPage />} />
      <Route path={ADMIN_AUCTION_DETAILS_PATH} element={<AdminPanelExactPage />} />
      <Route path={ADMIN_USER_DETAILS_PATH} element={<AdminPanelExactPage />} />
      <Route path="*" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
    </Routes>
  );
}
