import { useLocation } from "react-router-dom";

export function usePageTitle() {
  const location = useLocation();

  const titles = {
    "/dashboard": "Dashboard",
    "/customers": "Customers Data",
    "/tickets": "Service Call",
    "/troubleshoot" : "Troubleshoot"
  };

  return titles[location.pathname] || "Dashboard";
}
