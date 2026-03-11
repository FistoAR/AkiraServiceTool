import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Search, X, Trash2, Save, ChevronLeft, ChevronRight,
  CheckSquare, Square, Edit3, ArrowLeft, Plus,
  User, Package, CheckCircle, Clock,
  ChevronDown, ChevronUp, AlertCircle,
  Shield, AlertTriangle, ClipboardList, FileText,
  Eye, UploadCloud,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Keys ────────────────────────────────────────────────────────────────────────
const PMI_KEY         = "production_material_inward_v1";
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
const EMPLOYEES_KEY   = "employees";
const PARTY_TYPES_KEY = "party_types_v3";
const ITEMS_PER_PAGE  = 10;

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS  = ["Assigned", "Pending", "Closed"];
const DEFECT_OPTIONS  = ["Dimensional Non-conformance", "Surface Defect", "Functional Failure", "Material Defect", "Assembly Error", "Other"];
const OUTCOME_OPTIONS = ["Reworked & Passed QC", "Scrapped", "Returned to Supplier", "Accepted with Deviation", "Pending Further Review"];

const SLA_MS = 2 * 60 * 60 * 1000;

const STATUS_COLORS = {
  Assigned: "bg-purple-100 text-purple-700 border-purple-300",
  Pending:  "bg-orange-100 text-orange-700 border-orange-300",
  Closed:   "bg-green-100 text-green-700 border-green-300",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const lsLoad = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));
