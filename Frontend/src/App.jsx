import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Sidebar from "./components/SidePannel";
import NavBar from "./components/NavBar";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers";
import Tickes from "./pages/tickets";
import Troubleshoot from "./pages/troubleshoot"
import Esculation from "./pages/esculation"
import { usePageTitle } from "./components/PageTitleNav";

function NavBarWithTitle() {
  const pageTitle = usePageTitle();
  return <NavBar type={pageTitle} />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/*"
          element={
            <div>
              <div className="flex max-w-[100vw] max-h-[100vh]">
                <Sidebar />
                <main className="flex-1 bg-gray-100 min-h-screen px-[1.2vw] py-[0.4vh] max-w-[84%] min-w-[84%] overflow-hidden">
                  <NavBarWithTitle />
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="tickets" element={<Tickes />} />
                    <Route path="troubleshoot" element={<Troubleshoot/>}/>
                    <Route path="escalation" element={<Esculation/>}/>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
