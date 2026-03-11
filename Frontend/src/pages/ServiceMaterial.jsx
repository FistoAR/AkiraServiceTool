import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, X, Trash2, Save, ChevronLeft, ChevronRight,
  CheckSquare, Square, Edit3, ArrowLeft, Plus, Clock,
  User, Package, AlertCircle, CheckCircle, History,
  ChevronDown, ChevronUp, ArrowRight, Activity,
  Shield, Wrench, HelpCircle, Send, MapPin, Bell,
  FileText, Eye, BarChart2, Settings, UserPlus,
  AlertTriangle, RefreshCw, Layers, Upload, Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Storage Keys ───────────────────────────────────────────────────────────────
const INWARD_KEY = "service_material_inward_v1";
const SMI_QUEUE_KEY = "smi_escalation_queue_v1";   // ← SMI-specific queue
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const EMPLOYEES_KEY = "employees";
const PARTY_TYPES_KEY = "party_types_v3";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const SUPPORT_REQ_KEY = "smi_support_requests_v1";
const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = ["Open", "Assigned", "In Progress", "Pending", "Closed", "Critical"];
const NATURE_OPTIONS = ["Repair", "Replacement", "Inspection", "Calibration", "Other"];
const WARRANTY_OPTIONS = ["In Warranty", "Out of Warranty"];
const RESOLUTION_TYPES = ["Fixed", "Replaced", "No Fault Found", "Partially Fixed", "Returned As Is"];

const STATUS_COLORS = {
  Open: "bg-blue-100 text-blue-700 border-blue-300",
  Assigned: "bg-purple-100 text-purple-700 border-purple-300",
  "In Progress": "bg-yellow-100 text-yellow-700 border-yellow-300",
  Pending: "bg-orange-100 text-orange-700 border-orange-300",
  Closed: "bg-green-100 text-green-700 border-green-300",
  Critical: "bg-red-100 text-red-700 border-red-300",
  Received: "bg-teal-100 text-teal-700 border-teal-300",
  Inspected: "bg-indigo-100 text-indigo-700 border-indigo-300",
  Rejected: "bg-red-100 text-red-700 border-red-300",
  Escalated: "bg-orange-100 text-orange-700 border-orange-300",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const lsLoad = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));

const genRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SMI-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const emptyProduct = () => ({
  _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productCode: "", productDescription: "", productSegment: "",
  serialNumber: "", qty: "1",
  warrantyStatus: "In Warranty",
  natureOfProblem: "Repair",
  symptomsObserved: "",
  rootCause: "",
  status: "Open",
  escalationLevel: 0,
  escalationHistory: [],
});

const emptyBase = () => ({
  customerName: "", customerCode: "", customerType: "",
  contactPerson: "", contactNumber: "", emailId: "", location: "",
  assignedTo: "", assignedToName: "", assignedDepartment: "",
  assignmentDate: new Date().toISOString().slice(0, 16),
  expectedClosureDate: "",
});

// Avatar
const AVATAR_COLORS = [
  "from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
  "from-green-400 to-green-600", "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600", "from-teal-400 to-teal-600",
];
const avatarColor = (name = "") => {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name = "") => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
const Avatar = ({ name, size = "md" }) => {
  const sz = { sm: "w-[1.4vw] h-[1.4vw] text-[0.52vw]", md: "w-[1.8vw] h-[1.8vw] text-[0.65vw]", lg: "w-[2.4vw] h-[2.4vw] text-[0.82vw]" };
  return (
    <div title={name} className={`rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-bold text-white flex-shrink-0 ${sz[size]}`}>
      {initials(name)}
    </div>
  );
};

