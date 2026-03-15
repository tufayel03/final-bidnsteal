import React, { useEffect } from "react";
import { AdminPanelLayout } from "../app/layouts/AdminPanelLayout";
import { AdminProvider } from "../panel/AdminContext";

export function AdminPanelExactPage() {
  useEffect(() => {
    document.title = "Control Panel | BidnSteal";

    let robotsMeta = document.querySelector('meta[name="robots"]');
    let createdMeta = false;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
      createdMeta = true;
    }

    robotsMeta.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (createdMeta && robotsMeta?.parentNode) {
        robotsMeta.parentNode.removeChild(robotsMeta);
      }
    };
  }, []);

  return (
    <AdminProvider>
      <AdminPanelLayout />
    </AdminProvider>
  );
}
