import { useState, useEffect } from "react";
import NotificationIcon from "../assets/NavIcons/Notification.svg";
import AddEmployee from "../assets/NavIcons/addEmployee.webp";
import { Phone } from "lucide-react";
const unreadCount = 1;

const NavBar = ({ type }) => {
  return (
    <>
      <div className={`sticky top-0 p-[0.3vw] z-48 min-h-[8%] max-h-[8%]`}>
        <div className="flex justify-between items-start">
          {type === "Service Call" ? (
            <h1 className="text-[1.3vw] font-medium text-gray-900 flex items-center gap-[0.8vw]">
              <Phone className="w-[1.2vw] h-[1.2vw] text-blue-600" />
              Service Call Entry
            </h1>
          ) : (
            <h1 className="text-[1.3vw] font-medium text-gray-900">{type}</h1>
          )}

          <div className={`flex gap-[0.8vw] items-center`}>
            <div className="flex items-center space-x-3 bg-white border border-gray-300 rounded-full px-[0.4vw] py-[0.33vw] hover:shadow-md hover:border-gray-400 transition-all duration-200">
              <div className="relative" title="Notification">
                <img
                  src={NotificationIcon}
                  alt="Notification"
                  className="w-[1.7vw] h-[1.7vw] rounded-full cursor-pointer hover:scale-110 transition-transform duration-200"
                  title="Notifications"
                />

                {unreadCount > 0 && (
                  <span className="absolute -top-[0.4vw] -right-[0.4vw] flex items-center justify-center h-[1.2vw] min-w-[1.2vw] px-[0.2vw] bg-red-500 text-white text-[0.65vw] font-bold rounded-full leading-none pointer-events-none">
                    {unreadCount}
                  </span>
                )}
              </div>

              <img
                src={AddEmployee}
                title="Add Employee"
                alt=""
                className="w-[1.7vw] h-[1.7vw] cursor-pointer border border-gray-500 hover:scale-110 transition-transform duration-200 rounded-full p-[0.3vw]"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavBar;
