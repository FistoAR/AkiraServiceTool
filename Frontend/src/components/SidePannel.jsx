import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  function linkClasses(path, isLayout = false) {
    const { pathname } = useLocation();
    const isActive = isLayout ? pathname.startsWith(path) : pathname === path;

    return `flex items-center px-4 py-3 rounded-md transition duration-200 gap-3 
          ${
            isActive
              ? "bg-blue-50 text-blue-500 font-semibold b-l border-blue-500 border-l-5"
              : "text-gray-700 hover:bg-gray-100"
          }`;
  }

  return (
    <>
      <aside
        className="flex flex-col bg-white px-1.5 text-[1vw]"
        style={{ maxWidth: "16%", minWidth: "16%" }}
      >
        <div className="flex items-center justify-center h-[15%] mb-3">
          <img
            src="/Akira_logo.webp"
            alt="Project Management Logo"
            style={{ width: "auto", height: "55%" }}
          />
        </div>

        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-5">
            <li className="h-[10%] flex items-center">
              <Link
                to="/dashboard"
                className={`${linkClasses(
                  "/dashboard",
                )} flex items-center gap-[1.3vw] w-full`}
              >
                <img
                  src="/SidePannelLogos/Dashboard.svg"
                  alt="Dashboard"
                  className="w-[1.4vw] h-[1.4vw]"
                  style={{
                    filter:
                      location.pathname === "/dashboard"
                        ? "invert(32%) sepia(98%) saturate(2000%) hue-rotate(200deg) brightness(99%) contrast(95%)"
                        : "none",
                  }}
                />
                <span className="font-bolder">Dashboard</span>
              </Link>
            </li>

            <li className="h-[10%] flex items-center">
              <Link
                to="/customers"
                className={`${linkClasses(
                  "/customers",
                )} flex items-center gap-[1.3vw] w-full`}
              >
                <img
                  src="/SidePannelLogos/Activity.svg"
                  alt="customers"
                  className="w-[1.4vw] h-[1.4vw]"
                  style={{
                    filter:
                      location.pathname === "/customers"
                        ? "invert(32%) sepia(98%) saturate(2000%) hue-rotate(200deg) brightness(99%) contrast(95%)"
                        : "none",
                  }}
                />
                <span>Customers</span>
              </Link>
            </li>

            <li className="h-[10%] flex items-center">
              <Link
                to="/tickets"
                className={`${linkClasses(
                  "/tickets",
                )} flex items-center gap-[1.3vw] w-full`}
              >
                <img
                  src="/SidePannelLogos/Analytics.svg"
                  alt="tickets"
                  className="w-[1.4vw] h-[1.4vw]"
                  style={{
                    filter:
                      location.pathname === "/tickets"
                        ? "invert(32%) sepia(98%) saturate(2000%) hue-rotate(200deg) brightness(99%) contrast(95%)"
                        : "none",
                  }}
                />
                <span>Tickets</span>
              </Link>
            </li>

             <li className="h-[10%] flex items-center">
              <Link
                to="/troubleshoot"
                className={`${linkClasses(
                  "/troubleshoot",
                )} flex items-center gap-[1.3vw] w-full`}
              >
                <img
                  src="/SidePannelLogos/Messages.svg"
                  alt="troubleshoot"
                  className="w-[1.4vw] h-[1.4vw]"
                  style={{
                    filter:
                      location.pathname === "/troubleshoot"
                        ? "invert(32%) sepia(98%) saturate(2000%) hue-rotate(200deg) brightness(99%) contrast(95%)"
                        : "none",
                  }}
                />
                <span>Troubleshoot</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