const genRef  = () => `PMI-${new Date().toISOString().slice(0,10).replace(/-/g,"")}${Math.floor(1000+Math.random()*9000)}`;
const getCurrentUser = () => {
  for (const k of ["loggedInUser","currentUser","user"]) {
    for (const s of [sessionStorage, localStorage]) {
      try { const v = s.getItem(k); if (v) { const p = JSON.parse(v); if (p?.userId||p?.id||p?.name) return p; } } catch {}
    }
  }
  return null;
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
const AV = ["from-blue-400 to-blue-600","from-purple-400 to-purple-600","from-green-400 to-green-600","from-orange-400 to-orange-600","from-pink-400 to-pink-600","from-teal-400 to-teal-600"];
const avCol = (n="") => { let h=0; for(let i=0;i<n.length;i++) h=n.charCodeAt(i)+((h<<5)-h); return AV[Math.abs(h)%AV.length]; };
const inits = (n="") => n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?";
const Avatar = ({name, size="md"}) => {
  const s={sm:"w-[1.4vw] h-[1.4vw] text-[0.52vw]",md:"w-[1.8vw] h-[1.8vw] text-[0.65vw]",lg:"w-[2.4vw] h-[2.4vw] text-[0.82vw]"}[size];
  return <div title={name} className={`rounded-full bg-gradient-to-br ${avCol(name)} flex items-center justify-center font-bold text-white flex-shrink-0 ${s}`}>{inits(name)}</div>;
};

// ── Section Card ───────────────────────────────────────────────────────────────
const SectionCard = ({ icon, title, children, collapsible=false, defaultOpen=true, accent="blue" }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [animating, setAnimating] = useState(false);
  const colors = { blue:"text-blue-500", green:"text-green-500", yellow:"text-yellow-500", orange:"text-orange-500" };
  return (
    <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
      <div className={`flex items-center justify-between pb-[0.5vw] border-b border-gray-100 mb-[1vw] ${collapsible?"cursor-pointer select-none":""}`}
        onClick={collapsible ? ()=>{ setOpen(o=>!o); setAnimating(true); } : undefined}>
        <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-[0.5vw]">
          <span className={colors[accent]}>{icon}</span>{title}
        </h3>
        {collapsible && (open ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400"/> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400"/>)}
      </div>
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div
            initial={collapsible?{height:0,opacity:0}:false}
            animate={{height:"auto",opacity:1}}
            exit={{height:0,opacity:0}}
            transition={{duration:0.18}}
            style={{ overflow: animating ? "hidden" : "visible" }}
            onAnimationStart={() => setAnimating(true)}
            onAnimationComplete={() => setAnimating(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Field ──────────────────────────────────────────────────────────────────────
const Field = ({label, children}) => (
  <div className="flex flex-col gap-[0.3vw]">{label && <label className="text-[0.72vw] font-semibold text-gray-600">{label}</label>}{children}</div>
);
const inp = "border border-gray-300 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] outline-none focus:border-blue-400";
const ta  = `${inp} resize-none`;
const ro  = "border border-gray-200 rounded-[0.4vw] py-[0.5vw] px-[0.6vw] text-[0.78vw] bg-gray-100 text-gray-500 cursor-not-allowed";

// ── FixedDropdown ──────────────────────────────────────────────────────────────
// Renders into document.body so it escapes overflow:hidden parents.
// dropdownRef is forwarded so the outside-click handler can include this portal
// element in its contains() check — without this, every click on the portal
// looks like an "outside" click and closes the dropdown before onClick fires.
const FixedDropdown = React.forwardRef(({ anchorRef, open, children }, dropdownRef) => {
  const [pos, setPos] = useState({ top:0, left:0, width:0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      onMouseDown={e => e.preventDefault()}
      style={{ position:"fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 shadow-lg rounded-[0.4vw] max-h-[14vw] overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
});

// ── Party type badge color ─────────────────────────────────────────────────────
const getTypeColor = (type, partyTypes) => {
  const idx = partyTypes.findIndex(t => (t.name||t) === type);
  return ["bg-purple-100 text-purple-700","bg-orange-100 text-orange-700","bg-blue-100 text-blue-700","bg-green-100 text-green-700"][idx % 4] || "bg-gray-100 text-gray-700";
};

// ══════════════════════════════════════════════════════════════════════════════
// A. ADMIN — Inward Registration & Assignment Form
// ══════════════════════════════════════════════════════════════════════════════
function InwardForm({ initialData, onSave, onCancel }) {
  const isEdit = !!initialData?.id;

  const customerDbRaw = useMemo(() => lsLoad(CUSTOMER_DB_KEY, {}), []);
  const partyTypes    = useMemo(() => {
    const raw = lsLoad(PARTY_TYPES_KEY, []);
    return raw.length ? raw : [{ id:1, name:"OEM" }, { id:2, name:"End Customer" }];
  }, []);
  const employees  = useMemo(() => lsLoad(EMPLOYEES_KEY, []), []);
  const allEmps = useMemo(() => employees, [employees]);

  const customerDbFlat = useMemo(() => {
    if (!customerDbRaw) return [];
    if (Array.isArray(customerDbRaw)) return customerDbRaw.filter(Boolean);
    return Object.values(customerDbRaw).flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
  }, [customerDbRaw]);

  const [form, setForm] = useState(() => initialData || {
    refNo: genRef(), dateTime: new Date().toLocaleString(), timestamp: new Date().toISOString(),
    customerName:"", customerCode:"", customerType:"",
    productCode:"", productDescription:"", productSegment:"",
    batchNo:"", quantity:"",
    defectNature:"", symptoms:"", rootCause:"", batchDetails:"",
    assignedTo:"", assignedToId:"", assignedDept:"",
    slaDeadline: null,
    inspectionFindings:"", actionsTaken:"", correctiveActions:"", preventiveMeasures:"",
    closureRemarks:"", finalOutcome:"", closedAt:null,
    status:"Assigned", history:[], updatedAt:null, updatedBy:"",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  // ── Customer dropdown state ──────────────────────────────────────────────────
  const [custSearch, setCustSearch]     = useState(initialData?.customerName || "");
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [custTypeFilter, setCustTypeFilter] = useState("All");
  const custAnchorRef = useRef(null);
  const custWrapRef   = useRef(null);

  // ── Product dropdown state ──────────────────────────────────────────────────
  const [prodSearch, setProdSearch]     = useState(initialData?.productDescription || "");
  const [showProdDrop, setShowProdDrop] = useState(false);
  const prodAnchorRef = useRef(null);
  const prodWrapRef   = useRef(null);

  // ── Engineer dropdown state ─────────────────────────────────────────────────
  const [engSearch, setEngSearch]       = useState("");
  const [showEngDrop, setShowEngDrop]   = useState(false);
  const engAnchorRef  = useRef(null);
  const engWrapRef    = useRef(null);

  // Refs for the portaled dropdown divs — needed so outside-click can check if
  // the click target is inside the portal (which lives in document.body, not the
  // React tree, so wrapRef.contains() would always return false for portal clicks)
  const custDropRef = useRef(null);
  const prodDropRef = useRef(null);
  const engDropRef  = useRef(null);

  // ── Outside click handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const inCust = (custWrapRef.current && custWrapRef.current.contains(e.target)) || (custDropRef.current && custDropRef.current.contains(e.target));
      const inProd = (prodWrapRef.current && prodWrapRef.current.contains(e.target)) || (prodDropRef.current && prodDropRef.current.contains(e.target));
      const inEng  = (engWrapRef.current  && engWrapRef.current.contains(e.target))  || (engDropRef.current  && engDropRef.current.contains(e.target));
      if (!inCust) setShowCustDrop(false);
      if (!inProd) setShowProdDrop(false);
      if (!inEng)  setShowEngDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Unique customers ─────────────────────────────────────────────────────────
  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    customerDbFlat.forEach(item => {
      if (item && item.partyCode && !map.has(item.partyCode)) {
        map.set(item.partyCode, { code: item.partyCode, name: item.partyDescription, type: item.partyType || "" });
      }
    });
    return Array.from(map.values());
  }, [customerDbFlat]);

  const filteredCustomers = useMemo(() => {
    return uniqueCustomers.filter(c => {
      const matchType   = custTypeFilter === "All" || c.type === custTypeFilter;
      const matchSearch = !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.code.toLowerCase().includes(custSearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [uniqueCustomers, custTypeFilter, custSearch]);

  // ── Products for selected customer ──────────────────────────────────────────
  const productsForCustomer = useMemo(() => {
    if (!form.customerCode) return [];
    const rows = customerDbFlat.filter(r => r && r.partyCode === form.customerCode);
    const seen = new Set();
    return rows.filter(r => {
      if (!r.itemCode || seen.has(r.itemCode)) return false;
      seen.add(r.itemCode);
      return true;
    });
  }, [customerDbFlat, form.customerCode]);

  const filteredProducts = useMemo(() => {
    if (!prodSearch) return productsForCustomer;
    const q = prodSearch.toLowerCase();
    return productsForCustomer.filter(p =>
      (p.itemDescription || "").toLowerCase().includes(q) ||
      (p.itemCode || "").toLowerCase().includes(q)
    );
  }, [productsForCustomer, prodSearch]);

  // ── Filtered engineers ──────────────────────────────────────────────────────
  const filteredEngineers = useMemo(() => {
    const base = form.assignedDept ? allEmps.filter(e => e.department === form.assignedDept) : allEmps;
    if (!engSearch) return base;
    const q = engSearch.toLowerCase();
    return base.filter(e => e.name.toLowerCase().includes(q));
  }, [allEmps, form.assignedDept, engSearch]);

  // ── Selection handlers ───────────────────────────────────────────────────────
  const selectCustomer = (c) => {
    setForm(p => ({ ...p, customerCode: c.code, customerName: c.name, customerType: c.type,
      productCode: "", productDescription: "", productSegment: "" }));
    setCustSearch(c.name);
    setShowCustDrop(false);
    setProdSearch("");
  };

  const selectProduct = (p) => {
    setForm(prev => ({ ...prev, productCode: p.itemCode, productDescription: p.itemDescription, productSegment: p.productSegment || "" }));
    setProdSearch(p.itemDescription);
    setShowProdDrop(false);
  };

  const selectEngineer = (eng) => {
    setForm(p => ({ ...p, assignedTo: eng.name, assignedToId: eng.userId || eng.id || "", assignedDept: eng.department }));
    setEngSearch("");
    setShowEngDrop(false);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.customerCode) { alert("Please select a customer."); return; }
    if (!form.productCode)  { alert("Please select a product."); return; }
    const now = new Date().toISOString();
    const slaDeadline = new Date(Date.now() + SLA_MS).toISOString();
    onSave({ ...form, status: "Assigned", assignedAt: form.assignedAt || now, slaDeadline });
  };

  return (
    <motion.div initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}}
      className="w-full font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-[1vw] bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[1vw]">
        <button type="button" onClick={onCancel} className="flex items-center gap-[0.4vw] text-gray-500 hover:text-gray-800 border border-gray-300 bg-gray-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer">
          <ArrowLeft className="w-[1vw] h-[1vw]"/><span className="font-medium text-[0.8vw]">Back</span>
        </button>
        <h2 className="text-[1vw] font-bold text-gray-800">{isEdit?"Edit Production Inward":"New Production Material Inward"}</h2>
        <span className="text-[0.72vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.2vw] rounded-full font-mono">{form.refNo}</span>
        {isEdit && <span className={`text-[0.68vw] px-[0.5vw] py-[0.15vw] rounded-full border font-semibold ${STATUS_COLORS[form.status]||"bg-gray-100 text-gray-600 border-gray-300"}`}>{form.status}</span>}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[1vw]">

        {/* ── A1. Customer Information ── */}
        <SectionCard icon={<User className="w-[1vw] h-[1vw]"/>} title="Customer Information">
          <div className="grid grid-cols-4 gap-[1.2vw]">

            {/* Customer Type Filter */}
            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.72vw] font-semibold text-gray-600">Customer Type</label>
              <select
                value={custTypeFilter}
                onChange={e => {
                  setCustTypeFilter(e.target.value);
                  setCustSearch("");
                  setForm(p=>({...p, customerCode:"", customerName:"", customerType:"", productCode:"", productDescription:"", productSegment:""}));
                }}
                className={`${inp} bg-white`}
              >
                <option value="All">All Types</option>
                {partyTypes.map(t => <option key={t.id||t} value={t.name||t}>{t.name||t}</option>)}
              </select>
            </div>

            {/* Customer Name Search — ref wraps both input and dropdown anchor */}
            <div className="col-span-2 flex flex-col gap-[0.3vw]" ref={custWrapRef}>
              <label className="text-[0.72vw] font-semibold text-gray-600 flex justify-between">
                Customer Name
                <span className="font-normal text-gray-400">({filteredCustomers.length} available)</span>
              </label>
              <div className="relative" ref={custAnchorRef}>
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 pointer-events-none"/>
                <input
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                  onFocus={() => setShowCustDrop(true)}
                  placeholder="Search & select customer…"
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] pr-[2vw] p-[0.6vw] text-[0.82vw] outline-none focus:ring-2 ring-blue-100"
                />
                {form.customerName && (
                  <button type="button" onClick={() => {
                    setCustSearch("");
                    setForm(p=>({...p, customerCode:"", customerName:"", customerType:"", productCode:"", productDescription:"", productSegment:""}));
                    setProdSearch("");
                  }} className="absolute right-[0.5vw] top-1/2 -translate-y-1/2">
                    <X className="w-[0.9vw] h-[0.9vw] text-gray-400 hover:text-red-400"/>
                  </button>
                )}
              </div>

              <FixedDropdown anchorRef={custAnchorRef} open={showCustDrop} ref={custDropRef}>
                {filteredCustomers.length > 0 ? filteredCustomers.map((c,i) => (
                  <div key={i}
                    onClick={() => selectCustomer(c)}
                    className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-700 text-[0.78vw]">{c.name}</div>
                      <div className="text-[0.68vw] text-gray-400 font-mono">{c.code}</div>
                    </div>
                    <span className={`text-[0.68vw] px-[0.5vw] py-[0.1vw] rounded font-semibold ${getTypeColor(c.type, partyTypes)}`}>{c.type}</span>
                  </div>
                )) : (
                  <div className="p-[1vw] text-center text-[0.75vw] text-gray-400">No customers found</div>
                )}
              </FixedDropdown>
            </div>

            {/* Customer Code (read-only) */}
            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.72vw] font-semibold text-gray-600">Customer Code</label>
              <input readOnly value={form.customerCode} className={ro}/>
            </div>
          </div>
        </SectionCard>

        {/* ── A2. Product & Material ── */}
        <SectionCard icon={<Package className="w-[1vw] h-[1vw]"/>} title="Product & Material Details" collapsible defaultOpen>
          {!form.customerCode && (
            <div className="text-[0.78vw] text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-[0.4vw] p-[1vw] text-center mb-[0.8vw] flex items-center justify-center gap-[0.5vw]">
              <AlertCircle className="w-[1vw] h-[1vw]"/>Select a customer above to load their product list
            </div>
          )}
          <div className="grid grid-cols-4 gap-[1.2vw]">

            {/* Product Description with dropdown */}
            <div className="col-span-2 flex flex-col gap-[0.3vw]" ref={prodWrapRef}>
              <label className="text-[0.72vw] font-semibold text-gray-600 flex justify-between">
                Product Description
                {form.customerCode && <span className="font-normal text-gray-400">({productsForCustomer.length} products)</span>}
              </label>
              <div className="relative" ref={prodAnchorRef}>
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 pointer-events-none"/>
                <input
                  value={prodSearch}
                  onChange={e => {
                    setProdSearch(e.target.value);
                    set("productDescription", e.target.value);
                    set("productCode", "");
                    set("productSegment", "");
                    if (form.customerCode) setShowProdDrop(true);
                  }}
                  onFocus={() => { if (form.customerCode) setShowProdDrop(true); }}
                  disabled={!form.customerCode}
                  placeholder={!form.customerCode ? "Select customer first…" : "Search product…"}
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] pr-[2vw] p-[0.6vw] text-[0.82vw] outline-none focus:ring-2 ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {form.productCode && (
                  <button type="button" onClick={() => {
                    setProdSearch("");
                    setForm(p=>({...p, productCode:"", productDescription:"", productSegment:""}));
                  }} className="absolute right-[0.5vw] top-1/2 -translate-y-1/2">
                    <X className="w-[0.9vw] h-[0.9vw] text-gray-400 hover:text-red-400"/>
                  </button>
                )}
              </div>

              <FixedDropdown anchorRef={prodAnchorRef} open={showProdDrop && !!form.customerCode} ref={prodDropRef}>
                {filteredProducts.length > 0 ? filteredProducts.map((p,i) => (
                  <div key={i}
                    onClick={() => selectProduct(p)}
                    className="p-[0.55vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                    <div className="font-medium text-gray-700 text-[0.78vw]">{p.itemDescription}</div>
                    <div className="text-[0.68vw] text-gray-400 font-mono">{p.itemCode}{p.productSegment && ` · ${p.productSegment}`}</div>
                  </div>
                )) : (
                  <div className="p-[1vw] text-center text-[0.75vw] text-gray-400">No products found for this customer</div>
                )}
              </FixedDropdown>
            </div>

            {/* Product Code (read-only) */}
            <div className="flex flex-col gap-[0.3vw]">
              <label className="text-[0.72vw] font-semibold text-gray-600">Product Code</label>
              <input readOnly value={form.productCode} className={`${ro} font-mono`}/>
            </div>

            <Field label="Batch No.">
              <input value={form.batchNo} onChange={e=>set("batchNo",e.target.value)} placeholder="Batch number" className={inp}/>
            </Field>
            <Field label="Quantity">
              <input value={form.quantity} onChange={e=>set("quantity",e.target.value)} placeholder="e.g. 50" className={inp}/>
            </Field>
          </div>
        </SectionCard>

        {/* ── A3. Defect Details ── */}
        <SectionCard icon={<AlertTriangle className="w-[1vw] h-[1vw]"/>} title="Defect Details" collapsible defaultOpen>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="col-span-2">
              <Field label="Nature of Defect">
                <select value={form.defectNature} onChange={e=>set("defectNature",e.target.value)} className={`${inp} bg-white`}>
                  <option value="">Select defect type…</option>
                  {DEFECT_OPTIONS.map(o=><option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Batch Details">
                <input value={form.batchDetails} onChange={e=>set("batchDetails",e.target.value)} placeholder="Batch-specific details if any" className={inp}/>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Symptoms / Observations">
                <textarea rows={2} value={form.symptoms} onChange={e=>set("symptoms",e.target.value)} placeholder="Describe observed symptoms in detail…" className={ta}/>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Root Cause (if known)">
                <textarea rows={2} value={form.rootCause} onChange={e=>set("rootCause",e.target.value)} placeholder="Root cause analysis…" className={ta}/>
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── A4. Assignment ── */}
        <SectionCard icon={<Shield className="w-[1vw] h-[1vw]"/>} title="Assignment">
          <div className="grid grid-cols-4 gap-[1.2vw]">

            {/* Department */}
            <div className="col-span-2">
              <Field label="Department">
                <select
                  value={form.assignedDept}
                  onChange={e => {
                    set("assignedDept", e.target.value);
                    set("assignedTo","");
                    set("assignedToId","");
                    setEngSearch("");
                  }}
                  className={`${inp} bg-white`}
                >
                  <option value="">Select department…</option>
                  {["Support Engineer","Service Engineer","R&D","Admin"].map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
            </div>

            {/* Assign To — filtered by selected dept */}
            <div className="col-span-2 flex flex-col gap-[0.3vw]" ref={engWrapRef}>
              <label className="text-[0.72vw] font-semibold text-gray-600 flex justify-between">
                Assign To
                {form.assignedDept && <span className="font-normal text-gray-400">({filteredEngineers.length} available)</span>}
              </label>
              <div className="relative" ref={engAnchorRef}>
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 pointer-events-none"/>
                <input
                  value={form.assignedTo || engSearch}
                  onChange={e => {
                    setEngSearch(e.target.value);
                    if (form.assignedTo) setForm(p=>({...p, assignedTo:"", assignedToId:""}));
                    setShowEngDrop(true);
                  }}
                  onFocus={() => setShowEngDrop(true)}
                  disabled={!form.assignedDept}
                  placeholder={!form.assignedDept ? "Select department first…" : "Search employee…"}
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] pr-[2vw] p-[0.6vw] text-[0.82vw] outline-none focus:ring-2 ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {form.assignedTo && (
                  <button type="button" onClick={() => {
                    setForm(p=>({...p, assignedTo:"", assignedToId:""}));
                    setEngSearch("");
                  }} className="absolute right-[0.5vw] top-1/2 -translate-y-1/2">
                    <X className="w-[0.9vw] h-[0.9vw] text-gray-400 hover:text-red-400"/>
                  </button>
                )}
              </div>

              <FixedDropdown anchorRef={engAnchorRef} open={showEngDrop && !!form.assignedDept} ref={engDropRef}>
                {filteredEngineers.length > 0 ? filteredEngineers.map((e,i) => (
                  <div key={i}
                    onClick={() => selectEngineer(e)}
                    className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-[0.6vw]">
                    <Avatar name={e.name} size="sm"/>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700 text-[0.75vw]">{e.name}</div>
                      <div className="text-[0.68vw] text-gray-400">{e.department}</div>
                    </div>
                  </div>
                )) : (
                  <div className="p-[1vw] text-center text-[0.75vw] text-gray-400">No employees in this department</div>
                )}
              </FixedDropdown>
            </div>

          </div>
        </SectionCard>

        {/* Footer */}
        <div className="flex justify-end gap-[1vw] sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw]">
          <button type="button" onClick={onCancel} className="px-[1.5vw] py-[0.7vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold text-[0.78vw]">
            <X className="w-[1vw] h-[1vw]"/>Cancel
          </button>
          <button type="submit" className="px-[1.5vw] py-[0.7vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md text-[0.78vw]">
            <Save className="w-[1vw] h-[1vw]"/>{isEdit?"Update Entry":"Register Inward"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// B+C. EMPLOYEE — Inspection, Rectification & Closure View
// ══════════════════════════════════════════════════════════════════════════════
function EmployeeResponseView({ entry, onSave, onBack }) {
  const [form, setForm] = useState({...entry});
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const isClosed = form.status === "Closed";

  const [files, setFiles] = useState(entry.closureFiles || []);
  const fileRef = useRef();

  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!entry.slaDeadline) return;
    const update = () => {
      const diff = new Date(entry.slaDeadline).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Overdue"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [entry.slaDeadline]);

  const handleFileAdd = e => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setFiles(f => [...f, { name: file.name, size: file.size, data: ev.target.result, addedAt: new Date().toLocaleString() }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSaveProgress = () => {
    onSave({...form, closureFiles: files, updatedAt: new Date().toISOString()});
  };

  const handleClose = () => {
    if (!form.closureRemarks.trim())     { alert("Please add closure remarks."); return; }
    if (!form.finalOutcome)              { alert("Please select final outcome."); return; }
    if (!form.inspectionFindings.trim()) { alert("Please fill Inspection Findings."); return; }
    onSave({...form, status:"Closed", closedAt:new Date().toISOString(), closureFiles:files, updatedAt:new Date().toISOString()});
  };

  return (
    <motion.div initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}}
      className="w-full font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto">

      <div className="flex items-center gap-[1vw] bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[1vw]">
        <button type="button" onClick={onBack} className="flex items-center gap-[0.4vw] text-gray-500 hover:text-gray-800 border border-gray-300 bg-gray-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer">
          <ArrowLeft className="w-[1vw] h-[1vw]"/><span className="font-medium text-[0.8vw]">Back</span>
        </button>
        <div>
          <div className="flex items-center gap-[0.8vw]">
            <h2 className="text-[1vw] font-bold text-gray-800">Inspection & Rectification</h2>
            <span className="font-mono text-[0.72vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.2vw] rounded-full">{entry.refNo}</span>
            <span className={`text-[0.68vw] px-[0.5vw] py-[0.15vw] rounded-full border font-semibold ${STATUS_COLORS[form.status]||"bg-gray-100 text-gray-600 border-gray-300"}`}>{form.status}</span>
          </div>
          <div className="text-[0.7vw] text-gray-400 mt-[0.2vw]">{entry.customerName} · {entry.productDescription}</div>
        </div>
      </div>

      <div className="flex flex-col gap-[1vw]">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-[0.6vw] px-[1.2vw] py-[0.9vw] grid grid-cols-4 gap-[1vw]">
          {[
            { label:"Customer",     value: entry.customerName },
            { label:"Product",      value: entry.productDescription },
            { label:"Product Code", value: entry.productCode || "—" },
            { label:"Batch No.",    value: entry.batchNo || "—" },
            { label:"Quantity",     value: entry.quantity || "—" },
            { label:"Defect",       value: entry.defectNature || "—" },
            { label:"Registered",   value: entry.dateTime },
            { label:"Assigned To",  value: entry.assignedTo || "—" },
          ].map(({label,value}) => (
            <div key={label}>
              <div className="text-[0.65vw] text-blue-500 font-semibold uppercase tracking-wide">{label}</div>
              <div className="text-[0.78vw] text-gray-800 font-medium truncate" title={value}>{value}</div>
            </div>
          ))}
          {entry.slaDeadline && form.status !== "Closed" && (
            <div className={`col-span-4 flex items-center gap-[0.6vw] mt-[0.3vw] px-[0.8vw] py-[0.5vw] rounded-[0.4vw] border ${timeLeft==="Overdue" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
              <Clock className={`w-[1vw] h-[1vw] flex-shrink-0 ${timeLeft==="Overdue" ? "text-red-500" : "text-orange-500"}`}/>
              <div className="text-[0.72vw] font-semibold text-gray-700">
                {timeLeft==="Overdue"
                  ? <span className="text-red-600">⚠ SLA Overdue — status changed to Pending</span>
                  : <span>SLA Time Remaining: <span className={`font-mono ${timeLeft ? "text-orange-600" : ""}`}>{timeLeft}</span></span>
                }
              </div>
              <div className="ml-auto text-[0.68vw] text-gray-400 font-mono">
                Deadline: {new Date(entry.slaDeadline).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Original Symptoms */}
        {(entry.symptoms || entry.rootCause) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[0.6vw] px-[1.2vw] py-[0.9vw] grid grid-cols-2 gap-[1vw]">
            {entry.symptoms && (
              <div>
                <div className="text-[0.65vw] text-yellow-600 font-semibold uppercase tracking-wide mb-[0.3vw] flex items-center gap-[0.3vw]"><AlertTriangle className="w-[0.75vw] h-[0.75vw]"/>Reported Symptoms</div>
                <div className="text-[0.78vw] text-gray-700 whitespace-pre-wrap">{entry.symptoms}</div>
              </div>
            )}
            {entry.rootCause && (
              <div>
                <div className="text-[0.65vw] text-yellow-600 font-semibold uppercase tracking-wide mb-[0.3vw] flex items-center gap-[0.3vw]"><AlertCircle className="w-[0.75vw] h-[0.75vw]"/>Reported Root Cause</div>
                <div className="text-[0.78vw] text-gray-700 whitespace-pre-wrap">{entry.rootCause}</div>
              </div>
            )}
          </div>
        )}

        {/* B. Inspection */}
        <SectionCard icon={<ClipboardList className="w-[1vw] h-[1vw]"/>} title="B. Inspection & Findings" collapsible defaultOpen>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="col-span-2">
              <Field label="Nature of Defect (Confirmed)">
                <select value={form.defectNature} onChange={e=>set("defectNature",e.target.value)} disabled={isClosed} className={`${isClosed?ro:inp} bg-white`}>
                  <option value="">Select defect type…</option>
                  {DEFECT_OPTIONS.map(o=><option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Current Status">
                <select value={form.status} onChange={e=>set("status",e.target.value)} disabled={isClosed} className={`${isClosed?ro:inp} bg-white`}>
                  {["In Progress","Pending","Rework Ongoing"].map(s=><option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Symptoms / Observations">
                <textarea rows={3} value={form.symptoms} onChange={e=>set("symptoms",e.target.value)} disabled={isClosed}
                  placeholder="Update or confirm symptoms observed during inspection…" className={isClosed?`${ro} h-auto`:ta}/>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Root Cause Analysis">
                <textarea rows={3} value={form.rootCause} onChange={e=>set("rootCause",e.target.value)} disabled={isClosed}
                  placeholder="Detailed root cause identified after inspection…" className={isClosed?`${ro} h-auto`:ta}/>
              </Field>
            </div>
            <div className="col-span-4">
              <Field label="Inspection Findings">
                <textarea rows={3} value={form.inspectionFindings} onChange={e=>set("inspectionFindings",e.target.value)} disabled={isClosed}
                  placeholder="Detailed findings from physical/dimensional inspection…" className={isClosed?`${ro} h-auto`:ta}/>
              </Field>
            </div>
            <div className="col-span-4">
              <Field label="Actions Taken (Rework / Correction / Replacement)">
                <textarea rows={3} value={form.actionsTaken} onChange={e=>set("actionsTaken",e.target.value)} disabled={isClosed}
                  placeholder="Describe exactly what was done to rectify the defect…" className={isClosed?`${ro} h-auto`:ta}/>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Corrective Actions">
                <textarea rows={2} value={form.correctiveActions} onChange={e=>set("correctiveActions",e.target.value)} disabled={isClosed}
                  placeholder="Corrective measures taken to prevent recurrence…" className={isClosed?`${ro} h-auto`:ta}/>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Preventive Measures">
                <textarea rows={2} value={form.preventiveMeasures} onChange={e=>set("preventiveMeasures",e.target.value)} disabled={isClosed}
                  placeholder="Systemic preventive actions for future batches…" className={isClosed?`${ro} h-auto`:ta}/>
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* C. Closure Report */}
        {!isClosed ? (
          <SectionCard icon={<FileText className="w-[1vw] h-[1vw]"/>} title="C. Closure Report" accent="green" collapsible defaultOpen>
            <div className="grid grid-cols-4 gap-[1.2vw]">
              <div className="col-span-2">
                <Field label="Final Outcome *">
                  <select value={form.finalOutcome} onChange={e=>set("finalOutcome",e.target.value)} className={`${inp} bg-white`}>
                    <option value="">Select final outcome…</option>
                    {OUTCOME_OPTIONS.map(o=><option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <div className="col-span-4">
                <Field label="Closure Remarks * (complete observations, actions, outcome)">
                  <textarea rows={4} value={form.closureRemarks} onChange={e=>set("closureRemarks",e.target.value)}
                    placeholder="Provide complete remarks: what was inspected, what was found, what was done, final result, QC sign-off…" className={ta}/>
                </Field>
              </div>

              {/* File upload */}
              <div className="col-span-4">
                <Field label="Closure Report Attachment">
                  <div className="border border-dashed border-gray-300 rounded-[0.4vw] p-[0.8vw]">
                    {files.length > 0 && (
                      <div className="mb-[0.6vw] space-y-[0.3vw]">
                        {files.map((f,i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-[0.3vw] px-[0.7vw] py-[0.4vw]">
                            <div className="flex items-center gap-[0.5vw]">
                              <FileText className="w-[0.9vw] h-[0.9vw] text-blue-500"/>
                              <span className="text-[0.75vw] text-gray-700 font-medium">{f.name}</span>
                              <span className="text-[0.65vw] text-gray-400">{(f.size/1024).toFixed(1)} KB · {f.addedAt}</span>
                            </div>
                            <button type="button" onClick={() => setFiles(fs=>fs.filter((_,j)=>j!==i))}
                              className="text-gray-300 hover:text-red-400 cursor-pointer"><X className="w-[0.85vw] h-[0.85vw]"/></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-[0.5vw] text-[0.75vw] text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-[0.9vw] py-[0.45vw] rounded-[0.35vw] cursor-pointer font-semibold">
                      <UploadCloud className="w-[0.9vw] h-[0.9vw]"/>Upload Closure Report
                    </button>
                    <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileAdd} className="hidden"/>
                  </div>
                </Field>
              </div>

              <div className="col-span-4 flex items-center gap-[0.8vw] pt-[0.3vw]">
                <button type="button" onClick={handleClose}
                  className="flex items-center gap-[0.5vw] bg-green-600 hover:bg-green-700 text-white px-[1.4vw] py-[0.65vw] rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer shadow-sm">
                  <CheckCircle className="w-[1vw] h-[1vw]"/>Close & Submit Final Report
                </button>
                <span className="text-[0.7vw] text-gray-400">Inspection Findings, Final Outcome and Closure Remarks are required to close.</span>
              </div>
            </div>
          </SectionCard>
        ) : (
          <div className="bg-green-50 border border-green-300 rounded-[0.6vw] p-[1.2vw]">
            <div className="flex items-center gap-[0.7vw] mb-[0.8vw]">
              <CheckCircle className="w-[1.4vw] h-[1.4vw] text-green-600 flex-shrink-0"/>
              <div>
                <div className="text-[0.9vw] font-bold text-green-700">Inward Entry Closed</div>
                <div className="text-[0.72vw] text-green-500">{form.closedAt && new Date(form.closedAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[1vw] text-[0.78vw]">
              <div><span className="text-gray-500 font-semibold">Final Outcome: </span><span className="text-gray-800">{form.finalOutcome}</span></div>
              <div><span className="text-gray-500 font-semibold">Closed By: </span><span className="text-gray-800">{form.updatedBy||"—"}</span></div>
              <div className="col-span-2"><span className="text-gray-500 font-semibold">Remarks: </span><span className="text-gray-700 whitespace-pre-wrap">{form.closureRemarks}</span></div>
            </div>
            {files.length>0 && (
              <div className="mt-[0.8vw] pt-[0.6vw] border-t border-green-200">
                <div className="text-[0.68vw] text-green-600 font-semibold mb-[0.3vw] uppercase tracking-wide">Attached Files</div>
                {files.map((f,i) => <div key={i} className="text-[0.72vw] text-gray-600 flex items-center gap-[0.4vw]"><FileText className="w-[0.8vw] h-[0.8vw] text-blue-400"/>{f.name}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isClosed && (
          <div className="flex justify-end gap-[1vw] sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw]">
            <button type="button" onClick={onBack} className="px-[1.5vw] py-[0.7vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold text-[0.78vw]">
              <X className="w-[1vw] h-[1vw]"/>Cancel
            </button>
            <button type="button" onClick={handleSaveProgress}
              className="px-[1.5vw] py-[0.7vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md text-[0.78vw]">
              <Save className="w-[1vw] h-[1vw]"/>Save Progress
            </button>
          </div>
        )}
        {isClosed && (
          <div className="flex justify-end sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw]">
            <button type="button" onClick={onBack} className="px-[1.5vw] py-[0.7vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold text-[0.78vw]">
              <ArrowLeft className="w-[1vw] h-[1vw]"/>Back to List
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN TABLE
// ══════════════════════════════════════════════════════════════════════════════
const AdminTableView = ({ entries, onEdit, onEmployeeView, onDelete, selectedItems, onToggleSelect, onToggleSelectPage, currentPage, setCurrentPage, filteredData, paginatedData, totalPages, isPageSelected }) => (
  <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 flex flex-col">
    <div className="overflow-y-auto max-h-[65vh] min-h-[65vh] rounded-t-[0.6vw]">
      <table className="w-full text-left border-collapse">
        <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="p-[0.6vw] border-b border-r border-gray-200 w-[3%] text-center">
              <button onClick={onToggleSelectPage} className="flex items-center justify-center w-full cursor-pointer">
                {isPageSelected ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600"/> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-400"/>}
              </button>
            </th>
            {["S.No","Ref No.","Date","Customer","Product","Defect","Batch","Qty","Assigned To","Status",""].map(h => (
              <th key={h} className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap text-[0.78vw]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedData.length > 0 ? paginatedData.map((row, i) => {
            const sn  = (currentPage-1)*ITEMS_PER_PAGE+i+1;
            const sel = selectedItems.has(row.id);
            const sc  = STATUS_COLORS[row.status]||"bg-gray-100 text-gray-600 border-gray-300";
            return (
              <tr key={row.id} className={`transition-colors ${sel?"bg-blue-50":"hover:bg-gray-50"}`}>
                <td className="p-[0.8vw] border-r border-gray-200 text-center">
                  <button onClick={() => onToggleSelect(row.id)} className="flex items-center justify-center w-full cursor-pointer">
                    {sel ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600"/> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-300 hover:text-gray-500"/>}
                  </button>
                </td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-600 font-medium text-center text-[0.75vw]">{sn}</td>
                <td className="p-[0.8vw] border-r border-gray-200 font-mono text-[0.74vw] text-blue-600 font-bold whitespace-nowrap">{row.refNo}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-500 text-[0.72vw] whitespace-nowrap">{row.dateTime}</td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  <div className="font-semibold text-gray-800 text-[0.78vw] truncate max-w-[9vw]" title={row.customerName}>{row.customerName||"—"}</div>
                  {row.customerCode && <div className="text-[0.62vw] text-gray-400 font-mono">{row.customerCode}</div>}
                </td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-700 text-[0.75vw] max-w-[10vw] truncate" title={row.productDescription}>{row.productDescription||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.75vw] text-gray-600 max-w-[8vw] truncate" title={row.defectNature}>{row.defectNature||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.72vw] text-gray-500 font-mono">{row.batchNo||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.75vw] text-gray-600">{row.quantity||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  {row.assignedTo
                    ? <div className="flex items-center gap-[0.4vw]"><Avatar name={row.assignedTo} size="sm"/><div><div className="text-[0.75vw] text-gray-700 font-medium">{row.assignedTo}</div><div className="text-[0.62vw] text-gray-400">{row.assignedDept}</div></div></div>
                    : <span className="text-gray-300 text-[0.72vw]">Unassigned</span>}
                </td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  <span className={`text-[0.68vw] px-[0.45vw] py-[0.12vw] rounded-full border font-semibold ${sc}`}>{row.status}</span>
                </td>
                <td className="p-[0.8vw] text-center">
                  <div className="flex items-center justify-center gap-[0.3vw]">
                    <button onClick={() => onEmployeeView(row)} title="Inspection View" className="text-gray-400 hover:text-teal-600 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-teal-50 transition-colors"><Eye className="w-[0.95vw] h-[0.95vw]"/></button>
                    <button onClick={() => onEdit(row)} title="Edit" className="text-gray-400 hover:text-blue-600 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-blue-50 transition-colors"><Edit3 className="w-[0.95vw] h-[0.95vw]"/></button>
                    <button onClick={() => onDelete(row.id)} title="Delete" className="text-gray-400 hover:text-red-500 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-red-50 transition-colors"><Trash2 className="w-[0.95vw] h-[0.95vw]"/></button>
                  </div>
                </td>
              </tr>
            );
          }) : <tr><td colSpan={12} className="py-[4vw] text-center text-gray-400 text-[0.82vw]">No records found.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="border-t border-blue-100 p-[0.6vw] bg-blue-50 flex justify-between items-center rounded-b-[0.6vw]">
      <div className="text-[0.8vw] text-gray-500">
        Showing <strong>{paginatedData.length>0?(currentPage-1)*ITEMS_PER_PAGE+1:0}</strong> to <strong>{Math.min(currentPage*ITEMS_PER_PAGE,filteredData.length)}</strong> of <strong>{filteredData.length}</strong> entries
      </div>
      <div className="flex items-center gap-[1.2vw]">
        <button onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronLeft className="w-[1vw] h-[1vw] text-gray-600"/></button>
        <div className="flex gap-[0.7vw]">
          {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
            let p=i+1; if(totalPages>5&&currentPage>3) p=currentPage-2+i; if(p>totalPages) return null;
            return <button key={p} onClick={()=>setCurrentPage(p)} className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium cursor-pointer ${currentPage===p?"bg-blue-600 text-white":"bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>{p}</button>;
          })}
        </div>
        <button onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages||totalPages===0} className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronRight className="w-[1vw] h-[1vw] text-gray-600"/></button>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE TABLE
// ══════════════════════════════════════════════════════════════════════════════
const EmployeeTableView = ({ myEntries, onOpen, currentPage, setCurrentPage, totalPages, paginatedData }) => (
  <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 flex flex-col">
    <div className="overflow-y-auto max-h-[65vh] min-h-[65vh] rounded-t-[0.6vw]">
      <table className="w-full text-left border-collapse">
        <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
          <tr>
            {["S.No","Ref No.","Date","Customer","Product","Defect","Batch","Qty","Status","Action"].map(h => (
              <th key={h} className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap text-[0.78vw]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedData.length > 0 ? paginatedData.map((row,i) => {
            const sn = (currentPage-1)*ITEMS_PER_PAGE+i+1;
            const sc = STATUS_COLORS[row.status]||"bg-gray-100 text-gray-600 border-gray-300";
            return (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-500 text-center text-[0.75vw] font-medium">{sn}</td>
                <td className="p-[0.8vw] border-r border-gray-200 font-mono text-[0.74vw] text-blue-600 font-bold whitespace-nowrap">{row.refNo}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-500 text-[0.72vw] whitespace-nowrap">{row.dateTime}</td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  <div className="font-semibold text-gray-800 text-[0.78vw] truncate max-w-[9vw]" title={row.customerName}>{row.customerName||"—"}</div>
                  {row.customerCode && <div className="text-[0.62vw] text-gray-400 font-mono">{row.customerCode}</div>}
                </td>
                <td className="p-[0.8vw] border-r border-gray-200 text-gray-700 text-[0.75vw] max-w-[10vw] truncate" title={row.productDescription}>{row.productDescription||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.75vw] text-gray-600">{row.defectNature||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.72vw] text-gray-500 font-mono">{row.batchNo||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200 text-[0.75vw] text-gray-600">{row.quantity||"—"}</td>
                <td className="p-[0.8vw] border-r border-gray-200">
                  <span className={`text-[0.68vw] px-[0.45vw] py-[0.12vw] rounded-full border font-semibold ${sc}`}>{row.status}</span>
                </td>
                <td className="p-[0.8vw] text-center">
                  <button onClick={() => onOpen(row)}
                    className={`flex items-center gap-[0.35vw] px-[0.8vw] py-[0.35vw] rounded-[0.35vw] text-[0.72vw] font-semibold cursor-pointer border transition-colors ${row.status==="Closed"?"border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100":"border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100"}`}>
                    {row.status==="Closed" ? <><Eye className="w-[0.85vw] h-[0.85vw]"/>View</> : <><ClipboardList className="w-[0.85vw] h-[0.85vw]"/>Update</>}
                  </button>
                </td>
              </tr>
            );
          }) : <tr><td colSpan={10} className="py-[4vw] text-center text-gray-400 text-[0.82vw]">No assignments found.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="border-t border-blue-100 p-[0.6vw] bg-blue-50 flex justify-between items-center rounded-b-[0.6vw]">
      <div className="text-[0.8vw] text-gray-500"><strong>{myEntries.length}</strong> assignment{myEntries.length!==1?"s":""}</div>
      <div className="flex items-center gap-[1.2vw]">
        <button onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronLeft className="w-[1vw] h-[1vw] text-gray-600"/></button>
        <div className="flex gap-[0.7vw]">
          {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
            let p=i+1; if(totalPages>5&&currentPage>3) p=currentPage-2+i; if(p>totalPages) return null;
            return <button key={p} onClick={()=>setCurrentPage(p)} className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium cursor-pointer ${currentPage===p?"bg-blue-600 text-white":"bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>{p}</button>;
          })}
        </div>
        <button onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages||totalPages===0} className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronRight className="w-[1vw] h-[1vw] text-gray-600"/></button>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function ProductionMaterialInward() {
  const [entries,       setEntries]       = useState(() => lsLoad(PMI_KEY, []));
  const [view,          setView]          = useState("table");
  const [editData,      setEditData]      = useState(null);
  const [activeEntry,   setActiveEntry]   = useState(null);
  const [filterStatus,  setFilterStatus]  = useState("All");
  const [searchQ,       setSearchQ]       = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const currentUser = useMemo(() => getCurrentUser(), []);

  const isAdmin = currentUser?.role === "Admin" || currentUser?.department === "Admin";

  const save = data => { setEntries(data); lsSave(PMI_KEY, data); };

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const current = lsLoad(PMI_KEY, []);
      let changed = false;
      const updated = current.map(e => {
        if (e.status === "Assigned" && e.slaDeadline && new Date(e.slaDeadline).getTime() <= now) {
          changed = true;
          return { ...e, status: "Pending" };
        }
        return e;
      });
      if (changed) { setEntries(updated); lsSave(PMI_KEY, updated); }
    };
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminSave = form => {
    const now = new Date().toISOString();
    if (!form.id) {
      save([{...form, id:`pmi-${Date.now()}`, timestamp:now, status:"Assigned", assignedAt:now}, ...entries]);
    } else {
      save(entries.map(e => e.id===form.id ? {...form, updatedAt:now, updatedBy:currentUser?.name||""} : e));
    }
    setView("table");
  };

  const handleEmployeeSave = form => {
    const now = new Date().toISOString();
    save(entries.map(e => e.id===form.id ? {...form, updatedAt:now, updatedBy:currentUser?.name||""} : e));
    setView("table");
  };

  const filteredData = useMemo(() => {
    const base = isAdmin ? entries : entries.filter(e => e.assignedToId===currentUser?.userId || e.assignedTo===currentUser?.name);
    const q = searchQ.toLowerCase();
    return base.filter(e => {
      const ms = filterStatus==="All" || e.status===filterStatus;
      const mq = !q || [e.refNo, e.customerName, e.productDescription, e.assignedTo].some(v => (v||"").toLowerCase().includes(q));
      return ms && mq;
    });
  }, [entries, filterStatus, searchQ, isAdmin, currentUser]);

  const totalPages    = Math.max(1, Math.ceil(filteredData.length/ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE);

  const toggleSelect     = id => setSelectedItems(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleSelectPage = () => {
    const ids = paginatedData.map(r => r.id);
    const all = ids.every(id => selectedItems.has(id));
    setSelectedItems(p => { const n=new Set(p); ids.forEach(id => all?n.delete(id):n.add(id)); return n; });
  };
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedItems.has(r.id));

  const counts = useMemo(() => {
    const base = isAdmin ? entries : entries.filter(e => e.assignedToId===currentUser?.userId || e.assignedTo===currentUser?.name);
    const c = { All: base.length };
    STATUS_OPTIONS.forEach(s => { c[s] = base.filter(e => e.status===s).length; });
    return c;
  }, [entries, isAdmin, currentUser]);

  useEffect(() => setCurrentPage(1), [filterStatus, searchQ]);

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      <AnimatePresence mode="wait">
        {view==="form" ? (
          <InwardForm key="form" initialData={editData} onSave={handleAdminSave} onCancel={() => setView("table")}/>
        ) : view==="employee" ? (
          <EmployeeResponseView key="employee" entry={activeEntry} onSave={handleEmployeeSave} onBack={() => setView("table")}/>
        ) : (
          <motion.div key="table" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}>

            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[0.9vw]">
              <div className="relative w-[30vw]">
                <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]"/>
                <input type="text" placeholder="Search by ref, customer, product, assignee…" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-300 rounded-[0.8vw] focus:outline-none focus:border-gray-800 text-[0.82vw]"/>
              </div>
              <div className="flex gap-[0.8vw] items-center">
                <AnimatePresence>
                  {isAdmin && selectedItems.size > 0 && (
                    <motion.button initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
                      onClick={() => { if (confirm(`Delete ${selectedItems.size} records?`)) { save(entries.filter(r => !selectedItems.has(r.id))); setSelectedItems(new Set()); } }}
                      className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-semibold text-[0.8vw] cursor-pointer">
                      <Trash2 className="w-[1vw] h-[1vw]"/>Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="bg-transparent font-medium text-gray-700 border border-gray-300 p-[0.4vw] rounded-[0.3vw] outline-none cursor-pointer h-[2.4vw] text-[0.8vw]">
                  <option value="All">All Status</option>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                {isAdmin && (
                  <button onClick={() => { setEditData(null); setView("form"); }}
                    className="cursor-pointer flex items-center gap-[0.5vw] bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-[1vw] h-[2.4vw] rounded-[0.4vw] text-[0.8vw]">
                    <Plus className="w-[1.2vw] h-[1.2vw]"/>Add
                  </button>
                )}
              </div>
            </div>

            {/* Status chips */}
            <div className="flex gap-[0.8vw] mb-[0.9vw] flex-wrap">
              {[
                {label:"All",      color:"bg-gray-100 text-gray-700 border-gray-200",     dot:"bg-gray-400"},
                {label:"Assigned", color:"bg-purple-50 text-purple-700 border-purple-200", dot:"bg-purple-500"},
                {label:"Pending",  color:"bg-orange-50 text-orange-700 border-orange-200", dot:"bg-orange-500"},
                {label:"Closed",   color:"bg-green-50 text-green-700 border-green-200",    dot:"bg-green-500"},
              ].map(({label,color,dot}) => (
                <button key={label} onClick={() => setFilterStatus(label==="All"?"All":label)}
                  className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.55vw] rounded-[0.5vw] border font-medium text-[0.8vw] cursor-pointer transition-all ${color} ${filterStatus===(label==="All"?"All":label)?"ring-2 ring-offset-1 ring-blue-300 shadow-sm":"opacity-80 hover:opacity-100"}`}>
                  <span className={`w-[0.6vw] h-[0.6vw] rounded-full ${dot}`}/>
                  {label} <span className="font-bold">{counts[label]??0}</span>
                </button>
              ))}
            </div>

            {isAdmin ? (
              <AdminTableView
                entries={entries}
                onEdit={row => { setEditData({...row}); setView("form"); }}
                onEmployeeView={row => { setActiveEntry({...row}); setView("employee"); }}
                onDelete={id => { if (confirm("Delete this entry?")) save(entries.filter(r => r.id!==id)); }}
                selectedItems={selectedItems} onToggleSelect={toggleSelect} onToggleSelectPage={toggleSelectPage}
                currentPage={currentPage} setCurrentPage={setCurrentPage}
                filteredData={filteredData} paginatedData={paginatedData}
                totalPages={totalPages} isPageSelected={isPageSelected}
              />
            ) : (
              <EmployeeTableView
                myEntries={filteredData}
                onOpen={row => { setActiveEntry({...row}); setView("employee"); }}
                currentPage={currentPage} setCurrentPage={setCurrentPage}
                totalPages={totalPages} paginatedData={paginatedData}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}