import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, User } from "lucide-react";
import logo from "../../public/Akira_logo.webp";

const LoginPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
    rememberMe: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const emailInput = document.querySelector(
        'input[name="emailOrUsername"]'
      );
      if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
      }
    }
  }, [mounted]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden text-gray-700">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 opacity-80"></div>
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-[0.5vw] h-[0.5vw] bg-white bg-opacity-20 rounded-full transition-all duration-[6000ms] ${
                mounted ? "animate-pulse" : ""
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[28%]">
        <div
          className={`transition-all duration-1000 ${
            mounted
              ? "transform translate-y-0 opacity-100"
              : "transform translate-y-8 opacity-0"
          }`}
        >
          <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-[1.5vw] border border-white border-opacity-20">
            <div className="flex flex-col items-center text-center mb-[1vw]">
              <img src={logo} alt="App Logo" className="mb-[0.8vw] w-[8vw]" />
              <p className="text-gray-600 text-[1vw]">
                Welcome back! Please sign in to your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.6vw]">
                  Emp ID or Email *
                </label>
                <div className="relative">
                  <User
                    className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                    size={"1vw"}
                  />
                  <input
                    type="text"
                    name="emailOrUsername"
                    value={formData.emailOrUsername}
                    onChange={handleInputChange}
                    className="w-full pl-[2.2vw] text-[0.9vw] pr-[1vw] py-[0.6vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-[0.85vw]"
                    placeholder="Enter your Emp ID or Email"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[0.9vw] font-medium text-gray-700 mb-[0.6vw]">
                  Password *
                </label>
                <div className="relative">
                  <Shield
                    className="absolute z-1 top-1/2 -translate-y-1/2 left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                    size={"1vw"}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-[2.2vw] text-[0.9vw] pr-[1vw] py-[0.6vw] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white bg-opacity-50 backdrop-blur-sm hover:bg-opacity-70 focus:bg-opacity-90 placeholder:text-[0.85vw]"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <Eye size={"1vw"} />
                    ) : (
                      <EyeOff size={"1vw"} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-[1.2vw] h-[1.2vw] text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-[0.5vw] text-[0.9vw] text-gray-700">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  className="text-[0.9vw] text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="text-[1vw] w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-[0.6vw] px-[0.2vw] rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;