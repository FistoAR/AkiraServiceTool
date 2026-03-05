// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Sidebar, { SidebarProvider, useSidebar } from "./components/SidePannel";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers";
import ServiceCall from "./pages/ServiceCall.jsx";
import ServiceMaterial from "./pages/ServiceMaterial.jsx";
import ProductionMaterial from "./pages/ProductionMaterial.jsx";
import Troubleshoot from "./pages/troubleshoot";
import Esculation from "./pages/esculation";
import { usePageTitle } from "./components/PageTitleNav";
import MasterPage from "./pages/MasterPage";

function NavBarWithTitle() {
  const pageTitle = usePageTitle();
  return <NavBar type={pageTitle} />;
}

function MainLayout() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      <Sidebar />
      <main
        className={`
          flex-1 bg-gray-50 min-h-screen px-[1.2vw] py-[0.4vh] 
          overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        `}
      >
        <NavBarWithTitle />
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="masterPage" element={<MasterPage />} />
          <Route path="customers" element={<Customers />} />
          <Route path="serviceCall" element={<ServiceCall />} />
          <Route path="serviceMaterial" element={<ServiceMaterial />} />
          <Route path="productionMaterial" element={<ProductionMaterial />} />
          <Route path="troubleshoot" element={<Troubleshoot />} />
          <Route path="escalation" element={<Esculation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </SidebarProvider>
    </Router>
  );
}

export default App;