import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  Clock,
  Save,
  X,
  Search,
  User,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  FileText,
  CheckCircle,
  History,
  Smartphone,
  ChevronDown,
  Package,
  PlusCircle,
  MinusCircle,
  UserPlus,
} from "lucide-react";

const CUSTOMER_DB_KEY = "customer_db_grouped_v4";
const SERVICE_CALLS_KEY = "service_calls_v1";
const PARTY_TYPES_KEY = "party_types_v1"; // Added for dynamic party types

const MODES = ["Phone", "Email", "WhatsApp", "Portal"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORIES = ["Phone Support", "Field Visit", "In-house Repair"];
const WARRANTY_STATUS = ["In Warranty", "Out of Warranty"];

const ServiceCallEntry = () => {
  // --- Master Data State (from LocalStorage) ---
  const [customerDb, setCustomerDb] = useState([]);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]); // Added for dynamic party types

  // --- Form State ---
  const [formData, setFormData] = useState({
    callNumber: "",
    dateTime: "",
    mode: "Phone",
    priority: "Medium",
    category: "Phone Support",
    customerType: "",
    partyCode: "",
    customerName: "",
    contactPerson: "",
    contactNumber: "",
    emailId: "",
    location: "",
    itemCode: "",
    productModel: "",
    serialNumber: "",
    dateOfSupply: "",
    warrantyStatus: "In Warranty",
    callDescription: "",
    errorCode: "",
    mediaReceived: "No",
    previousHistory: "",
    assignedEngineer: "",
    assignmentDate: "",
    expectedResponse: "",
    ackSent: "No",
    sentBy: "Auto",
    timestamp: "",
  });

  // --- Searchable Dropdown States ---
  const [showCustSearch, setShowCustSearch] = useState(false);
  const [showProdSearch, setShowProdSearch] = useState(false);
  const custInputRef = useRef(null);
  const prodInputRef = useRef(null);

  // --- History State ---
  const [productHistory, setProductHistory] = useState([]);
  const [customerHistory, setCustomerHistory] = useState([]);

  // --- Add Customer Modal State ---
  const [newCustomer, setNewCustomer] = useState({
    partyCode: "",
    partyDescription: "",
    partyType: "",
    items: [{ itemCode: "", itemDescription: "" }],
  });

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // --- 1. Initialization & Auto-Generation ---
  useEffect(() => {
    // Load Party Types
    const storedTypes = localStorage.getItem(PARTY_TYPES_KEY);
    if (storedTypes) {
      try {
        const types = JSON.parse(storedTypes);
        setPartyTypes(types);
        // Set default customer type if not set
        if (types.length > 0 && !formData.customerType) {
          setFormData(prev => ({ ...prev, customerType: types[0].name }));
        }
      } catch (e) {
        console.error("Error loading party types", e);
        // Set default types if error
        const defaultTypes = [
          { id: 1, name: "OEM" },
          { id: 2, name: "End Customer" },
        ];
        setPartyTypes(defaultTypes);
        setFormData(prev => ({ ...prev, customerType: defaultTypes[0].name }));
      }
    } else {
      // Initialize with default types
      const defaultTypes = [
        { id: 1, name: "OEM" },
        { id: 2, name: "End Customer" },
      ];
      setPartyTypes(defaultTypes);
      localStorage.setItem(PARTY_TYPES_KEY, JSON.stringify(defaultTypes));
      setFormData(prev => ({ ...prev, customerType: defaultTypes[0].name }));
    }

    // Load Customer DB
    const storedDb = localStorage.getItem(CUSTOMER_DB_KEY);
    if (storedDb) {
      try {
        setCustomerDb(JSON.parse(storedDb));
      } catch (e) {
        console.error("Error loading DB", e);
      }
    }

    // Load Service Calls
    const storedCalls = localStorage.getItem(SERVICE_CALLS_KEY);
    if (storedCalls) {
      try {
        setServiceCalls(JSON.parse(storedCalls));
      } catch (e) {
        console.error("Error loading service calls", e);
      }
    }

    // Initialize form with auto-generated values
    initializeForm();

    // Click outside listener to close dropdowns
    const handleClickOutside = (e) => {
      if (custInputRef.current && !custInputRef.current.contains(e.target))
        setShowCustSearch(false);
      if (prodInputRef.current && !prodInputRef.current.contains(e.target))
        setShowProdSearch(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update newCustomer default type when party types load
  useEffect(() => {
    if (partyTypes.length > 0 && !newCustomer.partyType) {
      setNewCustomer(prev => ({ ...prev, partyType: partyTypes[0].name }));
    }
  }, [partyTypes]);

  const initializeForm = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const generatedCallId = `SC-${dateStr}-${randomId}`;

    setFormData((prev) => ({
      ...prev,
      callNumber: generatedCallId,
      dateTime: now.toLocaleString(),
      timestamp: now.toISOString(),
      assignmentDate: now.toISOString().slice(0, 16),
    }));
  };

  // --- 2. Derived Data for Search ---

  // Filter customers by type using exact match
  const filteredCustomersByType = useMemo(() => {
    const map = new Map();
    customerDb.forEach((item) => {
      // Exact match on party type
      if (item.partyType === formData.customerType) {
        if (!map.has(item.partyCode)) {
          map.set(item.partyCode, {
            code: item.partyCode,
            name: item.partyDescription,
            type: item.partyType,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [customerDb, formData.customerType]);

  // Filtered Products based on Selected Customer
  const availableProducts = useMemo(() => {
    if (!formData.partyCode) return [];
    return customerDb.filter((item) => item.partyCode === formData.partyCode);
  }, [customerDb, formData.partyCode]);

  // --- 3. History Lookup ---
  // Customer History - when customer is selected
  useEffect(() => {
    if (formData.partyCode) {
      const history = serviceCalls.filter(
        (call) => call.partyCode === formData.partyCode,
      );
      // Sort by date descending (newest first)
      const sortedHistory = history.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );
      setCustomerHistory(sortedHistory);
    } else {
      setCustomerHistory([]);
    }
  }, [formData.partyCode, serviceCalls]);

  // Product/Serial Number History
  useEffect(() => {
    if (formData.serialNumber) {
      // Find all service calls for this serial number
      const history = serviceCalls.filter(
        (call) =>
          call.serialNumber &&
          call.serialNumber.toLowerCase() ===
            formData.serialNumber.toLowerCase(),
      );
      setProductHistory(history);
    } else {
      setProductHistory([]);
    }
  }, [formData.serialNumber, serviceCalls]);

  // --- 4. Handlers ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectCustomer = (code, name) => {
    setFormData((prev) => ({
      ...prev,
      partyCode: code,
      customerName: name,
      productModel: "",
      itemCode: "",
    }));
    setShowCustSearch(false);
  };

  const selectProduct = (itemCode, itemDescription) => {
    setFormData((prev) => ({
      ...prev,
      itemCode: itemCode,
      productModel: itemDescription,
    }));
    setShowProdSearch(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newCall = {
      ...formData,
      id: Date.now(),
    };

    const updatedCalls = [newCall, ...serviceCalls];
    setServiceCalls(updatedCalls);
    localStorage.setItem(SERVICE_CALLS_KEY, JSON.stringify(updatedCalls));

    alert(`Service Call ${formData.callNumber} Saved Successfully!`);

    resetForm();
  };

  const resetForm = () => {
    const defaultType = partyTypes.length > 0 ? partyTypes[0].name : "";
    setFormData({
      callNumber: "",
      dateTime: "",
      mode: "Phone",
      priority: "Medium",
      category: "Phone Support",
      customerType: defaultType,
      partyCode: "",
      customerName: "",
      contactPerson: "",
      contactNumber: "",
      emailId: "",
      location: "",
      itemCode: "",
      productModel: "",
      serialNumber: "",
      dateOfSupply: "",
      warrantyStatus: "In Warranty",
      callDescription: "",
      errorCode: "",
      mediaReceived: "No",
      previousHistory: "",
      assignedEngineer: "",
      assignmentDate: "",
      expectedResponse: "",
      ackSent: "No",
      sentBy: "Auto",
      timestamp: "",
    });
    setProductHistory([]);
    initializeForm();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Low":
        return "text-green-600 bg-green-50";
      case "Medium":
        return "text-yellow-600 bg-yellow-50";
      case "High":
        return "text-orange-600 bg-orange-50";
      case "Critical":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Get color for party type badge
  const getTypeColor = (typeName) => {
    const index = partyTypes.findIndex((t) => t.name === typeName);
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-orange-100 text-orange-700",
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
      "bg-teal-100 text-teal-700",
      "bg-red-100 text-red-700",
    ];
    return colors[index % colors.length] || "bg-gray-100 text-gray-700";
  };

  // --- Add Customer Modal Functions ---
  const cleanStr = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const handleAddItemRow = () => {
    setNewCustomer({
      ...newCustomer,
      items: [...newCustomer.items, { itemCode: "", itemDescription: "" }],
    });
  };

  const handleRemoveItemRow = (index) => {
    if (newCustomer.items.length === 1) return;
    const updatedItems = newCustomer.items.filter((_, i) => i !== index);
    setNewCustomer({ ...newCustomer, items: updatedItems });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = newCustomer.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    setNewCustomer({ ...newCustomer, items: updatedItems });
  };

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();

    // Check for duplicate Item Codes in DB
    const duplicateItems = newCustomer.items.filter((newItem) =>
      customerDb.some((d) => cleanStr(d.itemCode) === cleanStr(newItem.itemCode)),
    );

    if (duplicateItems.length > 0) {
      alert(
        `Item Code "${duplicateItems[0].itemCode}" already exists in the database!`,
      );
      return;
    }

    // Flatten the structure for storage (One Party -> Many Rows)
    const newRows = newCustomer.items.map((item) => ({
      partyCode: newCustomer.partyCode,
      partyDescription: newCustomer.partyDescription,
      partyType: newCustomer.partyType,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
    }));

    // Sort by Party Code
    const updatedDb = [...newRows, ...customerDb].sort((a, b) =>
      a.partyCode.localeCompare(b.partyCode),
    );

    setCustomerDb(updatedDb);
    localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updatedDb));

    // Auto-fill the form with the new customer
    setFormData((prev) => ({
      ...prev,
      partyCode: newCustomer.partyCode,
      customerName: newCustomer.partyDescription,
    }));

    alert("Customer added successfully!");
    setShowAddCustomerModal(false);
    setNewCustomer({
      partyCode: "",
      partyDescription: "",
      partyType: partyTypes.length > 0 ? partyTypes[0].name : "",
      items: [{ itemCode: "", itemDescription: "" }],
    });
  };

  const openAddCustomerModal = () => {
    // Pre-fill customer type from form
    setNewCustomer({
      partyCode: "",
      partyDescription: formData.customerName || "",
      partyType: formData.customerType || (partyTypes.length > 0 ? partyTypes[0].name : ""),
      items: [{ itemCode: "", itemDescription: "" }],
    });
    setShowAddCustomerModal(true);
  };

  return (
    <div className="w-full pr-[0.4vw] font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[1.5vw]">
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.5vw]">
          <div className="flex justify-between items-center">
            <h3 className="text-[1vw] font-bold text-gray-700 mb-[1vw] flex items-center gap-[0.5vw] border-b border-gray-100 pb-[0.5vw]">
              <Clock className="w-[1.2vw] h-[1.2vw] text-blue-500" /> Call
              Details
            </h3>
            <div className="bg-blue-50 px-[1vw] -mt-[0.8vw] py-[0.5vw] rounded-[0.4vw] shadow-sm border border-blue-200 text-blue-600 text-[0.8vw] flex justify-center items-center gap-[0.9vw]">
              Draft ID:{" "}
              <span className="font-mono font-bold text-blue-600">
                {formData.callNumber}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-[1.5vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Call Number (Auto)
              </label>
              <input
                readOnly
                value={formData.callNumber}
                className="bg-gray-100 border border-gray-300 rounded-[0.4vw] p-[0.6vw] text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Date & Time (Auto)
              </label>
              <input
                readOnly
                value={formData.dateTime}
                className="bg-gray-100 border border-gray-300 rounded-[0.4vw] p-[0.6vw] text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Mode of Call
              </label>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className={`border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none font-medium ${
                  formData.priority === "Critical"
                    ? "text-red-600"
                    : formData.priority === "High"
                      ? "text-orange-500"
                      : "text-gray-700"
                }`}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Call Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.5vw]">
          <h3 className="text-[1vw] font-bold text-gray-700 mb-[1vw] flex items-center gap-[0.5vw] border-b border-gray-100 pb-[0.5vw]">
            <User className="w-[1.2vw] h-[1.2vw] text-blue-500" /> Customer
            Information
          </h3>
          <div className="grid grid-cols-4 gap-[1.5vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Customer Type
              </label>
              <select
                name="customerType"
                value={formData.customerType}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    customerType: e.target.value,
                    partyCode: "",
                    customerName: "",
                    productModel: "",
                    itemCode: "",
                  });
                }}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
              >
                {partyTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="flex flex-col gap-[0.3vw] relative col-span-2"
              ref={custInputRef}
            >
              <label className="font-semibold text-gray-600 flex justify-between">
                Customer Name ({formData.customerType})
                <span className="text-[0.7vw] text-gray-400 font-normal">
                  ({filteredCustomersByType.length} available)
                </span>
              </label>
              <div className="relative flex gap-[0.5vw]">
                <div className="relative flex-1">
                  <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={(e) => {
                      setFormData({ ...formData, customerName: e.target.value });
                      setShowCustSearch(true);
                    }}
                    onFocus={() => setShowCustSearch(true)}
                    placeholder="Search & Select Customer..."
                    className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={openAddCustomerModal}
                  className="flex items-center gap-[0.3vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.8vw] rounded-[0.4vw] transition-all cursor-pointer whitespace-nowrap"
                  title="Add New Customer"
                >
                  <UserPlus className="w-[1vw] h-[1vw]" />
                  <span className="text-[0.75vw]">New</span>
                </button>
              </div>

              {showCustSearch && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[15vw] overflow-y-auto z-20">
                  {filteredCustomersByType
                    .filter((c) =>
                      c.name
                        .toLowerCase()
                        .includes(formData.customerName.toLowerCase()),
                    )
                    .map((cust, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectCustomer(cust.code, cust.name)}
                        className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700">
                            {cust.name}
                          </span>
                          <span className="text-[0.7vw] text-gray-400">
                            {cust.code}
                          </span>
                        </div>
                        <span
                          className={`text-[0.7vw] px-[0.5vw] py-[0.2vw] rounded-[0.3vw] ${getTypeColor(cust.type)}`}
                        >
                          {cust.type}
                        </span>
                      </div>
                    ))}
                  {filteredCustomersByType.filter((c) =>
                    c.name
                      .toLowerCase()
                      .includes(formData.customerName.toLowerCase()),
                  ).length === 0 && (
                    <div className="p-[1vw] text-gray-400 text-center">
                      No {formData.customerType} customers found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Contact Person
              </label>
              <input
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Contact Number
              </label>
              <input
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Email ID</label>
              <input
                type="email"
                name="emailId"
                value={formData.emailId}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw] col-span-2">
              <label className="font-semibold text-gray-600">
                Location / Site Address
              </label>
              <input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            {/* CUSTOMER HISTORY - Shows when customer is selected */}
            {formData.partyCode && (
              <div className="flex flex-col gap-[0.3vw] col-span-4">
                <label className="font-semibold text-gray-600 flex items-center gap-[0.5vw]">
                  <History className="w-[1vw] h-[1vw]" /> Customer Service
                  History
                  {customerHistory.length > 0 && (
                    <span className="text-[0.7vw] bg-purple-100 text-purple-700 px-[0.6vw] py-[0.2vw] rounded-full font-bold">
                      {customerHistory.length} Previous Call
                      {customerHistory.length > 1 ? "s" : ""}
                    </span>
                  )}
                </label>
                <div className="border border-gray-300 bg-gradient-to-br from-purple-50 to-white rounded-[0.4vw] p-[0.8vw] max-h-[12vw] overflow-y-auto">
                  {customerHistory.length > 0 ? (
                    <div className="space-y-[0.6vw]">
                      {customerHistory.map((call, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-purple-200 rounded-[0.4vw] p-[0.7vw] shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-[0.4vw]">
                            <div className="flex items-center gap-[0.5vw]">
                              <span className="font-mono text-[0.75vw] font-bold text-purple-600">
                                {call.callNumber}
                              </span>
                              <span
                                className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded-[0.2vw] font-semibold ${getPriorityColor(call.priority)}`}
                              >
                                {call.priority}
                              </span>
                              <span className="text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded-[0.2vw] bg-blue-100 text-blue-700 font-medium">
                                {call.category}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[0.7vw] text-gray-700 font-semibold flex items-center gap-[0.3vw]">
                                <Clock className="w-[0.8vw] h-[0.8vw]" />
                                {new Date(call.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[0.65vw] text-gray-500">
                                Created:{" "}
                                {new Date(call.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-[0.5vw] text-[0.75vw]">
                            <div className="text-gray-700">
                              <strong>Product:</strong>{" "}
                              {call.productModel || "N/A"}
                            </div>
                            <div className="text-gray-700">
                              <strong>Serial:</strong>{" "}
                              {call.serialNumber || "N/A"}
                            </div>
                          </div>
                          <div className="text-[0.75vw] text-gray-700 mt-[0.3vw]">
                            <strong>Issue:</strong>{" "}
                            {call.callDescription || "N/A"}
                          </div>
                          {call.assignedEngineer && (
                            <div className="text-[0.7vw] text-gray-600 mt-[0.2vw] flex items-center gap-[0.3vw]">
                              <User className="w-[0.8vw] h-[0.8vw]" />
                              <strong>Engineer:</strong> {call.assignedEngineer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center py-[1vw] text-[0.8vw]">
                      No previous service calls found for this customer
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: PRODUCT DETAILS */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.5vw]">
          <h3 className="text-[1vw] font-bold text-gray-700 mb-[1vw] flex items-center gap-[0.5vw] border-b border-gray-100 pb-[0.5vw]">
            <Smartphone className="w-[1.2vw] h-[1.2vw] text-blue-500" />{" "}
            Product Details
          </h3>
          <div className="grid grid-cols-4 gap-[1.5vw]">
            {/* SEARCHABLE DROPDOWN 2: PRODUCT (Dependent) */}
            <div
              className="flex flex-col gap-[0.3vw] relative col-span-2"
              ref={prodInputRef}
            >
              <label className="font-semibold text-gray-600">
                Product Model / Description
              </label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                <input
                  type="text"
                  name="productModel"
                  value={formData.productModel}
                  onChange={(e) => {
                    setFormData({ ...formData, productModel: e.target.value });
                    setShowProdSearch(true);
                  }}
                  onFocus={() => setShowProdSearch(true)}
                  disabled={!formData.partyCode}
                  placeholder={
                    !formData.partyCode
                      ? "Select a Customer first"
                      : "Search Product..."
                  }
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {showProdSearch && formData.partyCode && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[15vw] overflow-y-auto z-20">
                  {availableProducts
                    .filter((p) =>
                      p.itemDescription
                        .toLowerCase()
                        .includes(formData.productModel.toLowerCase()),
                    )
                    .map((prod, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          selectProduct(prod.itemCode, prod.itemDescription)
                        }
                        className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between group"
                      >
                        <span
                          className="font-medium text-gray-700 truncate max-w-[70%]"
                          title={prod.itemDescription}
                        >
                          {prod.itemDescription}
                        </span>
                        <span className="text-gray-400 text-[0.75vw] font-mono group-hover:text-blue-500">
                          {prod.itemCode}
                        </span>
                      </div>
                    ))}
                  {availableProducts.filter((p) =>
                    p.itemDescription
                      .toLowerCase()
                      .includes(formData.productModel.toLowerCase()),
                  ).length === 0 && (
                    <div className="p-[1vw] text-gray-400 text-center">
                      No products found for this customer
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Serial Number
              </label>
              <input
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Date of Supply
              </label>
              <input
                type="date"
                name="dateOfSupply"
                value={formData.dateOfSupply}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Warranty Status
              </label>
              <select
                name="warrantyStatus"
                value={formData.warrantyStatus}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
              >
                {WARRANTY_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: ISSUE & HISTORY */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.5vw]">
          <h3 className="text-[1vw] font-bold text-gray-700 mb-[1vw] flex items-center gap-[0.5vw] border-b border-gray-100 pb-[0.5vw]">
            <AlertCircle className="w-[1.2vw] h-[1.2vw] text-blue-500" /> Issue
            Details
          </h3>
          <div className="grid grid-cols-4 gap-[1.5vw]">
            <div className="flex flex-col gap-[0.3vw] col-span-2">
              <label className="font-semibold text-gray-600">
                Call Description / Fault
              </label>
              <textarea
                rows="2"
                name="callDescription"
                value={formData.callDescription}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none resize-none"
                placeholder="Describe the issue..."
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Error Code</label>
              <input
                name="errorCode"
                value={formData.errorCode}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Photo/Video Received?
              </label>
              <select
                name="mediaReceived"
                value={formData.mediaReceived}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* PREVIOUS HISTORY - Now Dynamic */}
            <div className="flex flex-col gap-[0.3vw] col-span-4">
              <label className="font-semibold text-gray-600 flex items-center gap-[0.5vw]">
                <History className="w-[1vw] h-[1vw]" /> Previous Service
                History
                {productHistory.length > 0 && (
                  <span className="text-[0.7vw] bg-blue-100 text-blue-700 px-[0.6vw] py-[0.2vw] rounded-full font-bold">
                    {productHistory.length} Record
                    {productHistory.length > 1 ? "s" : ""} Found
                  </span>
                )}
              </label>
              <div className="border border-gray-300 bg-gray-50 rounded-[0.4vw] p-[0.8vw] max-h-[12vw] overflow-y-auto">
                {productHistory.length > 0 ? (
                  <div className="space-y-[0.6vw]">
                    {productHistory.map((call, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 rounded-[0.4vw] p-[0.6vw] shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-[0.3vw]">
                          <div className="flex items-center gap-[0.5vw]">
                            <span className="font-mono text-[0.75vw] font-bold text-blue-600">
                              {call.callNumber}
                            </span>
                            <span
                              className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded-[0.2vw] font-semibold ${getPriorityColor(call.priority)}`}
                            >
                              {call.priority}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[0.7vw] text-gray-500">
                              {new Date(call.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[0.65vw] text-gray-400">
                              Created: {new Date(call.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="text-[0.75vw] text-gray-700">
                          <strong>Issue:</strong>{" "}
                          {call.callDescription || "N/A"}
                        </div>
                        {call.errorCode && (
                          <div className="text-[0.7vw] text-gray-600 mt-[0.2vw]">
                            <strong>Error Code:</strong> {call.errorCode}
                          </div>
                        )}
                        {call.assignedEngineer && (
                          <div className="text-[0.7vw] text-gray-600">
                            <strong>Engineer:</strong> {call.assignedEngineer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-[1vw] text-[0.8vw]">
                    {formData.serialNumber
                      ? "No previous service calls found for this serial number"
                      : "Enter a serial number to view service history"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: ASSIGNMENT */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.5vw]">
          <h3 className="text-[1vw] font-bold text-gray-700 mb-[1vw] flex items-center gap-[0.5vw] border-b border-gray-100 pb-[0.5vw]">
            <CheckCircle className="w-[1.2vw] h-[1.2vw] text-blue-500" />{" "}
            Assignment
          </h3>
          <div className="grid grid-cols-4 gap-[1.5vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Assigned Engineer
              </label>
              <input
                name="assignedEngineer"
                value={formData.assignedEngineer}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
                placeholder="Manual Entry"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Assignment Date & Time
              </label>
              <input
                type="datetime-local"
                name="assignmentDate"
                value={formData.assignmentDate}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Expected Response Time
              </label>
              <input
                type="datetime-local"
                name="expectedResponse"
                value={formData.expectedResponse}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Acknowledgement Sent?
              </label>
              <select
                name="ackSent"
                value={formData.ackSent}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">
                Sent By (SAS)
              </label>
              <input
                name="sentBy"
                value={formData.sentBy}
                readOnly
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-gray-100 text-gray-500"
              />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Timestamp</label>
              <input
                name="timestamp"
                value={formData.timestamp}
                readOnly
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-gray-100 text-gray-500 text-[0.75vw]"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-[1vw] pt-[0.5vw] pr-[1vw] sticky bottom-0 bg-gray-100 ">
          <button
            type="button"
            onClick={resetForm}
            className="px-[1.5vw] py-[0.8vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold transition-all"
          >
            <X className="w-[1.2vw] h-[1.2vw]" /> Clear Form
          </button>
          <button
            type="submit"
            className="px-[1.5vw] py-[0.6vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md transition-all"
          >
            <Save className="w-[1.2vw] h-[1.2vw]" /> Save Service Call
          </button>
        </div>
      </form>

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[45vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-[1vw] py-[0.7vw] border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-[1.2vw] font-semibold text-gray-900">
                Add New Customer & Items
              </h2>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-gray-400 hover:text-red-500 cursor-pointer"
              >
                <X className="w-[1.2vw] h-[1.2vw]" />
              </button>
            </div>

            <form
              onSubmit={handleAddCustomerSubmit}
              className="p-[1vw] flex flex-col gap-[1vw] overflow-y-auto"
            >
              {/* Party Details */}
              <div className="bg-gray-50 p-[1vw] rounded-[0.5vw] border border-gray-200">
                <h3 className="text-[0.9vw] font-bold text-gray-700 mb-[0.5vw]">
                  Party Details
                </h3>
                <div className="grid grid-cols-2 gap-[1.5vw] mb-[0.5vw]">
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      Party Code *
                    </label>
                    <input
                      required
                      value={newCustomer.partyCode}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          partyCode: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="e.g. CUS-001"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">
                      Party Type
                    </label>
                    <select
                      value={newCustomer.partyType}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          partyType: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white outline-none"
                    >
                      {partyTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-[0.4vw]">
                  <label className="text-gray-600 font-medium">
                    Party Description *
                  </label>
                  <input
                    required
                    value={newCustomer.partyDescription}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        partyDescription: e.target.value,
                      })
                    }
                    className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                    placeholder="Company Name"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white border border-gray-200 rounded-[0.5vw] p-[1vw]">
                <div className="flex justify-between items-center mb-[0.5vw]">
                  <h3 className="text-[0.9vw] font-bold text-gray-700">
                    Product Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-blue-600 hover:text-blue-800 text-[0.8vw] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-[1vw] h-[1vw]" /> Add Item
                  </button>
                </div>

                <div className="space-y-[0.8vw]">
                  {newCustomer.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-[0.5vw] items-center border-b border-gray-100 pb-[0.5vw] last:border-0"
                    >
                      <div className="flex-1 flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Item Code
                          </label>
                        )}
                        <input
                          required
                          value={item.itemCode}
                          onChange={(e) =>
                            handleItemChange(idx, "itemCode", e.target.value)
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Code"
                        />
                      </div>
                      <div className="flex-[2] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Description
                          </label>
                        )}
                        <input
                          required
                          value={item.itemDescription}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "itemDescription",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Description"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={newCustomer.items.length === 1}
                          className={`text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer ${idx === 0 ? "mt-[1.3vw]" : ""}`}
                        >
                          <MinusCircle className="w-[1.2vw] h-[1.2vw]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-[1vw] pt-[0.5vw]">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-[2vw] py-[0.6vw] border rounded-[0.4vw] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[2vw] py-[0.6vw] bg-green-600 text-white rounded-[0.4vw] hover:bg-green-700 flex items-center gap-[0.5vw] cursor-pointer"
                >
                  <UserPlus className="w-[1vw] h-[1vw]" /> Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCallEntry;