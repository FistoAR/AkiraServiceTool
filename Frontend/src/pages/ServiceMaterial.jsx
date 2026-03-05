import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  X,
  Check,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Edit3,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "service_material_v1";
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = ["Open", "Pending", "Closed"];
const TYPE_OPTIONS = ["Warranty", "Paid Work"];

const STATUS_COLORS = {
  Open: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Closed: "bg-gray-100 text-gray-600",
};

const TYPE_COLORS = {
  Warranty: "bg-blue-100 text-blue-700",
  "Paid Work": "bg-orange-100 text-orange-700",
};

const generateRefCustomer = () => {
  const d = new Date();
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CRF-${yyyymmdd}-${rand}`;
};
const generateRefInternal = () => {
  const d = new Date();
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `IRF-${yyyymmdd}-${rand}`;
};

const calcDelayDays = (expected, actual) => {
  if (!expected || !actual) return "";
  return Math.ceil((new Date(actual) - new Date(expected)) / (1000 * 60 * 60 * 24));
};

const emptyRow = () => ({
  id: Date.now() + Math.random(),
  refCustomer: generateRefCustomer(),
  refInternal: generateRefInternal(),
  customerName: "",
  customerCode: "",
  category: "",
  productCode: "",
  productDescription: "",
  qty: "",
  type: "Warranty",
  expectedDeliveryDate: "",
  actualDeliveryDate: "",
  delayDays: "",
  remarks: "",
  status: "Open",
});

// ── Register Form (full-page inline view) ─────────────────────────────────────
const RegisterForm = ({ initialData, customerDb, onSave, onBack }) => {
  const [formRow, setFormRow] = useState(initialData);
  const [custSearch, setCustSearch] = useState(initialData.customerName || "");
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [prodSearch, setProdSearch] = useState(initialData.productDescription || "");
  const [showProdDrop, setShowProdDrop] = useState(false);
  const custRef = useRef(null);
  const prodRef = useRef(null);
  const isEdit = !!initialData._editing;

  useEffect(() => {
    const handleClick = (e) => {
      if (custRef.current && !custRef.current.contains(e.target)) setShowCustDrop(false);
      if (prodRef.current && !prodRef.current.contains(e.target)) setShowProdDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    customerDb.forEach((item) => {
      if (!map.has(item.partyCode))
        map.set(item.partyCode, { code: item.partyCode, name: item.partyDescription });
    });
    return Array.from(map.values());
  }, [customerDb]);

  const productsForCustomer = useMemo(() => {
    if (!formRow.customerCode) return [];
    return customerDb.filter((i) => i.partyCode === formRow.customerCode);
  }, [customerDb, formRow.customerCode]);

  const handleFormChange = (field, value) => {
    setFormRow((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "expectedDeliveryDate" || field === "actualDeliveryDate") {
        const delay = calcDelayDays(
          field === "expectedDeliveryDate" ? value : prev.expectedDeliveryDate,
          field === "actualDeliveryDate" ? value : prev.actualDeliveryDate
        );
        updated.delayDays = delay === "" ? "" : delay;
      }
      return updated;
    });
  };

  const selectCustomer = (cust) => {
    setFormRow((prev) => ({ ...prev, customerCode: cust.code, customerName: cust.name, productCode: "", productDescription: "" }));
    setCustSearch(cust.name);
    setProdSearch("");
    setShowCustDrop(false);
  };

  const selectProduct = (prod) => {
    setFormRow((prev) => ({ ...prev, productCode: prod.itemCode, productDescription: prod.itemDescription, category: prod.productSegment || prev.category }));
    setProdSearch(prod.itemDescription);
    setShowProdDrop(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formRow, isEdit);
  };

  const delayDisplay =
    formRow.delayDays === "" ? "" :
    Number(formRow.delayDays) > 0 ? `+${formRow.delayDays} days (Late)` :
    Number(formRow.delayDays) < 0 ? `${formRow.delayDays} days (Early)` : "On Time";

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2 }}
      className="w-full font-sans text-[0.85vw] h-[90vh] overflow-y-auto "
    >
      {/* Page header */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[1vw]">
        <div className="flex items-center gap-[1vw]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[0.4vw] text-gray-500 hover:text-gray-800 border border-gray-300 bg-gray-50 hover:bg-gray-100 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-[1vw] h-[1vw]" />
            <span className="font-medium">Back</span>
          </button>
          <div className="h-[1.4vw] w-px bg-gray-200" />
          <h2 className="text-[1vw] font-bold text-gray-800">
            {isEdit ? "Edit Service Material" : "New Service Material Entry"}
          </h2>
        </div>
        <div className="flex items-center gap-[1.2vw] text-[0.78vw]">
          <div className="bg-blue-50 border border-blue-200 px-[0.8vw] py-[0.4vw] rounded-[0.3vw]">
            <span className="text-gray-500">Ref (Customer): </span>
            <span className="font-mono font-bold text-blue-600">{formRow.refCustomer}</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-[0.8vw] py-[0.4vw] rounded-[0.3vw]">
            <span className="text-gray-500">Ref (Internal): </span>
            <span className="font-mono font-bold text-gray-600">{formRow.refInternal}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[1vw]">
        {/* Customer Details */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100">
            Customer Details
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.3vw] col-span-2 relative" ref={custRef}>
              <label className="font-semibold text-gray-600">Customer Name</label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                <input
                  type="text"
                  value={custSearch}
                  onChange={(e) => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                  onFocus={() => setShowCustDrop(true)}
                  placeholder="Search & select customer…"
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                />
              </div>
              {showCustDrop && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-30">
                  {uniqueCustomers
                    .filter((c) =>
                      c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
                      c.code.toLowerCase().includes(custSearch.toLowerCase())
                    )
                    .map((c, idx) => (
                      <div key={idx} onClick={() => selectCustomer(c)}
                        className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700">{c.name}</span>
                          <span className="text-[0.7vw] text-gray-400 font-mono">{c.code}</span>
                        </div>
                      </div>
                    ))}
                  {uniqueCustomers.filter((c) =>
                    c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
                    c.code.toLowerCase().includes(custSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="p-[1vw] text-gray-400 text-center">No customers found</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Customer Code</label>
              <input readOnly value={formRow.customerCode}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-gray-100 text-gray-500 cursor-not-allowed font-mono"
                placeholder="Auto-filled" />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Category</label>
              <input value={formRow.category} onChange={(e) => handleFormChange("category", e.target.value)}
                placeholder="e.g. Electronics"
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none" />
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100">
            Product Details
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.3vw] col-span-2 relative" ref={prodRef}>
              <label className="font-semibold text-gray-600">Product Description</label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => { setProdSearch(e.target.value); handleFormChange("productDescription", e.target.value); setShowProdDrop(true); }}
                  onFocus={() => { if (formRow.customerCode) setShowProdDrop(true); }}
                  disabled={!formRow.customerCode}
                  placeholder={!formRow.customerCode ? "Select customer first" : "Search product…"}
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {showProdDrop && formRow.customerCode && (
                  <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-30">
                    {productsForCustomer
                      .filter((p) =>
                        !prodSearch ||
                        p.itemDescription.toLowerCase().includes(prodSearch.toLowerCase()) ||
                        p.itemCode.toLowerCase().includes(prodSearch.toLowerCase())
                      )
                      .map((prod, i) => (
                        <div key={i} onClick={() => selectProduct(prod)}
                          className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                          <div className="font-medium text-gray-700">{prod.itemDescription}</div>
                          <div className="text-[0.7vw] text-gray-500 font-mono mt-[0.1vw]">
                            {prod.itemCode}{prod.productSegment && ` • ${prod.productSegment}`}
                          </div>
                        </div>
                      ))}
                    {productsForCustomer.filter((p) =>
                      !prodSearch ||
                      p.itemDescription.toLowerCase().includes(prodSearch.toLowerCase()) ||
                      p.itemCode.toLowerCase().includes(prodSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-[1vw] text-gray-400 text-center">No products found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Product Code</label>
              <input readOnly value={formRow.productCode}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-gray-100 text-gray-500 cursor-not-allowed font-mono"
                placeholder="Auto-filled" />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Qty</label>
              <input required type="number" min="1" value={formRow.qty}
                onChange={(e) => handleFormChange("qty", e.target.value)}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                placeholder="1" />
            </div>
          </div>
        </div>

        {/* Delivery & Status */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100">
            Delivery & Status
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Type (W/PW)</label>
              <select value={formRow.type} onChange={(e) => handleFormChange("type", e.target.value)}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-white outline-none">
                {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Expected Delivery Date</label>
              <input type="date" value={formRow.expectedDeliveryDate}
                onChange={(e) => handleFormChange("expectedDeliveryDate", e.target.value)}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none" />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Actual Delivery Date</label>
              <input type="date" value={formRow.actualDeliveryDate}
                onChange={(e) => handleFormChange("actualDeliveryDate", e.target.value)}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none" />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Delay in Days</label>
              <input readOnly value={delayDisplay}
                className={`border p-[0.6vw] rounded-[0.4vw] cursor-not-allowed font-semibold text-[0.8vw] ${
                  formRow.delayDays === "" ? "bg-gray-100 border-gray-300 text-gray-400" :
                  Number(formRow.delayDays) > 0 ? "bg-red-50 border-red-200 text-red-600" :
                  Number(formRow.delayDays) < 0 ? "bg-green-50 border-green-200 text-green-600" :
                  "bg-blue-50 border-blue-200 text-blue-600"
                }`}
                placeholder="Auto-calculated" />
            </div>

            <div className="flex flex-col gap-[0.3vw] col-span-3">
              <label className="font-semibold text-gray-600">Remarks (if any)</label>
              <input value={formRow.remarks} onChange={(e) => handleFormChange("remarks", e.target.value)}
                placeholder="Optional notes…"
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none" />
            </div>

            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Status</label>
              <select value={formRow.status} onChange={(e) => handleFormChange("status", e.target.value)}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-white outline-none">
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex justify-end gap-[1vw] sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw]">
          <button type="button" onClick={onBack}
            className="px-[1.5vw] py-[0.7vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold">
            <X className="w-[1vw] h-[1vw]" /> Cancel
          </button>
          <button type="submit"
            className="px-[1.5vw] py-[0.7vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md">
            <Save className="w-[1vw] h-[1vw]" /> {isEdit ? "Update Record" : "Save Record"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ServiceMaterial() {
  const [view, setView] = useState("table"); // "table" | "register"
  const [editingRow, setEditingRow] = useState(null);

  const [data, setData] = useState([]);
  const [customerDb, setCustomerDb] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { try { setData(JSON.parse(stored)); } catch {} }
    const cdb = localStorage.getItem(CUSTOMER_DB_KEY);
    if (cdb) { try { setCustomerDb(JSON.parse(cdb)); } catch {} }
  }, []);

  const save = (rows) => {
    setData(rows);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  };

  // Navigation
  const goToRegister = () => { setEditingRow(null); setView("register"); };
  const goToEdit = (row) => { setEditingRow({ ...row, _editing: true }); setView("register"); };
  const goToTable = () => { setEditingRow(null); setView("table"); };

  const handleSave = (formRow, isEdit) => {
    if (isEdit) save(data.map((r) => (r.id === formRow.id ? formRow : r)));
    else save([formRow, ...data]);
    setView("table");
  };

  // Table filtering
  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return data.filter((row) => {
      const matchSearch = !s ||
        row.customerName?.toLowerCase().includes(s) ||
        row.customerCode?.toLowerCase().includes(s) ||
        row.productCode?.toLowerCase().includes(s) ||
        row.refCustomer?.toLowerCase().includes(s) ||
        row.refInternal?.toLowerCase().includes(s);
      const matchStatus = filterStatus === "All" || row.status === filterStatus;
      const matchType = filterType === "All" || row.type === filterType;
      return matchSearch && matchStatus && matchType;
    });
  }, [data, searchTerm, filterStatus, filterType]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterType]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const isPageSelected = paginatedData.length > 0 && paginatedData.every((r) => selectedItems.has(r.id));

  const toggleSelect = (id) => {
    const s = new Set(selectedItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedItems(s);
  };
  const toggleSelectPage = () => {
    const s = new Set(selectedItems);
    if (isPageSelected) paginatedData.forEach((r) => s.delete(r.id));
    else paginatedData.forEach((r) => s.add(r.id));
    setSelectedItems(s);
  };
  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedItems.size} selected records?`)) {
      save(data.filter((r) => !selectedItems.has(r.id)));
      setSelectedItems(new Set());
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full font-sans text-[0.85vw] ">
      <AnimatePresence mode="wait">
        {/* ── Register / Edit Page ── */}
        {view === "register" ? (
          <RegisterForm
            key="register"
            initialData={editingRow || emptyRow()}
            customerDb={customerDb}
            onSave={handleSave}
            onBack={goToTable}
          />
        ) : (
          /* ── Table Page ── */
          <motion.div
            key="table"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[0.9vw]">
              <div className="relative w-[30vw]">
                <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
                <input type="text" placeholder="Search by customer, product, reference…"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-300 rounded-[0.8vw] focus:outline-none focus:border-gray-800" />
              </div>

              <div className="flex gap-[0.8vw] items-center">
                <AnimatePresence>
                  {selectedItems.size > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDelete}
                      className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-semibold">
                      <Trash2 className="w-[1vw] h-[1vw]" /> Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent font-medium text-gray-700 border border-gray-300 p-[0.4vw] rounded-[0.3vw] outline-none cursor-pointer h-[2.4vw]">
                  <option value="All">All Status</option>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>

                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent font-medium text-gray-700 border border-gray-300 p-[0.4vw] rounded-[0.3vw] outline-none cursor-pointer h-[2.4vw]">
                  <option value="All">All Types</option>
                  {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>

                <button onClick={goToRegister}
                  className="cursor-pointer flex items-center gap-[0.5vw] bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-[1vw] h-[2.4vw] rounded-[0.4vw]">
                  <Plus className="w-[1.2vw] h-[1.2vw]" /> Add
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 flex flex-col">
              <div className="overflow-y-auto max-h-[73vh] min-h-[73vh] w-full rounded-t-[0.6vw]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-[0.6vw] border-b border-r border-gray-200 w-[3%] text-center">
                        <button onClick={toggleSelectPage} className="flex items-center justify-center w-full cursor-pointer">
                          {isPageSelected
                            ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" />
                            : <Square className="w-[1.1vw] h-[1.1vw] text-gray-400" />}
                        </button>
                      </th>
                      {["S.No","Ref (Customer)","Ref (Internal)","Customer Name","Customer Code","Category","Product Code","Product Description","Qty","Type","Expected Delivery","Actual Delivery","Delay (days)","Remarks","Status",""].map((h) => (
                        <th key={h} className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row, i) => {
                        const sn = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                        const isSelected = selectedItems.has(row.id);
                        return (
                          <tr key={row.id} className={`transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                            <td className="p-[0.8vw] border-r border-gray-200 text-center">
                              <button onClick={() => toggleSelect(row.id)} className="flex items-center justify-center w-full cursor-pointer">
                                {isSelected
                                  ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" />
                                  : <Square className="w-[1.1vw] h-[1.1vw] text-gray-300 hover:text-gray-500" />}
                              </button>
                            </td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-gray-600 font-medium text-center">{sn}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 font-mono text-[0.78vw] text-blue-600">{row.refCustomer}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 font-mono text-[0.78vw] text-gray-600">{row.refInternal}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 font-semibold text-gray-800">{row.customerName || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-gray-600">{row.customerCode || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-gray-600">{row.category || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 font-mono text-gray-700">{row.productCode || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-gray-700 max-w-[12vw] truncate" title={row.productDescription}>{row.productDescription || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-center font-semibold text-gray-700">{row.qty || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200">
                              <span className={`px-[0.5vw] py-[0.2vw] rounded text-[0.72vw] font-medium ${TYPE_COLORS[row.type] || "bg-gray-100 text-gray-600"}`}>{row.type}</span>
                            </td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-gray-600 whitespace-nowrap">{row.expectedDeliveryDate || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-gray-600 whitespace-nowrap">{row.actualDeliveryDate || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-center">
                              {row.delayDays === "" ? "—" : (
                                <span className={`font-bold ${Number(row.delayDays) > 0 ? "text-red-600" : Number(row.delayDays) < 0 ? "text-green-600" : "text-gray-600"}`}>
                                  {Number(row.delayDays) > 0 ? `+${row.delayDays}` : row.delayDays}
                                </span>
                              )}
                            </td>
                            <td className="p-[0.8vw] border-r border-gray-200 text-gray-500 max-w-[10vw] truncate" title={row.remarks}>{row.remarks || "—"}</td>
                            <td className="p-[0.8vw] border-r border-gray-200">
                              <span className={`px-[0.5vw] py-[0.2vw] rounded text-[0.72vw] font-medium ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}>{row.status}</span>
                            </td>
                            <td className="p-[0.8vw] text-center">
                              <button onClick={() => goToEdit(row)}
                                className="text-gray-400 hover:text-blue-600 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-blue-50 transition-colors" title="Edit">
                                <Edit3 className="w-[1vw] h-[1vw]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={17} className="py-[4vw] text-center text-gray-400">No records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-blue-100 p-[0.6vw] bg-blue-50 flex justify-between items-center rounded-b-[0.6vw]">
                <div className="text-[0.8vw] text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-800">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span>
                  {" "}to{" "}
                  <span className="font-semibold text-gray-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span>
                  {" "}of{" "}
                  <span className="font-bold text-gray-800">{filteredData.length}</span> entries
                </div>
                <div className="flex items-center gap-[1.2vw]">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer">
                    <ChevronLeft className="w-[1vw] h-[1vw] text-gray-600" />
                  </button>
                  <div className="flex gap-[0.7vw]">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
                      if (pNum > totalPages) return null;
                      return (
                        <button key={pNum} onClick={() => setCurrentPage(pNum)}
                          className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                          {pNum}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
                    className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer">
                    <ChevronRight className="w-[1vw] h-[1vw] text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}