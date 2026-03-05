// components/SidePannel.jsx
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";

export const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function Sidebar() {
  const location = useLocation();
  const [loggedInUser, setLoggedInUser] = useState(null);
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (user) setLoggedInUser(user);
  }, []);

  const isAdmin = loggedInUser?.department === "Admin";

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "/SidePannelLogos/Dashboard.svg", show: true },
    { path: "/masterPage", label: "Master Access", icon: "/SidePannelLogos/access.png", show: isAdmin },
    { path: "/customers", label: "Customers", icon: "/SidePannelLogos/Activity.svg", show: isAdmin },
    { path: "/serviceCall", label: "Service Call", icon: "/SidePannelLogos/call.png", show: isAdmin },
    { path: "/serviceMaterial", label: "Service Material", icon: "/SidePannelLogos/service.png", show: isAdmin },
    { path: "/productionMaterial", label: "Production Material", icon: "/SidePannelLogos/production.png", show: isAdmin },
    { path: "/escalation", label: "Escalation", icon: "/SidePannelLogos/Analytics.svg", show: !isAdmin },
    { path: "/troubleshoot", label: "Troubleshoot", icon: "/SidePannelLogos/Messages.svg", show: true },
  ];

  const activeFilter = "invert(32%) sepia(98%) saturate(2000%) hue-rotate(200deg) brightness(99%) contrast(95%)";
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside
      className={`
        flex flex-col bg-white relative
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        border-r border-gray-100 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.08)]
        ${isCollapsed ? "min-w-[5vw] max-w-[5vw]" : "min-w-[14vw] max-w-[14vw]"}
      `}
      style={{ height: "100vh" }}
    >
      {/* Logo Section */}
      <div className={`flex items-center justify-center border-b border-gray-50 transition-all duration-500 ease-out ${isCollapsed ? "h-[10vh] px-[0.5vw]" : "h-[12vh] px-[1vw]"}`}>
        <img
          src="/Akira_logo.webp"
          alt="Logo"
          className={`transition-all duration-500 ease-out object-contain ${isCollapsed ? "w-auto h-[4vw] ml-[0.2vw]" : "w-auto h-[7vh]"}`}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-[2vh] px-[0.3vw] custom-scrollbar">
        <ul className="space-y-[2vh]">
          {navItems.filter(item => item.show).map((item, index) => {
            const active = isActive(item.path);
            return (
              <li
                key={item.path}
                className="relative"
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ animationDelay: `${index * 50}ms` }}
                title={isCollapsed ? item.label : ""}
              >
                <Link
                  to={item.path}
                  className={`
                    relative flex items-center rounded-xl
                    transition-all duration-300 ease-out overflow-hidden
                    ${isCollapsed ? "justify-center px-[0.6vw] py-[1.2vh]" : "px-[1vw] py-[1.2vh] gap-[1vw]"}
                    ${active
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                  `}
                >
                  {!active && hoveredItem === item.path && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent rounded-xl animate-fadeIn" />
                  )}
                  <div className={`relative flex-shrink-0 flex items-center justify-center transition-all duration-300 ${isCollapsed ? "w-[1.8vw] h-[1.8vw]" : "w-[1.4vw] h-[1.4vw]"}`}>
                    <img
                      src={item.icon}
                      alt={item.label}
                      className="w-full h-full object-contain transition-all duration-300"
                      style={{ filter: active ? "brightness(0) invert(1)" : hoveredItem === item.path ? activeFilter : "none" }}
                    />
                  </div>
                  <span className={`whitespace-nowrap font-medium text-[0.85vw] transition-all duration-500 ease-out ${isCollapsed ? "w-0 opacity-0 translate-x-[-1vw] pointer-events-none" : "w-auto opacity-100 translate-x-0"}`}>
                    {item.label}
                  </span>
                  {active && <div className="absolute left-0 top-[15%] bottom-[15%] w-[0.25vw] bg-white rounded-r-full animate-slideIn" />}
                </Link>

                {/* Tooltip for collapsed state */}
                {isCollapsed && hoveredItem === item.path && (
                  <div className="absolute left-[120%] top-1/2 -translate-y-1/2 z-[100] bg-gray-900 text-white text-[0.75vw] font-medium px-[0.8vw] py-[0.5vh] rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-[0.4vw] border-transparent border-r-gray-900" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Divider */}
      <div className="mx-[1vw]">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* Bottom: toggle arrow when collapsed, user profile when expanded */}
      <div className={`py-[1.2vh] transition-all duration-500 ease-out ${isCollapsed ? "px-[0.4vw]" : "px-[0.8vw]"}`}>

        {/* Collapsed: just the expand arrow button centered */}
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center py-[1vh] rounded-xl hover:bg-blue-50 transition-all duration-300 cursor-pointer group bg-blue-100"
            title="Expand sidebar"
          >
            <svg
              className="w-[1.2vw] h-[1.2vw] text-blue-400 group-hover:text-blue-600 transition-colors duration-200"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          /* Expanded: user profile + collapse arrow */
          loggedInUser && (
            <div
              className="flex items-center rounded-xl p-[0.5vw] bg-gradient-to-r from-gray-50 to-gray-50/50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 cursor-pointer gap-[0.7vw]"
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 w-[2.2vw] h-[2.2vw]">
                <span className="text-white font-bold text-[0.6vw]">
                  {loggedInUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              {/* Name + dept */}
              <div className="flex-1 overflow-hidden">
                <p className="text-[0.78vw] font-semibold text-gray-800 truncate leading-tight">{loggedInUser.name}</p>
                <p className="text-[0.6vw] text-gray-400 truncate leading-tight mt-[0.1vh]">{loggedInUser.department}</p>
              </div>
              <div className="p-[0.3vw] bg-blue-100 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors duration-200">

                 <svg
                className="w-[0.9vw] h-[0.9vw] text-blue-400 flex-shrink-0 rotate-180"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>

              </div>
             
            </div>
          )
        )}
      </div>
    </aside>
  );
}