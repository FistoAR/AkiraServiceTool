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
  Trash2,
  AlertTriangle,
  Edit3,
  Plus,
  Settings,
} from "lucide-react";

const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const SERVICE_CALLS_KEY = "service_calls_v2";
const PARTY_TYPES_KEY = "party_types_v1";
const EMPLOYEES_KEY = "employees";
const ESCALATION_KEY = "escalation_queue_v1";
const MODES_KEY = "call_modes_v1";
const CATEGORIES_KEY = "call_categories_v1";

const DEFAULT_MODES = ["Phone", "Email", "WhatsApp", "Portal"];
const DEFAULT_CATEGORIES = ["Phone Support", "Field Visit", "In-house Repair"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const WARRANTY_STATUS = ["In Warranty", "Out of Warranty"];

const ESCALATION_FLOW = ["Support Engineer", "Service Engineer", "R&D"];
const ESCALATION_TIMEOUT_MS = 1 * 60 * 1000;

// ─── Reusable Config Manager Modal ───
const ConfigManagerModal = ({ title, icon: Icon, items, onClose, onSave }) => {
  const [localItems, setLocalItems] = useState([...items]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const inputRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    if (editingIndex !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingIndex]);

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (
      localItems.some((item) => item.toLowerCase() === trimmed.toLowerCase())
    ) {
      alert(`"${trimmed}" already exists!`);
      return;
    }
    setLocalItems([...localItems, trimmed]);
    setNewValue("");
    if (inputRef.current) inputRef.current.focus();
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditValue(localItems[index]);
    setDeleteConfirm(null);
  };

  const handleSaveEdit = (index) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (
      localItems.some(
        (item, i) =>
          i !== index && item.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      alert(`"${trimmed}" already exists!`);
      return;
    }
    const updated = [...localItems];
    updated[index] = trimmed;
    setLocalItems(updated);
    setEditingIndex(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleDelete = (index) => {
    if (localItems.length <= 1) {
      alert("You must have at least one item.");
      return;
    }
    setLocalItems(localItems.filter((_, i) => i !== index));
    setDeleteConfirm(null);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditValue("");
    }
  };

  const handleSaveAll = () => {
    if (localItems.length === 0) {
      alert("You must have at least one item.");
      return;
    }
    onSave(localItems);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleEditKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(index);
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[32vw] rounded-[0.6vw] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-[1.2vw] py-[0.8vw] border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-[1vw] font-semibold text-gray-800 flex items-center gap-[0.5vw]">
            <Icon className="w-[1.1vw] h-[1.1vw] text-gray-600" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        {/* Add New */}
        <div className="px-[1.2vw] pt-[1vw] pb-[0.6vw]">
          <label className="text-[0.8vw] font-semibold text-gray-600 mb-[0.4vw] block">
            Add New
          </label>
          <div className="flex gap-[0.5vw]">
            <input
              ref={inputRef}
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter new ${title.toLowerCase().replace("manage ", "")}...`}
              className="flex-1 border border-gray-300 rounded-[0.4vw] px-[0.7vw] py-[0.55vw] text-[0.85vw] text-gray-800 outline-none focus:border-gray-400 focus:ring-1 ring-gray-200 bg-white placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newValue.trim()}
              className="px-[0.9vw] py-[0.55vw] bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-[0.4vw] flex items-center gap-[0.3vw] cursor-pointer transition-colors text-[0.8vw] font-medium"
            >
              <Plus className="w-[0.9vw] h-[0.9vw]" />
              Add
            </button>
          </div>
        </div>

        {/* List */}
        <div className="px-[1.2vw] pb-[0.8vw] flex-1 overflow-y-auto">
          <div className="text-[0.75vw] text-gray-500 mb-[0.5vw] font-medium">
            {localItems.length} item{localItems.length !== 1 ? "s" : ""}
          </div>
          <div className="space-y-[0.4vw]">
            {localItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-[0.5vw] rounded-[0.4vw] border transition-all ${
                  editingIndex === idx
                    ? "border-gray-400 bg-gray-50 p-[0.5vw]"
                    : deleteConfirm === idx
                      ? "border-red-200 bg-red-50 p-[0.5vw]"
                      : "border-gray-200 bg-white p-[0.5vw] hover:border-gray-300"
                }`}
              >
                {editingIndex === idx ? (
                  <>
                    <input
                      ref={editRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, idx)}
                      className="flex-1 border border-gray-300 rounded-[0.3vw] px-[0.6vw] py-[0.4vw] text-[0.85vw] text-gray-800 outline-none focus:border-gray-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(idx)}
                      disabled={!editValue.trim()}
                      className="text-gray-700 hover:text-gray-900 disabled:text-gray-300 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-gray-200 transition-colors"
                      title="Save"
                    >
                      <CheckCircle className="w-[1vw] h-[1vw]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-gray-200 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-[1vw] h-[1vw]" />
                    </button>
                  </>
                ) : deleteConfirm === idx ? (
                  <>
                    <div className="flex-1 text-[0.8vw] text-red-700 font-medium">
                      Delete "{item}"?
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="text-[0.75vw] text-white bg-red-600 hover:bg-red-700 px-[0.6vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer transition-colors font-medium"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      className="text-[0.75vw] text-gray-600 hover:text-gray-800 px-[0.6vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer border border-gray-300 hover:bg-gray-100 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-100 flex items-center justify-center text-[0.65vw] text-gray-500 font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="flex-1 text-[0.85vw] text-gray-800 font-medium">
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(idx)}
                      className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-[0.85vw] h-[0.85vw]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirm(idx);
                        setEditingIndex(null);
                      }}
                      disabled={localItems.length <= 1}
                      className="text-gray-400 hover:text-red-600 disabled:text-gray-200 disabled:cursor-not-allowed cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.2vw] py-[0.8vw] border-t border-gray-200 flex justify-end gap-[0.7vw] bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] py-[0.5vw] border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-[0.4vw] cursor-pointer text-[0.85vw] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-[1.2vw] py-[0.5vw] bg-gray-800 hover:bg-gray-900 text-white rounded-[0.4vw] cursor-pointer flex items-center gap-[0.4vw] text-[0.85vw] font-medium transition-colors"
          >
            <Save className="w-[0.9vw] h-[0.9vw]" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const ServiceCallEntry = () => {
  const [customerDb, setCustomerDb] = useState([]);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modes, setModes] = useState([]);
  const [categories, setCategories] = useState([]);

  const [showModesManager, setShowModesManager] = useState(false);
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);

  const [formData, setFormData] = useState({
    callNumber: "",
    dateTime: "",
    mode: "",
    priority: "Medium",
    category: "",
    customerType: "All",
    partyCode: "",
    customerName: "",
    contactPerson: "",
    contactNumber: "",
    emailId: "",
    location: "",
    products: [
      {
        itemCode: "",
        productSegment: "",
        productModel: "",
        serialNumber: "",
        dateOfSupply: "",
        warrantyPeriodDays: "",
        warrantyStatus: "In Warranty",
      },
    ],
    callDescription: "",
    errorCode: "",
    mediaReceived: "No",
    previousHistory: "",
    assignedEngineer: "",
    assignedEngineerName: "",
    assignedDepartment: "",
    assignmentDate: "",
    expectedResponse: "",
    ackSent: "No",
    sentBy: "Auto",
    timestamp: "",
    status: "Open",
    escalationLevel: 0,
    escalationHistory: [],
    resolvedAt: null,
    assignedAt: null,
  });

  const [showCustSearch, setShowCustSearch] = useState(false);
  const [showProdSearch, setShowProdSearch] = useState({});
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
  const [engineerSearch, setEngineerSearch] = useState("");
  const custInputRef = useRef(null);
  const prodInputRefs = useRef({});
  const engineerRef = useRef(null);

  const [productHistory, setProductHistory] = useState([]);
  const [customerHistory, setCustomerHistory] = useState([]);

  const [newCustomer, setNewCustomer] = useState({
    partyCode: "",
    partyDescription: "",
    partyType: "",
    items: [
      {
        productSegment: "",
        itemCode: "",
        itemDescription: "",
        warrantyPeriodDays: "",
      },
    ],
  });

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // --- Load modes and categories ---
  useEffect(() => {
    const storedModes = localStorage.getItem(MODES_KEY);
    if (storedModes) {
      try {
        const parsed = JSON.parse(storedModes);
        setModes(parsed);
      } catch {
        setModes(DEFAULT_MODES);
        localStorage.setItem(MODES_KEY, JSON.stringify(DEFAULT_MODES));
      }
    } else {
      setModes(DEFAULT_MODES);
      localStorage.setItem(MODES_KEY, JSON.stringify(DEFAULT_MODES));
    }

    const storedCategories = localStorage.getItem(CATEGORIES_KEY);
    if (storedCategories) {
      try {
        const parsed = JSON.parse(storedCategories);
        setCategories(parsed);
      } catch {
        setCategories(DEFAULT_CATEGORIES);
        localStorage.setItem(
          CATEGORIES_KEY,
          JSON.stringify(DEFAULT_CATEGORIES),
        );
      }
    } else {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    }
  }, []);

  // Set default mode/category when loaded
  useEffect(() => {
    if (modes.length > 0 && !formData.mode) {
      setFormData((prev) => ({ ...prev, mode: modes[0] }));
    }
  }, [modes]);

  useEffect(() => {
    if (categories.length > 0 && !formData.category) {
      setFormData((prev) => ({ ...prev, category: categories[0] }));
    }
  }, [categories]);

  // --- Load employees ---
  useEffect(() => {
    const storedEmployees = localStorage.getItem(EMPLOYEES_KEY);
    if (storedEmployees) {
      try {
        setEmployees(JSON.parse(storedEmployees));
      } catch (e) {
        console.error("Error loading employees", e);
      }
    }
  }, []);

  const supportEngineers = useMemo(() => {
    return employees.filter((emp) => emp.department === "Support Engineer");
  }, [employees]);

  const filteredEngineers = useMemo(() => {
    return supportEngineers.filter(
      (eng) =>
        eng.name.toLowerCase().includes(engineerSearch.toLowerCase()) ||
        eng.userId.toLowerCase().includes(engineerSearch.toLowerCase()),
    );
  }, [supportEngineers, engineerSearch]);

  useEffect(() => {
    const storedTypes = localStorage.getItem(PARTY_TYPES_KEY);
    if (storedTypes) {
      try {
        setPartyTypes(JSON.parse(storedTypes));
      } catch {
        const defaultTypes = [
          { id: 1, name: "OEM" },
          { id: 2, name: "End Customer" },
        ];
        setPartyTypes(defaultTypes);
      }
    } else {
      const defaultTypes = [
        { id: 1, name: "OEM" },
        { id: 2, name: "End Customer" },
      ];
      setPartyTypes(defaultTypes);
      localStorage.setItem(PARTY_TYPES_KEY, JSON.stringify(defaultTypes));
    }

    const storedDb = localStorage.getItem(CUSTOMER_DB_KEY);
    if (storedDb) {
      try {
        setCustomerDb(JSON.parse(storedDb));
      } catch (e) {
        console.error("Error loading DB", e);
      }
    }

    const storedCalls = localStorage.getItem(SERVICE_CALLS_KEY);
    if (storedCalls) {
      try {
        setServiceCalls(JSON.parse(storedCalls));
      } catch (e) {
        console.error("Error loading service calls", e);
      }
    }

    initializeForm();

    const handleClickOutside = (e) => {
      if (custInputRef.current && !custInputRef.current.contains(e.target))
        setShowCustSearch(false);
      if (engineerRef.current && !engineerRef.current.contains(e.target))
        setShowEngineerDropdown(false);
      Object.keys(prodInputRefs.current).forEach((key) => {
        if (
          prodInputRefs.current[key] &&
          !prodInputRefs.current[key].contains(e.target)
        ) {
          setShowProdSearch((prev) => ({ ...prev, [key]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (partyTypes.length > 0 && !newCustomer.partyType) {
      setNewCustomer((prev) => ({ ...prev, partyType: partyTypes[0].name }));
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

  const filteredCustomersByType = useMemo(() => {
    const map = new Map();
    customerDb.forEach((item) => {
      if (
        formData.customerType === "All" ||
        item.partyType === formData.customerType
      ) {
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

  const availableProducts = useMemo(() => {
    if (!formData.partyCode) return [];
    const allProducts = customerDb.filter(
      (item) => item.partyCode === formData.partyCode,
    );
    const selectedItemCodes = new Set(
      formData.products
        .map((p) => p.itemCode)
        .filter((code) => code && code.trim() !== ""),
    );
    return allProducts.filter(
      (product) => !selectedItemCodes.has(product.itemCode),
    );
  }, [customerDb, formData.partyCode, formData.products]);

  useEffect(() => {
    if (formData.partyCode) {
      const history = serviceCalls.filter(
        (call) => call.partyCode === formData.partyCode,
      );
      setCustomerHistory(
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      );
    } else {
      setCustomerHistory([]);
    }
  }, [formData.partyCode, serviceCalls]);

  useEffect(() => {
    const serialNumbers = formData.products
      .map((p) => p.serialNumber)
      .filter((s) => s && s.trim() !== "");
    if (serialNumbers.length > 0) {
      const history = serviceCalls.filter((call) => {
        if (call.products && Array.isArray(call.products)) {
          return call.products.some(
            (p) =>
              p.serialNumber &&
              serialNumbers.some(
                (sn) => sn.toLowerCase() === p.serialNumber.toLowerCase(),
              ),
          );
        }
        if (call.serialNumber) {
          return serialNumbers.some(
            (sn) => sn.toLowerCase() === call.serialNumber.toLowerCase(),
          );
        }
        return false;
      });
      setProductHistory(history);
    } else {
      setProductHistory([]);
    }
  }, [formData.products, serviceCalls]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectCustomer = (code, name, type) => {
  // Auto-load location from customer DB (state + districtCity)
  const customerRows = customerDb.filter((item) => item.partyCode === code);
  const firstRow = customerRows[0];
  const autoLocation = firstRow
    ? [firstRow.districtCity, firstRow.state].filter(Boolean).join(", ")
    : "";

  setFormData((prev) => ({
    ...prev,
    partyCode: code,
    customerName: name,
    customerType: type,
    location: autoLocation || prev.location,
    products: [
      {
        itemCode: "",
        productSegment: "",
        productModel: "",
        serialNumber: "",
        dateOfSupply: "",
        warrantyPeriodDays: "",
        warrantyStatus: "In Warranty",
      },
    ],
  }));
  setShowCustSearch(false);
};


  const selectEngineer = (engineer) => {
    setFormData((prev) => ({
      ...prev,
      assignedEngineer: engineer.userId,
      assignedEngineerName: engineer.name,
      assignedDepartment: engineer.department,
    }));
    setEngineerSearch("");
    setShowEngineerDropdown(false);
  };

  const handleAddProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          itemCode: "",
          productSegment: "",
          productModel: "",
          serialNumber: "",
          dateOfSupply: "",
          warrantyPeriodDays: "",
          warrantyStatus: "In Warranty",
        },
      ],
    }));
  };

  const handleRemoveProduct = (index) => {
    if (formData.products.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  const handleProductChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((product, i) =>
        i === index ? { ...product, [field]: value } : product,
      ),
    }));
  };

  const selectProduct = (index, dbProduct) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((product, i) =>
        i === index
          ? {
              ...product,
              itemCode: dbProduct.itemCode,
              productSegment: dbProduct.productSegment || "",
              productModel: dbProduct.itemDescription,
              warrantyPeriodDays: dbProduct.warrantyPeriodDays || "",
            }
          : product,
      ),
    }));
    setShowProdSearch((prev) => ({ ...prev, [index]: false }));
  };

  const handleSaveModes = (updatedModes) => {
    setModes(updatedModes);
    localStorage.setItem(MODES_KEY, JSON.stringify(updatedModes));
    // If current selection no longer exists, reset to first
    if (!updatedModes.includes(formData.mode)) {
      setFormData((prev) => ({ ...prev, mode: updatedModes[0] || "" }));
    }
  };

  const handleSaveCategories = (updatedCategories) => {
    setCategories(updatedCategories);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));
    if (!updatedCategories.includes(formData.category)) {
      setFormData((prev) => ({
        ...prev,
        category: updatedCategories[0] || "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.assignedEngineer) {
      alert("Please assign a Support Engineer before saving.");
      return;
    }

    const now = new Date();

    const newCall = {
      ...formData,
      id: Date.now(),
      status: "Assigned",
      assignedAt: now.toISOString(),
      escalationLevel: 0,
      escalationHistory: [
        {
          level: 0,
          department: "Support Engineer",
          engineerId: formData.assignedEngineer,
          engineerName: formData.assignedEngineerName,
          assignedAt: now.toISOString(),
          deadline: new Date(
            now.getTime() + ESCALATION_TIMEOUT_MS,
          ).toISOString(),
          status: "Pending",
        },
      ],
    };

    const updatedCalls = [newCall, ...serviceCalls];
    setServiceCalls(updatedCalls);
    localStorage.setItem(SERVICE_CALLS_KEY, JSON.stringify(updatedCalls));

    const existingQueue = JSON.parse(
      localStorage.getItem(ESCALATION_KEY) || "[]",
    );
    const escalationEntry = {
      callId: newCall.id,
      callNumber: newCall.callNumber,
      assignedAt: now.toISOString(),
      deadline: new Date(now.getTime() + ESCALATION_TIMEOUT_MS).toISOString(),
      currentLevel: 0,
      currentDepartment: "Support Engineer",
      currentEngineerId: formData.assignedEngineer,
      currentEngineerName: formData.assignedEngineerName,
      status: "Pending",
      customerName: formData.customerName,
      partyCode: formData.partyCode,
      priority: formData.priority,
      category: formData.category,
      callDescription: formData.callDescription,
      errorCode: formData.errorCode,
      products: formData.products,
      escalationHistory: newCall.escalationHistory,
    };

    existingQueue.push(escalationEntry);
    localStorage.setItem(ESCALATION_KEY, JSON.stringify(existingQueue));

    alert(
      `Service Call ${formData.callNumber} saved and assigned to ${formData.assignedEngineerName} (Support Engineer).\n\nAuto-escalation will trigger if not resolved.`,
    );

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      callNumber: "",
      dateTime: "",
      mode: modes[0] || "Phone",
      priority: "Medium",
      category: categories[0] || "Phone Support",
      customerType: "All",
      partyCode: "",
      customerName: "",
      contactPerson: "",
      contactNumber: "",
      emailId: "",
      location: "",
      products: [
        {
          itemCode: "",
          productSegment: "",
          productModel: "",
          serialNumber: "",
          dateOfSupply: "",
          warrantyPeriodDays: "",
          warrantyStatus: "In Warranty",
        },
      ],
      callDescription: "",
      errorCode: "",
      mediaReceived: "No",
      previousHistory: "",
      assignedEngineer: "",
      assignedEngineerName: "",
      assignedDepartment: "",
      assignmentDate: "",
      expectedResponse: "",
      ackSent: "No",
      sentBy: "Auto",
      timestamp: "",
      status: "Open",
      escalationLevel: 0,
      escalationHistory: [],
      resolvedAt: null,
      assignedAt: null,
    });
    setProductHistory([]);
    setEngineerSearch("");
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

  const getTypeColor = (typeName) => {
    const index = partyTypes.findIndex((t) => t.name === typeName);
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-orange-100 text-orange-700",
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
    ];
    return colors[index % colors.length] || "bg-gray-100 text-gray-700";
  };

  const cleanStr = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const handleAddItemRow = () => {
    setNewCustomer({
      ...newCustomer,
      items: [
        ...newCustomer.items,
        {
          productSegment: "",
          itemCode: "",
          itemDescription: "",
          warrantyPeriodDays: "",
        },
      ],
    });
  };

  const handleRemoveItemRow = (index) => {
    if (newCustomer.items.length === 1) return;
    setNewCustomer({
      ...newCustomer,
      items: newCustomer.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = newCustomer.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    setNewCustomer({ ...newCustomer, items: updatedItems });
  };

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    const duplicateItems = newCustomer.items.filter((newItem) =>
      customerDb.some(
        (d) => cleanStr(d.itemCode) === cleanStr(newItem.itemCode),
      ),
    );
    if (duplicateItems.length > 0) {
      alert(`Item Code "${duplicateItems[0].itemCode}" already exists!`);
      return;
    }

    const newRows = newCustomer.items.map((item) => ({
      partyCode: newCustomer.partyCode,
      partyDescription: newCustomer.partyDescription,
      partyType: newCustomer.partyType,
      productSegment: item.productSegment,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      warrantyPeriodDays: item.warrantyPeriodDays,
    }));

    const updatedDb = [...newRows, ...customerDb].sort((a, b) =>
      a.partyCode.localeCompare(b.partyCode),
    );
    setCustomerDb(updatedDb);
    localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updatedDb));

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
      items: [
        {
          productSegment: "",
          itemCode: "",
          itemDescription: "",
          warrantyPeriodDays: "",
        },
      ],
    });
  };

  const openAddCustomerModal = () => {
    setNewCustomer({
      partyCode: "",
      partyDescription: formData.customerName || "",
      partyType:
        formData.customerType ||
        (partyTypes.length > 0 ? partyTypes[0].name : ""),
      items: [
        {
          productSegment: "",
          itemCode: "",
          itemDescription: "",
          warrantyPeriodDays: "",
        },
      ],
    });
    setShowAddCustomerModal(true);
  };

  return (
    <div className="w-full pr-[0.4vw] font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[1.5vw]">
        {/* SECTION 1: CALL DETAILS */}
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

            {/* Mode of Call with Settings button */}
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600 flex items-center justify-between">
                Mode of Call
                <button
                  type="button"
                  onClick={() => setShowModesManager(true)}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.2vw] rounded-[0.3vw] hover:bg-gray-100 transition-colors"
                  title="Manage Modes"
                >
                  <Settings className="w-[0.85vw] h-[0.85vw]" />
                </button>
              </label>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none"
              >
                {modes.map((m) => (
                  <option key={m}>{m}</option>
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
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Call Category with Settings button */}
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600 flex items-center justify-between">
                Call Category
                <button
                  type="button"
                  onClick={() => setShowCategoriesManager(true)}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.2vw] rounded-[0.3vw] hover:bg-gray-100 transition-colors"
                  title="Manage Categories"
                >
                  <Settings className="w-[0.85vw] h-[0.85vw]" />
                </button>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: CUSTOMER INFORMATION */}
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
                    products: [
                      {
                        itemCode: "",
                        productSegment: "",
                        productModel: "",
                        serialNumber: "",
                        dateOfSupply: "",
                        warrantyPeriodDays: "",
                        warrantyStatus: "In Warranty",
                      },
                    ],
                  });
                }}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
              >
                <option value="All">All Types</option>
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
                Customer Name
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
                      setFormData({
                        ...formData,
                        customerName: e.target.value,
                      });
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
                  className="flex items-center gap-[0.3vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.8vw] rounded-[0.4vw] cursor-pointer whitespace-nowrap"
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
                        onClick={() =>
                          selectCustomer(cust.code, cust.name, cust.type)
                        }
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
                      No customers found
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

            {formData.partyCode && (
              <div className="flex flex-col gap-[0.3vw] col-span-4">
                <label className="font-semibold text-gray-600 flex items-center gap-[0.5vw]">
                  <History className="w-[1vw] h-[1vw]" /> Customer History
                  {customerHistory.length > 0 && (
                    <span className="text-[0.7vw] bg-purple-100 text-purple-700 px-[0.6vw] py-[0.2vw] rounded-full font-bold">
                      {customerHistory.length} Call
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
                          className="bg-white border border-purple-200 rounded-[0.4vw] p-[0.7vw] shadow-sm"
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
                            </div>
                            <span className="text-[0.7vw] text-gray-700 font-semibold flex items-center gap-[0.3vw]">
                              <Clock className="w-[0.8vw] h-[0.8vw]" />
                              {new Date(call.dateTime).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          <div className="text-[0.75vw] text-gray-700">
                            <strong>Issue:</strong>{" "}
                            {call.callDescription || "N/A"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center py-[1vw]">
                      No previous calls
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: PRODUCT DETAILS */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.5vw]">
          <div className="flex justify-between items-center mb-[1vw]">
            <h3 className="text-[1vw] font-bold text-gray-700 flex items-center gap-[0.5vw] border-b border-gray-100 pb-[0.5vw]">
              <Package className="w-[1.2vw] h-[1.2vw] text-blue-500" /> Product
              Details
            </h3>
            <button
              type="button"
              onClick={handleAddProduct}
              disabled={!formData.partyCode}
              className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-[1vw] h-[1vw]" /> Add Product
            </button>
          </div>

          <div className="space-y-[1.2vw]">
            {formData.products.map((product, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-[0.5vw] p-[1vw] bg-gray-50 relative"
              >
                {formData.products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(idx)}
                    className="absolute top-[0.5vw] right-[0.5vw] text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-[1vw] h-[1vw]" />
                  </button>
                )}

                <div className="text-[0.85vw] font-bold text-gray-600 mb-[0.8vw] flex items-center gap-[0.4vw]">
                  <Smartphone className="w-[1vw] h-[1vw]" />
                  Product #{idx + 1}
                </div>

                <div className="grid grid-cols-4 gap-[1.2vw]">
                  <div
                    className="flex flex-col gap-[0.3vw] col-span-2 relative"
                    ref={(el) => (prodInputRefs.current[idx] = el)}
                  >
                    <label className="font-semibold text-gray-600 text-[0.8vw]">
                      Product Model
                    </label>
                    <div className="relative">
                      <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 z-10" />
                      <input
                        type="text"
                        value={product.productModel}
                        onChange={(e) =>
                          handleProductChange(
                            idx,
                            "productModel",
                            e.target.value,
                          )
                        }
                        onFocus={() => {
                          if (formData.partyCode)
                            setShowProdSearch((prev) => ({
                              ...prev,
                              [idx]: true,
                            }));
                        }}
                        disabled={!formData.partyCode}
                        placeholder={
                          !formData.partyCode
                            ? "Select Customer first"
                            : "Search product..."
                        }
                        className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {showProdSearch[idx] && formData.partyCode && (
                        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[15vw] overflow-y-auto z-20">
                          {availableProducts
                            .filter(
                              (p) =>
                                !product.productModel ||
                                p.itemDescription
                                  .toLowerCase()
                                  .includes(
                                    product.productModel.toLowerCase(),
                                  ) ||
                                p.itemCode
                                  .toLowerCase()
                                  .includes(product.productModel.toLowerCase()),
                            )
                            .map((prod, i) => (
                              <div
                                key={i}
                                onClick={() => selectProduct(idx, prod)}
                                className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                              >
                                <div className="font-medium text-gray-700 text-[0.8vw]">
                                  {prod.itemDescription}
                                </div>
                                <div className="text-[0.7vw] text-gray-500 flex gap-[1vw] mt-[0.2vw]">
                                  <span className="font-mono">
                                    Code: {prod.itemCode}
                                  </span>
                                  {prod.productSegment && (
                                    <span className="text-blue-600">
                                      • {prod.productSegment}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          {availableProducts.filter(
                            (p) =>
                              !product.productModel ||
                              p.itemDescription
                                .toLowerCase()
                                .includes(product.productModel.toLowerCase()) ||
                              p.itemCode
                                .toLowerCase()
                                .includes(product.productModel.toLowerCase()),
                          ).length === 0 && (
                            <div className="p-[1vw] text-gray-400 text-center text-[0.8vw]">
                              No products found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">
                      Product Segment
                    </label>
                    <input
                      value={product.productSegment}
                      onChange={(e) =>
                        handleProductChange(
                          idx,
                          "productSegment",
                          e.target.value,
                        )
                      }
                      className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">
                      Serial Number
                    </label>
                    <input
                      value={product.serialNumber}
                      onChange={(e) =>
                        handleProductChange(idx, "serialNumber", e.target.value)
                      }
                      className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">
                      Date of Supply
                    </label>
                    <input
                      type="date"
                      value={product.dateOfSupply}
                      onChange={(e) =>
                        handleProductChange(idx, "dateOfSupply", e.target.value)
                      }
                      className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">
                      Warranty (days)
                    </label>
                    <input
                      type="number"
                      value={product.warrantyPeriodDays}
                      onChange={(e) =>
                        handleProductChange(
                          idx,
                          "warrantyPeriodDays",
                          e.target.value,
                        )
                      }
                      className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">
                      Warranty Status
                    </label>
                    <select
                      value={product.warrantyStatus}
                      onChange={(e) =>
                        handleProductChange(
                          idx,
                          "warrantyStatus",
                          e.target.value,
                        )
                      }
                      className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none"
                    >
                      {WARRANTY_STATUS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: ISSUE DETAILS */}
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

            <div className="flex flex-col gap-[0.3vw] col-span-4">
              <label className="font-semibold text-gray-600 flex items-center gap-[0.5vw]">
                <History className="w-[1vw] h-[1vw]" /> Product History
                {productHistory.length > 0 && (
                  <span className="text-[0.7vw] bg-blue-100 text-blue-700 px-[0.6vw] py-[0.2vw] rounded-full font-bold">
                    {productHistory.length} Record
                    {productHistory.length > 1 ? "s" : ""}
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
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[0.75vw] font-bold text-blue-600">
                            {call.callNumber}
                          </span>
                          <span className="text-[0.7vw] text-gray-500">
                            {new Date(call.dateTime).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <div className="text-[0.75vw] text-gray-700 mt-[0.3vw]">
                          <strong>Issue:</strong>{" "}
                          {call.callDescription || "N/A"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-[1vw] text-[0.8vw]">
                    {formData.products.some((p) => p.serialNumber)
                      ? "No history found"
                      : "Enter serial numbers to view history"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: ASSIGNMENT & ESCALATION */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.5vw]">
          <h3 className="text-[1vw] font-bold text-gray-700 mb-[1vw] flex items-center gap-[0.5vw] border-b border-gray-100 pb-[0.5vw]">
            <CheckCircle className="w-[1.2vw] h-[1.2vw] text-blue-500" />{" "}
            Assignment & Escalation
          </h3>

          <div className="grid grid-cols-4 gap-[1.5vw]">
            <div
              className="flex flex-col gap-[0.3vw] col-span-2 relative"
              ref={engineerRef}
            >
              <label className="font-semibold text-gray-600 flex items-center gap-[0.5vw]">
                Assigned Engineer
                <span className="text-[0.7vw] text-gray-400 font-normal ml-auto">
                  ({supportEngineers.length} available)
                </span>
              </label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 z-10" />
                <input
                  type="text"
                  value={formData.assignedEngineerName || engineerSearch}
                  onChange={(e) => {
                    setEngineerSearch(e.target.value);
                    if (formData.assignedEngineerName) {
                      setFormData((prev) => ({
                        ...prev,
                        assignedEngineer: "",
                        assignedEngineerName: "",
                        assignedDepartment: "",
                      }));
                    }
                    setShowEngineerDropdown(true);
                  }}
                  onFocus={() => setShowEngineerDropdown(true)}
                  placeholder="Search Support Engineer..."
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] pr-[2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                />
                {formData.assignedEngineer && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        assignedEngineer: "",
                        assignedEngineerName: "",
                        assignedDepartment: "",
                      }));
                      setEngineerSearch("");
                    }}
                    className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                )}
              </div>

              {showEngineerDropdown && (
                <div className="absolute top-[calc(100%+0.3vw)] left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] max-h-[15vw] overflow-y-auto z-30">
                  {filteredEngineers.length > 0 ? (
                    filteredEngineers.map((eng, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectEngineer(eng)}
                        className={`p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center ${
                          formData.assignedEngineer === eng.userId
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-[0.6vw]">
                          <div className="w-[2vw] h-[2vw] rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-[0.7vw] font-bold">
                              {eng.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700 text-[0.85vw]">
                              {eng.name}
                            </span>
                            <span className="text-[0.7vw] text-gray-400 font-mono">
                              {eng.userId}
                            </span>
                          </div>
                        </div>
                        <span className="text-[0.7vw] bg-blue-100 text-blue-700 px-[0.5vw] py-[0.2vw] rounded-[0.3vw] font-medium">
                          {eng.department}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-[1vw] text-gray-400 text-center text-[0.8vw]">
                      No Support Engineers found
                    </div>
                  )}
                </div>
              )}
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
                Expected Response
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
              <label className="font-semibold text-gray-600">Ack Sent?</label>
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
                value={formData.timestamp}
                readOnly
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-gray-100 text-gray-500 text-[0.75vw]"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-[1vw] pt-[0.5vw] pr-[1vw] sticky bottom-0 bg-gray-100">
          <button
            type="button"
            onClick={resetForm}
            className="px-[1.5vw] py-[0.8vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold"
          >
            <X className="w-[1.2vw] h-[1.2vw]" /> Clear Form
          </button>
          <button
            type="submit"
            className="px-[1.5vw] py-[0.6vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md"
          >
            <Save className="w-[1.2vw] h-[1.2vw]" /> Save Service Call
          </button>
        </div>
      </form>

      {/* MODES MANAGER MODAL */}
      {showModesManager && (
        <ConfigManagerModal
          title="Manage Call Modes"
          icon={Phone}
          items={modes}
          onClose={() => setShowModesManager(false)}
          onSave={handleSaveModes}
        />
      )}

      {/* CATEGORIES MANAGER MODAL */}
      {showCategoriesManager && (
        <ConfigManagerModal
          title="Manage Call Categories"
          icon={FileText}
          items={categories}
          onClose={() => setShowCategoriesManager(false)}
          onSave={handleSaveCategories}
        />
      )}

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[55vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
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
                            Segment
                          </label>
                        )}
                        <input
                          required
                          value={item.productSegment}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "productSegment",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Segment"
                        />
                      </div>
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
                      <div className="flex-[0.7] flex flex-col gap-[0.3vw]">
                        {idx === 0 && (
                          <label className="text-[0.75vw] text-gray-500">
                            Warranty
                          </label>
                        )}
                        <input
                          required
                          type="number"
                          value={item.warrantyPeriodDays}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "warrantyPeriodDays",
                              e.target.value,
                            )
                          }
                          className="border p-[0.5vw] rounded-[0.3vw] text-[0.85vw]"
                          placeholder="Days"
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