// ── Duplicate Modal ────────────────────────────────────────────────────────────
const DuplicateModal = ({ onConfirm, onClose }) => {
  const [count, setCount] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-200 p-[1.8vw] w-[22vw]">
        <div className="flex items-center gap-[0.6vw] mb-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-100 flex items-center justify-center">
            <Copy className="w-[1.1vw] h-[1.1vw] text-blue-600" />
          </div>
          <div>
            <div className="text-[0.9vw] font-bold text-gray-800">Duplicate Product Row</div>
            <div className="text-[0.72vw] text-gray-500">How many copies do you need?</div>
          </div>
        </div>
        <div className="flex items-center gap-[0.8vw] mb-[1.4vw]">
          <button onClick={() => setCount(c => Math.max(1, c - 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.4vw] border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer">−</button>
          <input type="number" min="1" max="50" value={count} onChange={e => setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            className="flex-1 border border-gray-300 rounded-[0.4vw] p-[0.5vw] text-center text-[1vw] font-bold outline-none focus:border-blue-400" />
          <button onClick={() => setCount(c => Math.min(50, c + 1))}
            className="w-[2.4vw] h-[2.4vw] rounded-[0.4vw] border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold text-[1.1vw] flex items-center justify-center cursor-pointer">+</button>
        </div>
        <div className="text-[0.72vw] text-gray-400 mb-[1.2vw] bg-blue-50 rounded-[0.4vw] p-[0.6vw] border border-blue-100">
          This will add <strong>{count}</strong> copy{count > 1 ? "ies" : ""} of this product row.
        </div>
        <div className="flex gap-[0.6vw] justify-end">
          <button onClick={onClose} className="px-[1.2vw] py-[0.55vw] border border-gray-300 rounded-[0.4vw] text-[0.78vw] text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={() => { onConfirm(count); onClose(); }}
            className="px-[1.4vw] py-[0.55vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.4vw]">
            <Copy className="w-[0.85vw] h-[0.85vw]" />Add {count} {count > 1 ? "Copies" : "Copy"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Single Product Row ─────────────────────────────────────────────────────────
const ProductRow = ({ prod, idx, total, customerCode, customerDb, onUpdate, onRemove, onDuplicate, isEdit }) => {
  const [showProdDrop, setShowProdDrop] = useState(false);
  const [prodSearch, setProdSearch] = useState(prod.productDescription || "");
  const [expanded, setExpanded] = useState(!isEdit);
  const prodRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (prodRef.current && !prodRef.current.contains(e.target)) setShowProdDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const productsForCustomer = useMemo(() => {
    if (!customerCode) return [];
    const rows = Object.values(customerDb).flat();
    return rows.filter(r => r.partyCode === customerCode);
  }, [customerDb, customerCode]);

  const sp = (k, v) => onUpdate({ ...prod, [k]: v });

  const selectProduct = (p) => {
    onUpdate({ ...prod, productCode: p.itemCode, productDescription: p.itemDescription, productSegment: p.productSegment || "" });
    setProdSearch(p.itemDescription);
    setShowProdDrop(false);
  };

  const filteredProds = productsForCustomer.filter(p =>
    !prodSearch || p.itemDescription?.toLowerCase().includes(prodSearch.toLowerCase()) || p.itemCode?.toLowerCase().includes(prodSearch.toLowerCase())
  );

  return (
    <div className={`border rounded-[0.5vw] transition-all ${prod.status === "Critical" ? "border-red-300 bg-red-50/20" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center gap-[0.8vw] px-[1vw] py-[0.65vw] cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-center w-[1.8vw] h-[1.8vw] rounded-full bg-blue-600 text-white text-[0.7vw] font-bold flex-shrink-0">{idx + 1}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.82vw] font-semibold text-gray-800 truncate">
            {prod.productDescription || <span className="text-gray-400 font-normal">Product {idx + 1} — not selected</span>}
          </div>
          {prod.productCode && (
            <div className="text-[0.68vw] text-gray-400 font-mono">{prod.productCode}{prod.serialNumber && ` · SN: ${prod.serialNumber}`}</div>
          )}
        </div>
        <div className="flex items-center gap-[0.5vw]" onClick={e => e.stopPropagation()}>
          {prod.warrantyStatus && (
            <span className={`text-[0.65vw] px-[0.5vw] py-[0.1vw] rounded font-semibold ${prod.warrantyStatus === "In Warranty" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{prod.warrantyStatus}</span>
          )}
          <button title="Duplicate this row" onClick={() => onDuplicate(prod)}
            className="flex items-center gap-[0.3vw] px-[0.6vw] py-[0.3vw] border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-[0.35vw] text-[0.68vw] font-semibold cursor-pointer">
            <Copy className="w-[0.75vw] h-[0.75vw]" />Duplicate
          </button>
          {total > 1 && (
            <button title="Remove row" onClick={() => onRemove(prod._pid)}
              className="p-[0.3vw] hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-[0.3vw] cursor-pointer">
              <X className="w-[0.9vw] h-[0.9vw]" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="border-t border-gray-100 px-[1vw] pt-[0.9vw] pb-[1vw] grid grid-cols-4 gap-[1vw]">
              <div className="col-span-2 flex flex-col gap-[0.3vw] relative" ref={prodRef}>
                <label className="text-[0.72vw] font-semibold text-gray-600">Product Description</label>
                <div className="relative">
                  <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-gray-400" />
                  <input value={prod.productDescription || prodSearch}
                    onChange={e => { setProdSearch(e.target.value); sp("productDescription", e.target.value); sp("productCode", ""); setShowProdDrop(true); }}
                    onFocus={() => { if (customerCode) setShowProdDrop(true); }}
                    disabled={!customerCode}
                    placeholder={!customerCode ? "Select customer first" : "Search product…"}
                    className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] py-[0.5vw] pr-[0.7vw] text-[0.78vw] outline-none focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  {showProdDrop && customerCode && filteredProds.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.2vw] max-h-[12vw] overflow-y-auto z-30">
                      {filteredProds.map((p, i) => (
                        <div key={i} onClick={() => selectProduct(p)} className="p-[0.55vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                          <div className="font-medium text-gray-700 text-[0.78vw]">{p.itemDescription}</div>
                          <div className="text-[0.68vw] text-gray-400 font-mono">{p.itemCode}{p.productSegment && ` · ${p.productSegment}`}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.72vw] font-semibold text-gray-600">Product Code</label>
                <input readOnly value={prod.productCode} className="border border-gray-200 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] bg-gray-100 text-gray-500 font-mono cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.72vw] font-semibold text-gray-600">Serial Number</label>
                <input value={prod.serialNumber} onChange={e => sp("serialNumber", e.target.value)}
                  placeholder="SN-XXXXXX" className="border border-gray-300 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-400 font-mono" />
              </div>
              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.72vw] font-semibold text-gray-600">Qty</label>
                <input type="number" min="1" value={prod.qty} onChange={e => sp("qty", e.target.value)}
                  className="border border-gray-300 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-400" />
              </div>
              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.72vw] font-semibold text-gray-600">Warranty Status</label>
                <select value={prod.warrantyStatus} onChange={e => sp("warrantyStatus", e.target.value)}
                  className="border border-gray-300 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] bg-white outline-none focus:border-blue-400">
                  {WARRANTY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-[0.3vw]">
                <label className="text-[0.72vw] font-semibold text-gray-600">Nature of Problem</label>
                <select value={prod.natureOfProblem} onChange={e => sp("natureOfProblem", e.target.value)}
                  className="border border-gray-300 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] bg-white outline-none focus:border-blue-400">
                  {NATURE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-[0.3vw]">
                <label className="text-[0.72vw] font-semibold text-gray-600">Symptoms Observed</label>
                <textarea rows="2" value={prod.symptomsObserved} onChange={e => sp("symptomsObserved", e.target.value)}
                  placeholder="Describe symptoms…"
                  className="border border-gray-300 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-400 resize-none" />
              </div>
              <div className="col-span-2 flex flex-col gap-[0.3vw]">
                <label className="text-[0.72vw] font-semibold text-gray-600">Root Cause (if known)</label>
                <textarea rows="2" value={prod.rootCause} onChange={e => sp("rootCause", e.target.value)}
                  placeholder="Root cause analysis…"
                  className="border border-gray-300 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Registration Form ──────────────────────────────────────────────────────────
const InwardForm = ({ initialData, customerDb, employees, partyTypes, onSave, onBack }) => {
  const [base, setBase] = useState(() => ({
    customerName: initialData.customerName || "",
    customerCode: initialData.customerCode || "",
    customerType: initialData.customerType || "",
    contactPerson: initialData.contactPerson || "",
    contactNumber: initialData.contactNumber || "",
    emailId: initialData.emailId || "",
    location: initialData.location || "",
    assignedTo: initialData.assignedTo || "",
    assignedToName: initialData.assignedToName || "",
    assignedDepartment: initialData.assignedDepartment || "",
    assignmentDate: initialData.assignmentDate || new Date().toISOString().slice(0, 16),
    expectedClosureDate: initialData.expectedClosureDate || "",
  }));

  const [products, setProducts] = useState(() => {
    if (initialData._editing) {
      return [{
        _pid: `p-${Date.now()}`,
        productCode: initialData.productCode || "",
        productDescription: initialData.productDescription || "",
        productSegment: initialData.productSegment || "",
        serialNumber: initialData.serialNumber || "",
        qty: initialData.qty || "1",
        warrantyStatus: initialData.warrantyStatus || "In Warranty",
        natureOfProblem: initialData.natureOfProblem || "Repair",
        symptomsObserved: initialData.symptomsObserved || "",
        rootCause: initialData.rootCause || "",
        status: initialData.status || "Open",
        escalationLevel: initialData.escalationLevel || 0,
        escalationHistory: initialData.escalationHistory || [],
      }];
    }
    return [emptyProduct()];
  });

  const [showCustDrop, setShowCustDrop] = useState(false);
  const [showEngDrop, setShowEngDrop] = useState(false);
  const [custSearch, setCustSearch] = useState(initialData.customerName || "");
  const [engSearch, setEngSearch] = useState("");
  const [dupeTarget, setDupeTarget] = useState(null);
  const custRef = useRef(null);
  const engRef = useRef(null);
  const isEdit = !!initialData._editing;

  useEffect(() => {
    const handler = (e) => {
      if (custRef.current && !custRef.current.contains(e.target)) setShowCustDrop(false);
      if (engRef.current && !engRef.current.contains(e.target)) setShowEngDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const customerDbFlat = useMemo(() => Array.isArray(customerDb)
    ? customerDb
    : Object.values(customerDb).flat(), [customerDb]);

  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    customerDbFlat.forEach(item => {
      if (!map.has(item.partyCode)) map.set(item.partyCode, { code: item.partyCode, name: item.partyDescription, type: item.partyType });
    });
    return Array.from(map.values());
  }, [customerDbFlat]);

  const serviceEngineers = useMemo(() =>
    employees.filter(e => ["Support Engineer", "Service Engineer"].includes(e.department)),
    [employees]
  );
  const filteredEng = serviceEngineers.filter(e =>
    e.name.toLowerCase().includes(engSearch.toLowerCase()) || e.userId?.toLowerCase().includes(engSearch.toLowerCase())
  );

  const sb = (k, v) => setBase(p => ({ ...p, [k]: v }));

  const selectCustomer = (c) => {
    const rows = customerDbFlat.filter(i => i.partyCode === c.code);
    const loc = rows[0] ? [rows[0].districtCity, rows[0].state].filter(Boolean).join(", ") : "";
    setBase(p => ({ ...p, customerCode: c.code, customerName: c.name, customerType: c.type, location: loc || p.location }));
    setCustSearch(c.name);
    setShowCustDrop(false);
    setProducts(prev => prev.map(p => ({ ...p, productCode: "", productDescription: "", productSegment: "" })));
  };

  const selectEngineer = (eng) => {
    setBase(p => ({ ...p, assignedTo: eng.userId, assignedToName: eng.name, assignedDepartment: eng.department }));
    setEngSearch("");
    setShowEngDrop(false);
  };

  const updateProduct = (updated) => setProducts(prev => prev.map(p => p._pid === updated._pid ? updated : p));
  const removeProduct = (pid) => setProducts(prev => prev.filter(p => p._pid !== pid));
  const addProduct = () => setProducts(prev => [...prev, emptyProduct()]);

  const requestDuplicate = (prod) => setDupeTarget(prod);
  const confirmDuplicate = (prod, count) => {
    if (!prod.productCode) { alert("Please select a product before duplicating."); return; }
    const copies = Array.from({ length: count }, () => ({ ...prod, _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, serialNumber: "" }));
    setProducts(prev => {
      const idx = prev.findIndex(p => p._pid === prod._pid);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, ...copies);
      return next;
    });
    setDupeTarget(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!base.customerCode) { alert("Please select a customer."); return; }
    if (!base.assignedTo) { alert("Please assign to an engineer."); return; }
    if (products.length === 0 || !products[0].productCode) { alert("Please add at least one product."); return; }

    const flows = lsLoad(ESCALATION_FLOWS_KEY, {});
    // ── Use "Service Material" flow key (set in System Settings) ──
    const flow = flows["Service Material"] || [];
    const step0 = flow[0] || {};
    const slaMs = ((step0.durationHours || 2) * 3600_000) + ((step0.durationMins || 0) * 60_000);
    const now = new Date().toISOString();
    const nowMs = Date.now();

    if (isEdit) {
      const prod = products[0];
      const updated = { ...initialData, ...base, ...prod, _editing: undefined };
      onSave(updated, true);
    } else {
      const rows = products.map(prod => {
        const escalationHistory = [{
          level: 0,
          department: base.assignedDepartment || (step0.dept || "Support Engineer"),
          engineerId: base.assignedTo,
          engineerName: base.assignedToName,
          assignedAt: now,
          deadline: new Date(nowMs + slaMs).toISOString(),
        }];
        const row = {
          id: `smi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          refNo: genRef(),
          dateTime: new Date().toLocaleString(),
          timestamp: now,
          ...base,
          ...prod,
          status: "Assigned",
          escalationLevel: 0,
          escalationHistory,
          currentEngineerId: base.assignedTo,  // ← always set this
          qcActions: [],
        };
        return row;
      });
      onSave(rows, false);
    }
  };

  const custDbForRows = useMemo(() => {
    const map = {};
    customerDbFlat.forEach(r => { if (!map[r.partyCode]) map[r.partyCode] = []; map[r.partyCode].push(r); });
    return map;
  }, [customerDbFlat]);

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      className="w-full font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto">

      <AnimatePresence>
        {dupeTarget && (
          <DuplicateModal onConfirm={(count) => confirmDuplicate(dupeTarget, count)} onClose={() => setDupeTarget(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[1vw]">
        <div className="flex items-center gap-[1vw]">
          <button type="button" onClick={onBack}
            className="flex items-center gap-[0.4vw] text-gray-500 hover:text-gray-800 border border-gray-300 bg-gray-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer">
            <ArrowLeft className="w-[1vw] h-[1vw]" /><span className="font-medium">Back</span>
          </button>
          <h2 className="text-[1vw] font-bold text-gray-800">{isEdit ? "Edit Inward Entry" : "New Service Material Inward"}</h2>
          {!isEdit && (
            <span className="text-[0.72vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.2vw] rounded-full">
              {products.length} product{products.length > 1 ? "s" : ""} · {products.length} {products.length > 1 ? "entries" : "entry"} will be created
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[1vw]">
        {/* Customer Section */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100 flex items-center gap-[0.5vw]">
            <User className="w-[1vw] h-[1vw] text-blue-500" />Customer Information
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="col-span-2 flex flex-col gap-[0.3vw] relative" ref={custRef}>
              <label className="font-semibold text-gray-600">Customer Name</label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                <input value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                  onFocus={() => setShowCustDrop(true)}
                  placeholder="Search & select customer…"
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] outline-none focus:ring-2 ring-blue-100" />
              </div>
              {showCustDrop && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[14vw] overflow-y-auto z-30">
                  {uniqueCustomers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase())).map((c, i) => (
                    <div key={i} onClick={() => selectCustomer(c)}
                      className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between">
                      <div><div className="font-medium text-gray-700">{c.name}</div><div className="text-[0.7vw] text-gray-400">{c.code}</div></div>
                      <span className="text-[0.7vw] bg-purple-100 text-purple-700 px-[0.5vw] py-[0.15vw] rounded self-center">{c.type}</span>
                    </div>
                  ))}
                  {!uniqueCustomers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase())).length && (
                    <div className="p-[1vw] text-center text-gray-400">No customers found</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Customer Code</label>
              <input readOnly value={base.customerCode} className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] bg-gray-100 text-gray-500 font-mono cursor-not-allowed" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Contact Person</label>
              <input value={base.contactPerson} onChange={e => sb("contactPerson", e.target.value)} className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Contact Number</label>
              <input value={base.contactNumber} onChange={e => sb("contactNumber", e.target.value)} className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Email</label>
              <input type="email" value={base.emailId} onChange={e => sb("emailId", e.target.value)} className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] outline-none" />
            </div>
            <div className="col-span-2 flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Location / Site</label>
              <input value={base.location} onChange={e => sb("location", e.target.value)} className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] outline-none" />
            </div>
          </div>
        </div>

        {/* Product Section */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <div className="flex items-center justify-between mb-[1vw] pb-[0.5vw] border-b border-gray-100">
            <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-[0.5vw]">
              <Package className="w-[1vw] h-[1vw] text-blue-500" />Product & Service Details
              <span className="ml-[0.5vw] text-[0.7vw] bg-blue-100 text-blue-700 px-[0.5vw] py-[0.15vw] rounded-full font-semibold normal-case tracking-normal">{products.length} row{products.length > 1 ? "s" : ""}</span>
            </h3>
            {!isEdit && (
              <button type="button" onClick={addProduct}
                className="flex items-center gap-[0.4vw] text-[0.75vw] font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer">
                <Plus className="w-[0.85vw] h-[0.85vw]" />Add Product Row
              </button>
            )}
          </div>

          {!base.customerCode && (
            <div className="text-[0.78vw] text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-[0.4vw] p-[1vw] text-center mb-[0.8vw]">
              Select a customer above to enable product search in each row
            </div>
          )}

          <div className="space-y-[0.6vw]">
            {products.map((prod, idx) => (
              <ProductRow key={prod._pid} prod={prod} idx={idx} total={products.length}
                customerCode={base.customerCode} customerDb={custDbForRows}
                onUpdate={updateProduct} onRemove={removeProduct} onDuplicate={requestDuplicate} isEdit={isEdit} />
            ))}
          </div>

          {!isEdit && products.length > 1 && (
            <div className="mt-[0.8vw] p-[0.7vw] bg-blue-50 border border-blue-100 rounded-[0.4vw] flex items-center gap-[0.5vw]">
              <AlertCircle className="w-[1vw] h-[1vw] text-blue-500 flex-shrink-0" />
              <span className="text-[0.72vw] text-blue-700">
                <strong>{products.length} separate inward entries</strong> will be created — one per product row, each with its own Ref No and escalation tracking.
              </span>
            </div>
          )}
        </div>

        {/* Assignment Section */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100 flex items-center gap-[0.5vw]">
            <Shield className="w-[1vw] h-[1vw] text-blue-500" />Assignment & Escalation
          </h3>
          {/* SLA info banner */}
          {(() => {
            const flows = lsLoad(ESCALATION_FLOWS_KEY, {});
            const flow = flows["Service Material"] || [];
            if (!flow.length) return (
              <div className="mb-[0.8vw] p-[0.6vw] bg-yellow-50 border border-yellow-200 rounded-[0.4vw] text-[0.72vw] text-yellow-700 flex items-center gap-[0.4vw]">
                <AlertTriangle className="w-[0.85vw] h-[0.85vw]" />
                No "Service Material" escalation flow configured in System Settings. Please set it up to enable SLA timers.
              </div>
            );
            return (
              <div className="mb-[0.8vw] p-[0.6vw] bg-teal-50 border border-teal-200 rounded-[0.4vw] text-[0.72vw] text-teal-700 flex items-center gap-[0.4vw]">
                <Clock className="w-[0.85vw] h-[0.85vw]" />
                SLA Flow: {flow.map((s, i) => `L${i + 1}: ${s.dept} (${s.durationHours || 0}h${s.durationMins || 0}m)`).join(" → ")}
              </div>
            );
          })()}
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="col-span-2 flex flex-col gap-[0.3vw] relative" ref={engRef}>
              <label className="font-semibold text-gray-600">Assign To</label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 z-10" />
                <input value={base.assignedToName || engSearch}
                  onChange={e => { setEngSearch(e.target.value); if (base.assignedToName) setBase(p => ({ ...p, assignedTo: "", assignedToName: "", assignedDepartment: "" })); setShowEngDrop(true); }}
                  onFocus={() => setShowEngDrop(true)}
                  placeholder="Search engineer…"
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] pr-[2vw] p-[0.6vw] outline-none" />
                {base.assignedToName && (
                  <button type="button" onClick={() => { setBase(p => ({ ...p, assignedTo: "", assignedToName: "", assignedDepartment: "" })); setEngSearch(""); }}
                    className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer">
                    <X className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                )}
              </div>
              {showEngDrop && (
                <div className="absolute top-[calc(100%+0.3vw)] left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] max-h-[14vw] overflow-y-auto z-30">
                  {filteredEng.map((eng, i) => (
                    <div key={i} onClick={() => selectEngineer(eng)} className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-[0.6vw]">
                      <Avatar name={eng.name} size="sm" />
                      <div><div className="font-medium text-gray-700">{eng.name}</div><div className="text-[0.7vw] text-gray-400">{eng.department}</div></div>
                    </div>
                  ))}
                  {!filteredEng.length && <div className="p-[1vw] text-center text-gray-400">No engineers found</div>}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Assignment Date</label>
              <input type="datetime-local" value={base.assignmentDate} onChange={e => sb("assignmentDate", e.target.value)}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Expected Closure Date</label>
              <input type="date" value={base.expectedClosureDate} onChange={e => sb("expectedClosureDate", e.target.value)}
                className="border border-gray-300 p-[0.6vw] rounded-[0.4vw] outline-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-[1vw] sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw]">
          <button type="button" onClick={onBack}
            className="px-[1.5vw] py-[0.7vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold">
            <X className="w-[1vw] h-[1vw]" />Cancel
          </button>
          <button type="submit"
            className="px-[1.5vw] py-[0.7vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md">
            <Save className="w-[1vw] h-[1vw]" />
            {isEdit ? "Update Entry" : `Register ${products.length > 1 ? `${products.length} Entries` : "Inward"}`}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// ── Admin Table View ───────────────────────────────────────────────────────────
const AdminTableView = ({ entries, onEdit, selectedItems, onToggleSelect, onToggleSelectPage, currentPage, setCurrentPage, filteredData, paginatedData, totalPages, isPageSelected }) => (
  <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 flex flex-col">
    <div className="overflow-y-auto max-h-[65vh] min-h-[65vh] w-full rounded-t-[0.6vw]">
      <table className="w-full text-left border-collapse">
        <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="p-[0.6vw] border-b border-r border-gray-200 w-[3%] text-center">
              <button onClick={onToggleSelectPage} className="flex items-center justify-center w-full cursor-pointer">
                {isPageSelected ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" /> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-400" />}
              </button>
            </th>
            {["S.No", "Ref No", "Date", "Customer", "Product", "Serial No", "Nature", "Warranty", "Assigned To", "Esc. Level", "Expected Close", "Status", ""].map(h => (
              <th key={h} className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap text-[0.78vw]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedData.length > 0 ? paginatedData.map((row, i) => {
            const sn = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
            const isSelected = selectedItems.has(row.id);
            const statusCls = STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600 border-gray-300";
            return (
              <tr key={row.id} className={`transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                <td className="p-[0.8vw] border-r border-gray-200 text-center">
                  <button onClick={() => onToggleSelect(row.id)} className="flex items-center justify-center w-full cursor-pointer">
                    {isSelected ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" /> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-300 hover:text-gray-500" />}
                  </button>
                </td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-600 font-medium text-center">{sn}</td>
                <td className="p-[0.8vw] border-r border-gray-200 font-mono text-[0.78vw] text-blue-600 whitespace-nowrap">{row.refNo}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-500 text-[0.75vw] whitespace-nowrap">{new Date(row.timestamp).toLocaleDateString("en-GB")}</td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  <div className="font-semibold text-gray-800 text-[0.78vw] truncate max-w-[10vw]" title={row.customerName}>{row.customerName || "—"}</div>
                  {row.contactPerson && <div className="text-[0.62vw] text-gray-400">{row.contactPerson}</div>}
                </td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-700 text-[0.75vw] max-w-[10vw] truncate" title={row.productDescription}>{row.productDescription || "—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 font-mono text-[0.72vw] text-gray-500">{row.serialNumber || "—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.75vw] text-gray-600">{row.natureOfProblem || "—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  <span className={`text-[0.68vw] px-[0.4vw] py-[0.1vw] rounded font-semibold ${row.warrantyStatus === "In Warranty" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{row.warrantyStatus}</span>
                </td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  {row.assignedToName
                    ? <div className="flex items-center gap-[0.4vw]"><Avatar name={row.assignedToName} size="sm" /><span className="text-[0.75vw] text-gray-700">{row.assignedToName}</span></div>
                    : <span className="text-gray-300 text-[0.72vw]">—</span>}
                </td>
                <td className="p-[0.8vw] border-r border-gray-200 text-center">
                  {row.escalationLevel > 0
                    ? <span className={`text-[0.68vw] px-[0.4vw] py-[0.1vw] rounded font-bold text-white ${row.escalationLevel === 1 ? "bg-yellow-500" : "bg-red-500"}`}>L{row.escalationLevel + 1}</span>
                    : <span className="text-[0.7vw] text-gray-400 bg-blue-50 px-[0.4vw] rounded">L1</span>}
                </td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.72vw] text-gray-500 whitespace-nowrap">{row.expectedClosureDate || "—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  <span className={`text-[0.68vw] px-[0.45vw] py-[0.12vw] rounded-full border font-semibold ${statusCls}`}>{row.status}</span>
                </td>
                <td className="p-[0.8vw] text-center">
                  <button onClick={() => onEdit(row)} title="Edit" className="text-gray-400 hover:text-blue-600 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-blue-50 transition-colors">
                    <Edit3 className="w-[0.95vw] h-[0.95vw]" />
                  </button>
                </td>
              </tr>
            );
          }) : (
            <tr><td colSpan={14} className="py-[4vw] text-center text-gray-400">No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="border-t border-blue-100 p-[0.6vw] bg-blue-50 flex justify-between items-center rounded-b-[0.6vw]">
      <div className="text-[0.8vw] text-gray-500">
        Showing <strong>{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</strong> of <strong>{filteredData.length}</strong> entries
      </div>
      <div className="flex items-center gap-[1.2vw]">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronLeft className="w-[1vw] h-[1vw] text-gray-600" /></button>
        <div className="flex gap-[0.7vw]">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pNum = i + 1;
            if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
            if (pNum > totalPages) return null;
            return (
              <button key={pNum} onClick={() => setCurrentPage(pNum)}
                className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>{pNum}</button>
            );
          })}
        </div>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronRight className="w-[1vw] h-[1vw] text-gray-600" /></button>
      </div>
    </div>
  </div>
);

// ── Main Export ────────────────────────────────────────────────────────────────
export default function ServiceMaterialInward() {
  const [view, setView] = useState("table");
  const [editingRow, setEditing] = useState(null);
  const [entries, setEntries] = useState([]);
  const [customerDb, setCustomerDb] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    setEntries(lsLoad(INWARD_KEY, []));
    setCustomerDb(lsLoad(CUSTOMER_DB_KEY, []));
    setEmployees(lsLoad(EMPLOYEES_KEY, []));
    setPartyTypes(lsLoad(PARTY_TYPES_KEY, [{ id: 1, name: "OEM" }, { id: 2, name: "End Customer" }]));
    // ── FIX: check both sessionStorage and localStorage ──
    const u = JSON.parse(
      sessionStorage.getItem("loggedInUser") ||
      localStorage.getItem("loggedInUser") ||
      sessionStorage.getItem("currentUser") ||
      localStorage.getItem("currentUser") ||
      "null"
    );
    if (u) setCurrentUser(u);
  }, []);

  const isAdmin = currentUser?.role === "Admin" || currentUser?.department === "Admin";

  const save = (rows) => { setEntries(rows); lsSave(INWARD_KEY, rows); };
  const goToForm = () => { setEditing(null); setView("form"); };
  const goToEdit = (row) => { setEditing({ ...row, _editing: true }); setView("form"); };
  const goToTable = () => { setEditing(null); setView("table"); };

  const handleSave = (formRow, isEdit) => {
    if (isEdit) {
      save(entries.map(r => r.id === formRow.id ? formRow : r));
    } else {
      const newRows = Array.isArray(formRow) ? formRow : [{ id: Date.now(), ...formRow }];
      save([...newRows, ...entries]);
    }
    setView("table");
  };

  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return entries.filter(row => {
      const ms = !s || row.refNo?.toLowerCase().includes(s) || row.customerName?.toLowerCase().includes(s) || row.productDescription?.toLowerCase().includes(s) || row.assignedToName?.toLowerCase().includes(s);
      const mst = filterStatus === "All" || row.status === filterStatus;
      return ms && mst;
    });
  }, [entries, searchTerm, filterStatus]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus]);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedItems.has(r.id));

  const toggleSelect = (id) => { const s = new Set(selectedItems); s.has(id) ? s.delete(id) : s.add(id); setSelectedItems(s); };
  const toggleSelectPage = () => { const s = new Set(selectedItems); if (isPageSelected) paginatedData.forEach(r => s.delete(r.id)); else paginatedData.forEach(r => s.add(r.id)); setSelectedItems(s); };
  const handleBulkDelete = () => { if (confirm(`Delete ${selectedItems.size} records?`)) { save(entries.filter(r => !selectedItems.has(r.id))); setSelectedItems(new Set()); } };

  const counts = useMemo(() => {
    const c = { All: entries.length };
    STATUS_OPTIONS.forEach(s => { c[s] = entries.filter(e => e.status === s).length; });
    return c;
  }, [entries]);

  // Non-admin → employee response view (imported separately)
  // This component handles admin table only
  // The routing to ServiceMaterialInwardResponse is done at the app/dashboard level

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      <AnimatePresence mode="wait">
        {view === "form" ? (
          <InwardForm key="form" initialData={editingRow || { ...emptyBase(), ...emptyProduct() }}
            customerDb={customerDb} employees={employees} partyTypes={partyTypes}
            onSave={handleSave} onBack={goToTable} />
        ) : (
          <motion.div key="table" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[0.9vw]">
              <div className="relative w-[30vw]">
                <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
                <input type="text" placeholder="Search by ref, customer, product, engineer…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-300 rounded-[0.8vw] focus:outline-none focus:border-gray-800" />
              </div>
              <div className="flex gap-[0.8vw] items-center">
                <AnimatePresence>
                  {selectedItems.size > 0 && (
                    <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDelete} className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-semibold">
                      <Trash2 className="w-[1vw] h-[1vw]" />Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent font-medium text-gray-700 border border-gray-300 p-[0.4vw] rounded-[0.3vw] outline-none cursor-pointer h-[2.4vw]">
                  <option value="All">All Status</option>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={goToForm} className="cursor-pointer flex items-center gap-[0.5vw] bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-[1vw] h-[2.4vw] rounded-[0.4vw]">
                  <Plus className="w-[1.2vw] h-[1.2vw]" />Add
                </button>
              </div>
            </div>

            <div className="flex gap-[0.8vw] mb-[0.9vw] flex-wrap">
              {[
                { label: "All", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
                { label: "Open", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
                { label: "Assigned", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
                { label: "In Progress", color: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
                { label: "Pending", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
                { label: "Closed", color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
                { label: "Critical", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
              ].map(({ label, color, dot }) => (
                <button key={label} onClick={() => setFilterStatus(label === "All" ? "All" : label)}
                  className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.55vw] rounded-[0.5vw] border font-medium text-[0.8vw] cursor-pointer transition-all ${color} ${filterStatus === (label === "All" ? "All" : label) ? "ring-2 ring-offset-1 ring-blue-300 shadow-sm" : "opacity-80 hover:opacity-100"}`}>
                  <span className={`w-[0.6vw] h-[0.6vw] rounded-full ${dot}`} />
                  {label} <span className="font-bold">{counts[label] ?? 0}</span>
                </button>
              ))}
            </div>

            <AdminTableView
              entries={entries}
              onEdit={goToEdit}
              selectedItems={selectedItems} onToggleSelect={toggleSelect} onToggleSelectPage={toggleSelectPage}
              currentPage={currentPage} setCurrentPage={setCurrentPage}
              filteredData={filteredData} paginatedData={paginatedData}
              totalPages={totalPages} isPageSelected={isPageSelected}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}