import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const location = useLocation();
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (user) {
      setLoggedInUser(user);
    }
  }, []);

  const isAdmin = loggedInUser?.department === "Admin";

  function linkClasses(path) {
    const isActive = location.pathname.startsWith(path);

    return `flex items-center px-4 py-3 rounded-md transition duration-200 gap-3 
          ${
            isActive
              ? "bg-blue-50 text-blue-500 font-semibold border-blue-500 border-l-5"
              : "text-gray-700 hover:bg-gray-100"
          }`;
  }

  const activeFilter =
    "invert(32%) sepia(98%) saturate(2000%) hue-rotate(200deg) brightness(99%) contrast(95%)";

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
                className={`${linkClasses("/dashboard")} flex items-center gap-[1.3vw] w-full`}
              >
                <img
                  src="/SidePannelLogos/Dashboard.svg"
                  alt="Dashboard"
                  className="w-[1.4vw] h-[1.4vw]"
                  style={{
                    filter: location.pathname === "/dashboard" ? activeFilter : "none",
                  }}
                />
                <span className="font-bolder">Dashboard</span>
              </Link>
            </li>

            {isAdmin && (
              <>
               <li className="h-[10%] flex items-center">
                <Link
                  to="/masterPage"
                  className={`${linkClasses("/masterPage")} flex items-center gap-[1.3vw] w-full`}
                >
                  <img
                    src="/SidePannelLogos/Activity.svg"
                    alt="masterPage"
                    className="w-[1.4vw] h-[1.4vw]"
                    style={{
                      filter: location.pathname === "/masterPage" ? activeFilter : "none",
                    }}
                  />
                  <span>Master Access</span>
                </Link>
              </li>


              <li className="h-[10%] flex items-center">
                <Link
                  to="/customers"
                  className={`${linkClasses("/customers")} flex items-center gap-[1.3vw] w-full`}
                >
                  <img
                    src="/SidePannelLogos/Activity.svg"
                    alt="customers"
                    className="w-[1.4vw] h-[1.4vw]"
                    style={{
                      filter: location.pathname === "/customers" ? activeFilter : "none",
                    }}
                  />
                  <span>Customers</span>
                </Link>
              </li>
              </>
              
            )}

            {isAdmin && (
              <li className="h-[10%] flex items-center">
                <Link
                  to="/tickets"
                  className={`${linkClasses("/tickets")} flex items-center gap-[1.3vw] w-full`}
                >
                  <img
                    src="/SidePannelLogos/Analytics.svg"
                    alt="tickets"
                    className="w-[1.4vw] h-[1.4vw]"
                    style={{
                      filter: location.pathname === "/tickets" ? activeFilter : "none",
                    }}
                  />
                  <span>Tickets</span>
                </Link>
              </li>
            )}

            {!isAdmin && (
              <li className="h-[10%] flex items-center">
                <Link
                  to="/escalation"
                  className={`${linkClasses("/escalation")} flex items-center gap-[1.3vw] w-full`}
                >
                  <img
                    src="/SidePannelLogos/Analytics.svg"
                    alt="escalation"
                    className="w-[1.4vw] h-[1.4vw]"
                    style={{
                      filter: location.pathname.startsWith("/escalation")
                        ? activeFilter
                        : "none",
                    }}
                  />
                  <span>Escalation</span>
                </Link>
              </li>
            )}

            {/* Troubleshoot - Visible to ALL */}
            <li className="h-[10%] flex items-center">
              <Link
                to="/troubleshoot"
                className={`${linkClasses("/troubleshoot")} flex items-center gap-[1.3vw] w-full`}
              >
                <img
                  src="/SidePannelLogos/Messages.svg"
                  alt="troubleshoot"
                  className="w-[1.4vw] h-[1.4vw]"
                  style={{
                    filter: location.pathname === "/troubleshoot" ? activeFilter : "none",
                  }}
                />
                <span>Troubleshoot</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* User Info at Bottom */}
        {loggedInUser && (
          <div className="border-t border-gray-200 py-[0.8vw] px-[0.5vw] mb-[0.5vw]">
            <div className="flex items-center gap-[0.6vw]">
              <div className="w-[2vw] h-[2vw] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-[0.65vw] font-bold">
                  {loggedInUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-[0.8vw] font-semibold text-gray-800 truncate">
                  {loggedInUser.name}
                </p>
                <p className="text-[0.65vw] text-gray-500 truncate">
                  {loggedInUser.department}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}