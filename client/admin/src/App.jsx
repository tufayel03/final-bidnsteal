import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminPanelExactPage } from "./pages/AdminPanelExactPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tufayel" replace />} />
      <Route path="/tufayel" element={<AdminLoginPage />} />
      <Route path="/tufayel/panel" element={<AdminPanelExactPage />} />
      <Route path="*" element={<Navigate to="/tufayel" replace />} />
    </Routes>
  );
}
