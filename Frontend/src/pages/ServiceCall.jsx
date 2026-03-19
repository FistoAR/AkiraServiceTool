import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, X, Trash2, Save, ChevronLeft, ChevronRight,
  CheckSquare, Square, Edit3, ArrowLeft, Plus, Clock,
  User, Package, AlertCircle, CheckCircle, History,
  Smartphone, PlusCircle, MinusCircle, UserPlus,
  Phone, FileText, Settings, MapPin, Mail,
  ChevronDown, ChevronUp, ArrowRight, Activity,
  Shield, Wrench, HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ──────────────────────────────────────────────────────────────────
const CUSTOMER_DB_KEY  = "customer_db_grouped_v5";
const SERVICE_CALLS_KEY = "service_calls_v2";
const PARTY_TYPES_KEY  = "party_types_v1";
const EMPLOYEES_KEY    = "employees";
const ESCALATION_KEY   = "escalation_queue_v1";
const MODES_KEY        = "call_modes_v1";
const SUPPORT_REQ_KEY  = "support_requests_v1";
const FIELD_VISIT_KEY  = "field_visits_v1";
const INHOUSE_KEY      = "inhouse_repairs_v1";

const DEFAULT_MODES = ["Phone", "Email", "WhatsApp", "Portal"];
const PRIORITIES    = ["Low", "Medium", "High", "Critical"];
const WARRANTY_STATUS = ["In Warranty", "Out of Warranty"];
const ESCALATION_TIMEOUT_MS = 1 * 60 * 1000;
const ITEMS_PER_PAGE = 10;

const PRIORITY_COLORS = {
  Low:      "bg-green-100 text-green-700",
  Medium:   "bg-yellow-100 text-yellow-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};
const STATUS_COLORS = {
  Open:     "bg-green-100 text-green-700",
  Assigned: "bg-blue-100 text-blue-700",
  Pending:  "bg-yellow-100 text-yellow-700",
  Closed:   "bg-gray-100 text-gray-600",
};

// ── Product-level status derivation (mirrors EscalationPage) ──────────────────
const getProductStatus = (p) => {
  if (!p) return "open";
  if (p._resolved)                              return "resolved";
  if (p._productClosure?.status === "Closed")   return "closed";
  if (p._productClosure?.status === "Pending")  return "pending";
  if (p._supportRequested)                      return "support";
  return "open";
};
const PROD_STATUS_CFG = {
  resolved: { label: "Resolved",    dot: "bg-green-500",  cls: "bg-green-50 border-green-300 text-green-700"    },
  closed:   { label: "Closed",      dot: "bg-green-400",  cls: "bg-green-50 border-green-300 text-green-600"    },
  pending:  { label: "Pending",     dot: "bg-yellow-500", cls: "bg-yellow-50 border-yellow-300 text-yellow-700" },
  support:  { label: "Support Req", dot: "bg-orange-500", cls: "bg-orange-50 border-orange-300 text-orange-700" },
  open:     { label: "Open",        dot: "bg-blue-400",   cls: "bg-blue-50 border-blue-300 text-blue-700"       },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const lsLoad  = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave  = (key, v)  => localStorage.setItem(key, JSON.stringify(v));

const generateCallNumber = () => {
  const d    = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SC-${date}-${rand}`;
};

const emptyProduct = () => ({
  itemCode: "", productSegment: "", productModel: "",
  serialNumber: "", dateOfSupply: "", warrantyPeriodDays: "",
  warrantyStatus: "In Warranty", callDescription: "", errorCode: "",
  mediaReceived: "No",
});

const emptyForm = () => ({
  id: null, callNumber: generateCallNumber(),
  dateTime: new Date().toLocaleString(),
  timestamp: new Date().toISOString(),
  mode: "", priority: "Medium",
  customerType: "All", partyCode: "", customerName: "",
  contactPerson: "", contactNumber: "", emailId: "", location: "",
  products: [emptyProduct()],
  assignedEngineer: "", assignedEngineerName: "", assignedDepartment: "",
  assignmentDate: new Date().toISOString().slice(0, 16),
  expectedResponse: "", ackSent: "No", sentBy: "Auto",
  status: "Open", escalationLevel: 0, escalationHistory: [],
  resolvedAt: null, assignedAt: null,
});

// ── Avatar helpers ────────────────────────────────────────────────────────────
const initials = (name = "") =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const AVATAR_COLORS = [
  "from-blue-400 to-blue-600",   "from-purple-400 to-purple-600",
  "from-green-400 to-green-600", "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",   "from-teal-400 to-teal-600",
  "from-yellow-400 to-yellow-600","from-red-400 to-red-600",
];
const avatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const Avatar = ({ name, size = "md", ring = false, title }) => {
  const sz  = { sm: "w-[1.4vw] h-[1.4vw] text-[0.52vw]", md: "w-[1.8vw] h-[1.8vw] text-[0.65vw]", lg: "w-[2.4vw] h-[2.4vw] text-[0.82vw]" };
  return (
    <div title={title || name}
      className={`rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-bold text-white flex-shrink-0 ${sz[size]} ${ring ? "ring-[0.12vw] ring-white" : ""}`}>
      {initials(name)}
    </div>
  );
};

// ── Collect all people involved in a call ─────────────────────────────────────
const getPeopleFlow = (entry) => {
  if (!entry) return [];
  const seen = new Map(); // id → { name, dept, role, steps }

  const add = (id, name, dept, role, time) => {
    if (!name || name === "auto" || name === "Auto-assigned") return;
    const key = id || name;
    if (!seen.has(key)) seen.set(key, { id: key, name, dept, role, events: [] });
    seen.get(key).events.push({ role, time });
  };

  // Call-level escalation history
  (entry.escalationHistory || []).forEach(h => {
    add(h.engineerId, h.engineerName, h.department, `L${h.level + 1} — ${h.department}`, h.assignedAt);
  });

  // Per-product escalation histories
  (entry.products || []).forEach((p, pi) => {
    (p._escalationHistory || []).forEach(h => {
      add(h.engineerId, h.engineerName, h.department,
        `P${pi + 1} L${h.level + 1} — ${h.department}`, h.assignedAt);
    });
    // Support person
    if (p._supportPersonId) {
      add(p._supportPersonId, p._supportPersonName, p._currentDepartment,
        `P${pi + 1} Support`, new Date().toISOString());
    }
  });

  return Array.from(seen.values());
};

// ── Build full chronological flow for modal ────────────────────────────────────
const buildFullFlow = (entry, supportReqs, fieldVisits, inhouseRepairs) => {
  if (!entry) return [];
  const events = [];

  // Call-level assignments
  (entry.escalationHistory || []).forEach(h => {
    events.push({
      time:   h.assignedAt,
      type:   "assign",
      level:  h.level,
      person: h.engineerName,
      dept:   h.department,
      label:  `Assigned — L${h.level + 1}`,
      reason: h.reason,
      scope:  "call",
    });
  });

  // Per-product events
  (entry.products || []).forEach((p, pi) => {
    const pLabel = `P${pi + 1}: ${p.productModel || p.itemCode || "Product"}`;

    (p._escalationHistory || []).forEach(h => {
      events.push({
        time:   h.assignedAt,
        type:   "escalate",
        level:  h.level,
        person: h.engineerName,
        dept:   h.department,
        label:  `${pLabel} → ${h.department}`,
        reason: h.reason,
        scope:  "product",
        product: pLabel,
      });
    });

    if (p._resolved) {
      events.push({
        time:   p._resolvedAt || new Date().toISOString(),
        type:   "resolve",
        person: entry.currentEngineerName,
        dept:   entry.currentDepartment,
        label:  `${pLabel} Resolved`,
        reason: p._resolutionRemarks || p._resolutionType,
        scope:  "product",
        product: pLabel,
      });
    }
    if (p._productClosure?.closedAt) {
      events.push({
        time:   p._productClosure.closedAt,
        type:   "close",
        person: entry.currentEngineerName,
        dept:   entry.currentDepartment,
        label:  `${pLabel} Closed`,
        reason: p._productClosure.remarks,
        scope:  "product",
        product: pLabel,
      });
    }
    if (p._productClosure?.status === "Pending") {
      events.push({
        time:   p._productClosure.pendingAt || new Date().toISOString(),
        type:   "pending",
        person: entry.currentEngineerName,
        dept:   entry.currentDepartment,
        label:  `${pLabel} Marked Pending`,
        reason: p._productClosure.remarks,
        scope:  "product",
        product: pLabel,
      });
    }
  });

  // Support requests
  (supportReqs || []).filter(s => s.callId === entry.callId).forEach(s => {
    const pLabel = s.product ? (s.product.productModel || s.product.itemCode || `P${s.productIdx + 1}`) : "";
    events.push({
      time:   s.createdAt,
      type:   "support",
      person: `${s.requestedByName} → ${s.supportPerson?.name}`,
      dept:   s.supportPerson?.department,
      label:  `Support Request${pLabel ? " · " + pLabel : ""}`,
      reason: s.notes,
      scope:  "support",
    });
    if (s.resolvedAt) {
      events.push({
        time:   s.resolvedAt,
        type:   "resolve",
        person: s.supportPerson?.name,
        dept:   s.supportPerson?.department,
        label:  `Support Resolved${pLabel ? " · " + pLabel : ""}`,
        reason: s.resolutionNotes,
        scope:  "support",
      });
    }
  });

  // Field visits
  (fieldVisits || []).filter(f => f.callId === entry.callId).forEach(f => {
    events.push({
      time:   f.assignmentDate || f.createdAt,
      type:   "fieldvisit",
      person: f.assignedToName,
      dept:   "Field",
      label:  `Field Visit Assigned${f.productIdx != null ? " · P" + (f.productIdx + 1) : ""}`,
      reason: f.diagnosisSummary,
      scope:  "visit",
    });
    if (f.visitStatus === "Closed" && f.closedAt) {
      events.push({
        time:   f.closedAt,
        type:   "close",
        person: f.assignedToName,
        dept:   "Field",
        label:  `Field Visit Completed`,
        reason: f.resolutionRemarks,
        scope:  "visit",
      });
    }
  });

  // In-house repairs
  (inhouseRepairs || []).filter(r => r.callId === entry.callId).forEach(r => {
    events.push({
      time:   r.assignmentDate || r.createdAt,
      type:   "inhouse",
      person: r.assignedToName,
      dept:   "In-house",
      label:  `In-house Repair Assigned${r.productIdx != null ? " · P" + (r.productIdx + 1) : ""}`,
      reason: r.diagnosisSummary,
      scope:  "repair",
    });
    if (r.visitStatus === "Closed" && r.closedAt) {
      events.push({
        time:   r.closedAt,
        type:   "close",
        person: r.assignedToName,
        dept:   "In-house",
        label:  `In-house Repair Completed`,
        reason: r.resolutionRemarks,
        scope:  "repair",
      });
    }
  });

  return events.sort((a, b) => new Date(a.time) - new Date(b.time));
};

// ── Flow Modal ────────────────────────────────────────────────────────────────
const FlowModal = ({ row, onClose }) => {
  const callId      = row.id || row.callId;
  const queue       = lsLoad(ESCALATION_KEY, []);
  const entry       = queue.find(e => e.callId === callId || e.callNumber === row.callNumber);
  const supReqs     = lsLoad(SUPPORT_REQ_KEY, []);
  const fvs         = lsLoad(FIELD_VISIT_KEY, []);
  const ihs         = lsLoad(INHOUSE_KEY, []);
  const productCount = entry?.products?.length || row._products?.length || row.products?.length || 0;
  const [activeTab, setActiveTab] = useState(row._focusProduct != null ? row._focusProduct : "all");

  const people = getPeopleFlow(entry);
  const flow   = buildFullFlow(entry, supReqs, fvs, ihs);

  const visibleFlow = activeTab === "all" ? flow : flow.filter(ev => {
    const pLabel = `P${activeTab + 1}:`;
    if (ev.scope === "product") return ev.product?.startsWith(pLabel) || ev.label?.includes(`P${activeTab + 1}`);
    return ev.scope === "call";
  });
  const visiblePeople = activeTab === "all" ? people : people.filter(p =>
    p.events.some(ev => ev.role?.includes(`P${activeTab + 1}`) || !ev.role?.match(/^P\d/))
  );

  const TYPE_CFG = {
    assign:     { icon: User,         cls: "bg-blue-500",   label: "bg-blue-50 border-blue-200 text-blue-700"     },
    escalate:   { icon: ChevronRight, cls: "bg-orange-500", label: "bg-orange-50 border-orange-200 text-orange-700"},
    resolve:    { icon: CheckCircle,  cls: "bg-green-500",  label: "bg-green-50 border-green-200 text-green-700"  },
    close:      { icon: CheckCircle,  cls: "bg-green-600",  label: "bg-green-50 border-green-200 text-green-700"  },
    pending:    { icon: Clock,        cls: "bg-yellow-500", label: "bg-yellow-50 border-yellow-200 text-yellow-700"},
    support:    { icon: HelpCircle,   cls: "bg-orange-500", label: "bg-orange-50 border-orange-200 text-orange-700"},
    fieldvisit: { icon: MapPin,       cls: "bg-blue-600",   label: "bg-blue-50 border-blue-200 text-blue-700"     },
    inhouse:    { icon: Wrench,       cls: "bg-purple-600", label: "bg-purple-50 border-purple-200 text-purple-700"},
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
      <div className="bg-white w-[58vw] max-h-[88vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-[1.4vw] py-[0.9vw] flex-shrink-0">
          <div className="flex items-center justify-between mb-[0.7vw]">
            <div>
              <div className="flex items-center gap-[0.6vw]">
                <Activity className="w-[1.1vw] h-[1.1vw] text-blue-300" />
                <span className="text-[1vw] font-bold text-white font-mono">{row.callNumber}</span>
                <span className={`text-[0.65vw] px-[0.5vw] py-[0.1vw] rounded-full font-bold ${
                  row.priority === "Critical" ? "bg-red-500 text-white" :
                  row.priority === "High"     ? "bg-orange-400 text-white" :
                  "bg-blue-400 text-white"}`}>{row.priority}</span>
              </div>
              <p className="text-[0.75vw] text-gray-300 mt-[0.1vw]">{row.customerName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
              <X className="w-[1.2vw] h-[1.2vw]" />
            </button>
          </div>
          {/* Product tabs */}
          <div className="flex gap-[0.4vw] flex-wrap">
            <button onClick={() => setActiveTab("all")}
              className={`px-[0.7vw] py-[0.25vw] rounded-[0.3vw] text-[0.65vw] font-semibold transition-colors cursor-pointer ${activeTab === "all" ? "bg-white text-gray-800" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
              All Products
            </button>
            {Array.from({ length: productCount }, (_, pi) => {
              const p = entry?.products?.[pi];
              const name = p?.productModel || p?.itemCode || `Product ${pi + 1}`;
              const cfg  = PROD_STATUS_CFG[getProductStatus(p || {})];
              return (
                <button key={pi} onClick={() => setActiveTab(pi)}
                  className={`flex items-center gap-[0.3vw] px-[0.7vw] py-[0.25vw] rounded-[0.3vw] text-[0.65vw] font-semibold transition-colors cursor-pointer ${activeTab === pi ? "bg-white text-gray-800" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
                  <div className={`w-[0.4vw] h-[0.4vw] rounded-full ${cfg.dot}`} />
                  P{pi + 1}: {name.length > 18 ? name.slice(0, 16) + "…" : name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left: People involved */}
          <div className="w-[30%] border-r border-gray-100 bg-gray-50 p-[1vw] overflow-y-auto flex-shrink-0">
            <div className="text-[0.68vw] font-bold text-gray-400 uppercase tracking-wider mb-[0.7vw] flex items-center gap-[0.3vw]">
              <User className="w-[0.75vw] h-[0.75vw]" />People Involved
              <span className="ml-auto bg-gray-200 text-gray-600 px-[0.4vw] rounded-full text-[0.6vw] font-bold">{visiblePeople.length}</span>
            </div>
            {visiblePeople.length === 0 ? (
              <p className="text-[0.75vw] text-gray-400 italic">No flow data yet</p>
            ) : (
              <div className="space-y-[0.5vw]">
                {visiblePeople.map((person, i) => (
                  <div key={person.id} className="bg-white border border-gray-200 rounded-[0.4vw] p-[0.6vw] flex items-start gap-[0.5vw]">
                    <Avatar name={person.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.78vw] font-bold text-gray-800 truncate">{person.name}</div>
                      <div className="text-[0.68vw] text-gray-500 truncate">{person.dept}</div>
                      <div className="flex flex-wrap gap-[0.2vw] mt-[0.25vw]">
                        {person.events.slice(0, 2).map((ev, ei) => (
                          <span key={ei} className="text-[0.58vw] bg-blue-50 text-blue-600 border border-blue-100 px-[0.3vw] py-[0.05vw] rounded font-semibold truncate max-w-[8vw]">{ev.role}</span>
                        ))}
                        {person.events.length > 2 && (
                          <span className="text-[0.58vw] bg-gray-100 text-gray-500 px-[0.3vw] rounded">+{person.events.length - 2}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[0.6vw] text-gray-300 font-mono flex-shrink-0">#{i + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Chronological flow */}
          <div className="flex-1 p-[1vw] overflow-y-auto">
            <div className="text-[0.68vw] font-bold text-gray-400 uppercase tracking-wider mb-[0.7vw] flex items-center gap-[0.3vw]">
              <Activity className="w-[0.75vw] h-[0.75vw]" />Chronological Flow
              <span className="ml-auto bg-gray-200 text-gray-600 px-[0.4vw] rounded-full text-[0.6vw] font-bold">{visibleFlow.length} events</span>
            </div>

            {visibleFlow.length === 0 ? (
              <div className="text-center py-[2vw] text-gray-400 text-[0.8vw]">No flow events recorded yet</div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[0.85vw] top-0 bottom-0 w-[0.1vw] bg-gray-200" />
                <div className="space-y-[0.6vw]">
                  {visibleFlow.map((ev, i) => {
                    const cfg = TYPE_CFG[ev.type] || TYPE_CFG.assign;
                    const Icon = cfg.icon;
                    const isFirst = i === 0;
                    const isLast  = i === visibleFlow.length - 1;
                    return (
                      <div key={i} className="flex gap-[0.8vw] relative">
                        {/* Dot */}
                        <div className={`w-[1.7vw] h-[1.7vw] rounded-full ${cfg.cls} flex items-center justify-center flex-shrink-0 relative z-10 ${isFirst ? "ring-[0.18vw] ring-offset-1 ring-blue-400" : ""} ${isLast && (ev.type === "resolve" || ev.type === "close") ? "ring-[0.18vw] ring-offset-1 ring-green-400" : ""}`}>
                          <Icon className="w-[0.85vw] h-[0.85vw] text-white" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 bg-white border border-gray-100 rounded-[0.4vw] p-[0.55vw] shadow-sm">
                          <div className="flex items-start justify-between gap-[0.4vw]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-[0.4vw] flex-wrap">
                                <span className="text-[0.78vw] font-bold text-gray-800">{ev.label}</span>
                                {ev.scope && (
                                  <span className={`text-[0.6vw] px-[0.35vw] py-[0.05vw] rounded border font-semibold ${cfg.label}`}>{ev.scope}</span>
                                )}
                              </div>
                              {ev.person && (
                                <div className="flex items-center gap-[0.35vw] mt-[0.2vw]">
                                  <Avatar name={ev.person.split("→")[0].trim()} size="sm" />
                                  <span className="text-[0.72vw] text-gray-600">{ev.person}</span>
                                  {ev.dept && <span className="text-[0.65vw] text-gray-400">· {ev.dept}</span>}
                                </div>
                              )}
                              {ev.reason && (
                                <div className="text-[0.68vw] text-gray-500 mt-[0.2vw] bg-gray-50 border border-gray-100 rounded-[0.25vw] px-[0.4vw] py-[0.15vw]">
                                  {ev.reason}
                                </div>
                              )}
                            </div>
                            <div className="text-[0.62vw] text-gray-400 font-mono flex-shrink-0 whitespace-nowrap">
                              {new Date(ev.time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products summary bar */}
        {entry?.products?.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50 px-[1.4vw] py-[0.6vw] flex items-center gap-[1vw] flex-shrink-0">
            <span className="text-[0.68vw] font-bold text-gray-400 uppercase">Products</span>
            {entry.products.map((p, i) => {
              const cfg = PROD_STATUS_CFG[getProductStatus(p)];
              return (
                <div key={i} className={`flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded-full border text-[0.68vw] font-semibold ${cfg.cls}`}>
                  <div className={`w-[0.45vw] h-[0.45vw] rounded-full ${cfg.dot}`} />
                  P{i + 1}: {p.productModel || p.itemCode || "—"} · {cfg.label}
                </div>
              );
            })}
          </div>
        )}

        <div className="px-[1.4vw] py-[0.7vw] bg-white border-t border-gray-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-[1.5vw] py-[0.5vw] bg-gray-800 hover:bg-gray-900 text-white rounded-[0.4vw] text-[0.82vw] font-semibold cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Config Manager Modal ───────────────────────────────────────────────────────
const ConfigManagerModal = ({ title, icon: Icon, items, onClose, onSave }) => {
  const [localItems, setLocalItems] = useState([...items]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue]   = useState("");
  const [newValue, setNewValue]     = useState("");
  const [delConfirm, setDelConfirm] = useState(null);
  const inputRef = useRef(null);
  const editRef  = useRef(null);
  useEffect(() => { if (editingIdx !== null && editRef.current) { editRef.current.focus(); editRef.current.select(); } }, [editingIdx]);
  const handleAdd = () => {
    const t = newValue.trim(); if (!t) return;
    if (localItems.some(i => i.toLowerCase() === t.toLowerCase())) { alert(`"${t}" already exists!`); return; }
    setLocalItems([...localItems, t]); setNewValue("");
    if (inputRef.current) inputRef.current.focus();
  };
  const handleSaveEdit = (idx) => {
    const t = editValue.trim(); if (!t) return;
    if (localItems.some((i, n) => n !== idx && i.toLowerCase() === t.toLowerCase())) { alert(`"${t}" already exists!`); return; }
    const u = [...localItems]; u[idx] = t; setLocalItems(u); setEditingIdx(null);
  };
  const handleDelete = (idx) => {
    if (localItems.length <= 1) { alert("Must have at least one item."); return; }
    setLocalItems(localItems.filter((_, i) => i !== idx)); setDelConfirm(null);
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[32vw] rounded-[0.6vw] shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-[1.2vw] py-[0.8vw] border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-[1vw] font-semibold text-gray-800 flex items-center gap-[0.5vw]"><Icon className="w-[1.1vw] h-[1.1vw]" />{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
        </div>
        <div className="px-[1.2vw] pt-[1vw] pb-[0.6vw]">
          <div className="flex gap-[0.5vw]">
            <input ref={inputRef} type="text" value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1 border border-gray-300 rounded-[0.4vw] px-[0.7vw] py-[0.55vw] text-[0.85vw] outline-none focus:border-gray-400" />
            <button type="button" onClick={handleAdd} disabled={!newValue.trim()}
              className="px-[0.9vw] py-[0.55vw] bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white rounded-[0.4vw] flex items-center gap-[0.3vw] text-[0.8vw] font-medium cursor-pointer">
              <Plus className="w-[0.9vw] h-[0.9vw]" />Add
            </button>
          </div>
        </div>
        <div className="px-[1.2vw] pb-[0.8vw] flex-1 overflow-y-auto space-y-[0.4vw]">
          {localItems.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-[0.5vw] rounded-[0.4vw] border p-[0.5vw] ${editingIdx === idx ? "border-gray-400 bg-gray-50" : delConfirm === idx ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
              {editingIdx === idx ? (
                <>
                  <input ref={editRef} type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(idx); if (e.key === "Escape") setEditingIdx(null); }}
                    className="flex-1 border border-gray-300 rounded-[0.3vw] px-[0.6vw] py-[0.4vw] text-[0.85vw] outline-none" />
                  <button type="button" onClick={() => handleSaveEdit(idx)} className="text-gray-700 hover:text-gray-900 cursor-pointer p-[0.3vw]"><CheckCircle className="w-[1vw] h-[1vw]" /></button>
                  <button type="button" onClick={() => setEditingIdx(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-[0.3vw]"><X className="w-[1vw] h-[1vw]" /></button>
                </>
              ) : delConfirm === idx ? (
                <>
                  <div className="flex-1 text-[0.8vw] text-red-700 font-medium">Delete "{item}"?</div>
                  <button type="button" onClick={() => handleDelete(idx)} className="text-[0.75vw] text-white bg-red-600 px-[0.6vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer">Confirm</button>
                  <button type="button" onClick={() => setDelConfirm(null)} className="text-[0.75vw] text-gray-600 border border-gray-300 px-[0.6vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer">Cancel</button>
                </>
              ) : (
                <>
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-100 flex items-center justify-center text-[0.65vw] text-gray-500 font-bold">{idx + 1}</div>
                  <span className="flex-1 text-[0.85vw] text-gray-800 font-medium">{item}</span>
                  <button type="button" onClick={() => { setEditingIdx(idx); setEditValue(item); setDelConfirm(null); }} className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.3vw]"><Edit3 className="w-[0.85vw] h-[0.85vw]" /></button>
                  <button type="button" onClick={() => { setDelConfirm(idx); setEditingIdx(null); }} disabled={localItems.length <= 1} className="text-gray-400 hover:text-red-600 disabled:text-gray-200 cursor-pointer p-[0.3vw]"><Trash2 className="w-[0.85vw] h-[0.85vw]" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="px-[1.2vw] py-[0.8vw] border-t border-gray-200 flex justify-end gap-[0.7vw] bg-gray-50">
          <button type="button" onClick={onClose} className="px-[1.2vw] py-[0.5vw] border border-gray-300 bg-white text-gray-700 rounded-[0.4vw] cursor-pointer text-[0.85vw] font-medium">Cancel</button>
          <button type="button" onClick={() => { onSave(localItems); onClose(); }} className="px-[1.2vw] py-[0.5vw] bg-gray-800 hover:bg-gray-900 text-white rounded-[0.4vw] cursor-pointer flex items-center gap-[0.4vw] text-[0.85vw] font-medium">
            <Save className="w-[0.9vw] h-[0.9vw]" />Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Entry Form ─────────────────────────────────────────────────────────────────
const ServiceCallForm = ({ initialData, customerDb, serviceCalls, partyTypes, employees, modes, onSave, onBack, onSaveModes }) => {
  const [formData, setFormData]           = useState(initialData);
  const [showCustSearch, setShowCustSearch] = useState(false);
  const [showProdSearch, setShowProdSearch] = useState({});
  const [showEngineerDrop, setShowEngineerDrop] = useState(false);
  const [engineerSearch, setEngineerSearch]     = useState("");
  const [showModesManager, setShowModesManager] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ partyCode: "", partyDescription: "", partyType: partyTypes[0]?.name || "", items: [{ productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "" }] });

  const custRef     = useRef(null);
  const engineerRef = useRef(null);
  const prodRefs    = useRef({});
  const isEdit      = !!initialData._editing;

  useEffect(() => {
    const handler = (e) => {
      if (custRef.current && !custRef.current.contains(e.target)) setShowCustSearch(false);
      if (engineerRef.current && !engineerRef.current.contains(e.target)) setShowEngineerDrop(false);
      Object.keys(prodRefs.current).forEach(k => {
        if (prodRefs.current[k] && !prodRefs.current[k].contains(e.target))
          setShowProdSearch(p => ({ ...p, [k]: false }));
      });
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const supportEngineers  = useMemo(() => employees.filter(e => e.department === "Support Engineer"), [employees]);
  const filteredEngineers = useMemo(() => supportEngineers.filter(e =>
    e.name.toLowerCase().includes(engineerSearch.toLowerCase()) || e.userId.toLowerCase().includes(engineerSearch.toLowerCase())
  ), [supportEngineers, engineerSearch]);

  const filteredCustomers = useMemo(() => {
    const map = new Map();
    customerDb.forEach(item => {
      if (formData.customerType === "All" || item.partyType === formData.customerType)
        if (!map.has(item.partyCode)) map.set(item.partyCode, { code: item.partyCode, name: item.partyDescription, type: item.partyType });
    });
    return Array.from(map.values());
  }, [customerDb, formData.customerType]);

  const availableProducts = useMemo(() => {
    if (!formData.partyCode) return [];
    const selected = new Set(formData.products.map(p => p.itemCode).filter(Boolean));
    return customerDb.filter(i => i.partyCode === formData.partyCode && !selected.has(i.itemCode));
  }, [customerDb, formData.partyCode, formData.products]);

  const customerHistory = useMemo(() => {
    if (!formData.partyCode) return [];
    return serviceCalls.filter(c => c.partyCode === formData.partyCode).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [formData.partyCode, serviceCalls]);

  const getProductHistory = (serialNumber) => {
    if (!serialNumber) return [];
    return serviceCalls.filter(c => c.products?.some(p => p.serialNumber?.toLowerCase() === serialNumber.toLowerCase())).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const selectCustomer = (code, name, type) => {
    const rows = customerDb.filter(i => i.partyCode === code);
    const loc  = rows[0] ? [rows[0].districtCity, rows[0].state].filter(Boolean).join(", ") : "";
    setFormData(p => ({ ...p, partyCode: code, customerName: name, customerType: type, location: loc || p.location, products: [emptyProduct()] }));
    setShowCustSearch(false);
  };
  const selectEngineer = (eng) => {
    setFormData(p => ({ ...p, assignedEngineer: eng.userId, assignedEngineerName: eng.name, assignedDepartment: eng.department }));
    setEngineerSearch(""); setShowEngineerDrop(false);
  };
  const selectProduct = (idx, prod) => {
    setFormData(p => ({ ...p, products: p.products.map((pr, i) => i === idx ? { ...pr, itemCode: prod.itemCode, productSegment: prod.productSegment || "", productModel: prod.itemDescription, warrantyPeriodDays: prod.warrantyPeriodDays || "" } : pr) }));
    setShowProdSearch(p => ({ ...p, [idx]: false }));
  };
  const addProduct    = () => setFormData(p => ({ ...p, products: [...p.products, emptyProduct()] }));
  const removeProduct = (idx) => { if (formData.products.length === 1) return; setFormData(p => ({ ...p, products: p.products.filter((_, i) => i !== idx) })); };
  const changeProduct = (idx, field, val) => setFormData(p => ({ ...p, products: p.products.map((pr, i) => i === idx ? { ...pr, [field]: val } : pr) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const now = new Date();
    const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
    let masterFlow = null;
    try {
      const allFlows = JSON.parse(localStorage.getItem(ESCALATION_FLOWS_KEY) || "{}");
      const custDb   = JSON.parse(localStorage.getItem(CUSTOMER_DB_KEY) || "[]");
      const custRow  = custDb.find(r => r.partyCode === formData.partyCode);
      const partyType = custRow?.partyType;
      if (partyType && allFlows[partyType]?.length > 0) masterFlow = allFlows[partyType];
    } catch {}
    const DEFAULT_FLOW = [
      { dept: "Support Engineer",  durationHours: 2, durationMins: 0 },
      { dept: "Service Engineer",  durationHours: 4, durationMins: 0 },
      { dept: "R&D",               durationHours: 8, durationMins: 0 },
    ];
    const flow = masterFlow || DEFAULT_FLOW;
    const pickEngineer = (step) => {
      if (step.engineerIds?.length > 0) {
        const emps = JSON.parse(localStorage.getItem("employees") || "[]");
        const eng  = emps.find(e => step.engineerIds.includes(e.userId));
        if (eng) return { id: eng.userId, name: eng.name };
      }
      return { id: "auto", name: "Auto-assigned" };
    };
    let firstEngId, firstEngName, firstDept, firstDeadline;
    if (formData.assignedEngineer) {
      firstEngId   = formData.assignedEngineer;
      firstEngName = formData.assignedEngineerName;
      firstDept    = formData.assignedDepartment || flow[0]?.dept || "Support Engineer";
      const dur    = (flow[0]?.durationHours ?? 2) * 60 * 60 * 1000 + (flow[0]?.durationMins ?? 0) * 60 * 1000;
      firstDeadline = new Date(now.getTime() + (dur || ESCALATION_TIMEOUT_MS)).toISOString();
    } else {
      const step0   = flow[0] || { dept: "Support Engineer", durationHours: 2, durationMins: 0 };
      const eng0    = pickEngineer(step0);
      firstEngId   = eng0.id; firstEngName = eng0.name; firstDept = step0.dept;
      const dur    = (step0.durationHours ?? 2) * 60 * 60 * 1000 + (step0.durationMins ?? 0) * 60 * 1000;
      firstDeadline = new Date(now.getTime() + (dur || ESCALATION_TIMEOUT_MS)).toISOString();
    }
    const saved = {
      ...formData,
      assignedEngineer: firstEngId, assignedEngineerName: firstEngName,
      assignedDepartment: firstDept, status: "Assigned",
      assignedAt: now.toISOString(), escalationLevel: 0, masterFlow: flow,
      escalationHistory: [{
        level: 0, department: firstDept, engineerId: firstEngId,
        engineerName: firstEngName, assignedAt: now.toISOString(),
        deadline: firstDeadline, status: "Pending",
      }],
    };
    onSave(saved, isEdit);
  };

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    const newRows = newCustomer.items.map(item => ({
      partyCode: newCustomer.partyCode, partyDescription: newCustomer.partyDescription,
      partyType: newCustomer.partyType, productSegment: item.productSegment,
      itemCode: item.itemCode, itemDescription: item.itemDescription, warrantyPeriodDays: item.warrantyPeriodDays,
    }));
    const updated = [...newRows, ...customerDb].sort((a, b) => a.partyCode.localeCompare(b.partyCode));
    localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updated));
    setFormData(p => ({ ...p, partyCode: newCustomer.partyCode, customerName: newCustomer.partyDescription }));
    alert("Customer added!"); setShowAddCustModal(false);
  };

  const getTypeColor = (type) => {
    const idx = partyTypes.findIndex(t => t.name === type);
    return ["bg-purple-100 text-purple-700","bg-orange-100 text-orange-700","bg-blue-100 text-blue-700","bg-green-100 text-green-700"][idx % 4] || "bg-gray-100 text-gray-700";
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}
      className="w-full font-sans text-[0.85vw] max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-[1.2vw] py-[0.8vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[1vw]">
        <div className="flex items-center gap-[1vw]">
          <button type="button" onClick={onBack} className="flex items-center gap-[0.4vw] text-gray-500 hover:text-gray-800 border border-gray-300 bg-gray-50 hover:bg-gray-100 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer">
            <ArrowLeft className="w-[1vw] h-[1vw]" /><span className="font-medium">Back</span>
          </button>
          <h2 className="text-[1vw] font-bold text-gray-800">{isEdit ? "Edit Service Call" : "New Service Call Entry"}</h2>
          {isEdit && <span className="text-[0.72vw] bg-blue-50 text-blue-600 border border-blue-200 px-[0.6vw] py-[0.15vw] rounded font-semibold">Adding products will sync to escalation queue</span>}
        </div>
        <div className="bg-blue-50 border border-blue-200 px-[1vw] py-[0.4vw] rounded-[0.4vw] text-[0.78vw]">
          <span className="text-gray-500">Call No: </span>
          <span className="font-mono font-bold text-blue-600">{formData.callNumber}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[1vw]">
        {/* SECTION 1: Call Details */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100 flex items-center gap-[0.5vw]">
            <Clock className="w-[1vw] h-[1vw] text-blue-500" />Call Details
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Call Number</label>
              <input readOnly value={formData.callNumber} className="bg-gray-100 border border-gray-300 rounded-[0.4vw] p-[0.6vw] text-gray-500 cursor-not-allowed font-mono" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Date & Time</label>
              <input readOnly value={formData.dateTime} className="bg-gray-100 border border-gray-300 rounded-[0.4vw] p-[0.6vw] text-gray-500 cursor-not-allowed" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600 flex items-center justify-between">
                Mode of Call
                <button type="button" onClick={() => setShowModesManager(true)} className="text-gray-400 hover:text-gray-700 cursor-pointer p-[0.2vw] rounded hover:bg-gray-100"><Settings className="w-[0.85vw] h-[0.85vw]" /></button>
              </label>
              <select value={formData.mode} onChange={e => set("mode", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none">
                {modes.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Priority</label>
              <select value={formData.priority} onChange={e => set("priority", e.target.value)}
                className={`border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none font-medium ${formData.priority === "Critical" ? "text-red-600" : formData.priority === "High" ? "text-orange-500" : "text-gray-700"}`}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Customer Information */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100 flex items-center gap-[0.5vw]">
            <User className="w-[1vw] h-[1vw] text-blue-500" />Customer Information
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Customer Type</label>
              <select value={formData.customerType} onChange={e => setFormData(p => ({ ...p, customerType: e.target.value, partyCode: "", customerName: "", products: [emptyProduct()] }))}
                className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none">
                <option value="All">All Types</option>
                {partyTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-[0.3vw] col-span-2 relative" ref={custRef}>
              <label className="font-semibold text-gray-600 flex justify-between">
                Customer Name
                <span className="text-[0.7vw] text-gray-400 font-normal">({filteredCustomers.length} available)</span>
              </label>
              <div className="flex gap-[0.5vw]">
                <div className="relative flex-1">
                  <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
                  <input type="text" value={formData.customerName}
                    onChange={e => { set("customerName", e.target.value); setShowCustSearch(true); }}
                    onFocus={() => setShowCustSearch(true)}
                    placeholder="Search & select customer…"
                    className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none" />
                </div>
                <button type="button" onClick={() => { setNewCustomer({ partyCode: "", partyDescription: formData.customerName || "", partyType: partyTypes[0]?.name || "", items: [{ productSegment: "", itemCode: "", itemDescription: "", warrantyPeriodDays: "" }] }); setShowAddCustModal(true); }}
                  className="flex items-center gap-[0.3vw] bg-blue-600 hover:bg-blue-700 text-white px-[0.8vw] rounded-[0.4vw] cursor-pointer">
                  <UserPlus className="w-[1vw] h-[1vw]" /><span className="text-[0.75vw]">New</span>
                </button>
              </div>
              {showCustSearch && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[15vw] overflow-y-auto z-20">
                  {filteredCustomers.filter(c => c.name.toLowerCase().includes(formData.customerName.toLowerCase())).map((c, i) => (
                    <div key={i} onClick={() => selectCustomer(c.code, c.name, c.type)}
                      className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center">
                      <div><div className="font-medium text-gray-700">{c.name}</div><div className="text-[0.7vw] text-gray-400">{c.code}</div></div>
                      <span className={`text-[0.7vw] px-[0.5vw] py-[0.2vw] rounded ${getTypeColor(c.type)}`}>{c.type}</span>
                    </div>
                  ))}
                  {filteredCustomers.filter(c => c.name.toLowerCase().includes(formData.customerName.toLowerCase())).length === 0 && (
                    <div className="p-[1vw] text-gray-400 text-center">No customers found</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Contact Person</label>
              <input value={formData.contactPerson} onChange={e => set("contactPerson", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Contact Number</label>
              <input value={formData.contactNumber} onChange={e => set("contactNumber", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Email ID</label>
              <input type="email" value={formData.emailId} onChange={e => set("emailId", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw] col-span-2">
              <label className="font-semibold text-gray-600">Location / Site Address</label>
              <input value={formData.location} onChange={e => set("location", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            {formData.partyCode && (
              <div className="col-span-4 flex flex-col gap-[0.3vw]">
                <label className="font-semibold text-gray-600 flex items-center gap-[0.5vw]">
                  <History className="w-[1vw] h-[1vw]" />Customer History
                  {customerHistory.length > 0 && <span className="text-[0.7vw] bg-purple-100 text-purple-700 px-[0.6vw] py-[0.2vw] rounded-full font-bold">{customerHistory.length} Call{customerHistory.length > 1 ? "s" : ""}</span>}
                </label>
                <div className="border border-gray-200 bg-purple-50/30 rounded-[0.4vw] p-[0.8vw] max-h-[10vw] overflow-y-auto space-y-[0.5vw]">
                  {customerHistory.length > 0 ? customerHistory.map((call, i) => (
                    <div key={i} className="bg-white border border-purple-200 rounded-[0.4vw] p-[0.6vw] shadow-sm">
                      <div className="flex justify-between items-center mb-[0.3vw]">
                        <span className="font-mono text-[0.75vw] font-bold text-purple-600">{call.callNumber}</span>
                        <span className="text-[0.7vw] text-gray-500">{new Date(call.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  )) : <div className="text-gray-400 text-center py-[1vw]">No previous calls</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Product Details */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <div className="flex justify-between items-center mb-[1vw]">
            <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-[0.5vw]">
              <Package className="w-[1vw] h-[1vw] text-blue-500" />Product Details
              {isEdit && <span className="text-[0.68vw] bg-amber-50 text-amber-700 border border-amber-200 px-[0.5vw] py-[0.08vw] rounded font-semibold normal-case">New products will be added to escalation queue</span>}
            </h3>
            <button type="button" onClick={addProduct} disabled={!formData.partyCode}
              className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer disabled:opacity-50">
              <PlusCircle className="w-[1vw] h-[1vw]" />Add Product
            </button>
          </div>
          <div className="space-y-[1vw]">
            {formData.products.map((product, idx) => (
              <div key={idx} className="border border-gray-200 rounded-[0.5vw] p-[1vw] bg-gray-50 relative">
                {formData.products.length > 1 && (
                  <button type="button" onClick={() => removeProduct(idx)} className="absolute top-[0.5vw] right-[0.5vw] text-red-500 hover:text-red-700 cursor-pointer"><Trash2 className="w-[1vw] h-[1vw]" /></button>
                )}
                <div className="text-[0.8vw] font-bold text-gray-600 mb-[0.7vw] flex items-center gap-[0.4vw]">
                  <Smartphone className="w-[1vw] h-[1vw]" />Product #{idx + 1}
                </div>
                <div className="grid grid-cols-4 gap-[1.2vw]">
                  <div className="col-span-2 flex flex-col gap-[0.3vw] relative" ref={el => prodRefs.current[idx] = el}>
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Product Model</label>
                    <div className="relative">
                      <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 z-10" />
                      <input type="text" value={product.productModel}
                        onChange={e => changeProduct(idx, "productModel", e.target.value)}
                        onFocus={() => { if (formData.partyCode) setShowProdSearch(p => ({ ...p, [idx]: true })); }}
                        disabled={!formData.partyCode}
                        placeholder={!formData.partyCode ? "Select customer first" : "Search product…"}
                        className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" />
                      {showProdSearch[idx] && formData.partyCode && (
                        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] mt-[0.3vw] max-h-[12vw] overflow-y-auto z-20">
                          {availableProducts.filter(p => !product.productModel || p.itemDescription.toLowerCase().includes(product.productModel.toLowerCase()) || p.itemCode.toLowerCase().includes(product.productModel.toLowerCase()))
                            .map((prod, i) => (
                              <div key={i} onClick={() => selectProduct(idx, prod)} className="p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                                <div className="font-medium text-gray-700 text-[0.8vw]">{prod.itemDescription}</div>
                                <div className="text-[0.7vw] text-gray-500 font-mono">{prod.itemCode}{prod.productSegment && ` • ${prod.productSegment}`}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Serial Number</label>
                    <input value={product.serialNumber} onChange={e => changeProduct(idx, "serialNumber", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none" />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Warranty Status</label>
                    <select value={product.warrantyStatus} onChange={e => changeProduct(idx, "warrantyStatus", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none">
                      {WARRANTY_STATUS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Call Description / Fault</label>
                    <textarea rows="2" value={product.callDescription || ""} onChange={e => changeProduct(idx, "callDescription", e.target.value)}
                      className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none resize-none text-[0.82vw]" placeholder="Describe the issue…" />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Error Code</label>
                    <input value={product.errorCode || ""} onChange={e => changeProduct(idx, "errorCode", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none text-[0.82vw]" placeholder="e.g. E-404" />
                  </div>
                  <div className="flex flex-col gap-[0.3vw]">
                    <label className="font-semibold text-gray-600 text-[0.8vw]">Photo/Video Received?</label>
                    <select value={product.mediaReceived || "No"} onChange={e => changeProduct(idx, "mediaReceived", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] bg-white outline-none text-[0.82vw]">
                      <option>Yes</option><option>No</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: Assignment */}
        <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 p-[1.2vw]">
          <h3 className="text-[0.85vw] font-bold text-gray-500 uppercase tracking-wide mb-[1vw] pb-[0.5vw] border-b border-gray-100 flex items-center gap-[0.5vw]">
            <CheckCircle className="w-[1vw] h-[1vw] text-blue-500" />Assignment & Escalation
          </h3>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="col-span-2 flex flex-col gap-[0.3vw] relative" ref={engineerRef}>
              <label className="font-semibold text-gray-600 flex items-center justify-between">
                <span className="flex items-center gap-[0.4vw]">Assigned Engineer
                  <span className="text-[0.62vw] bg-gray-100 text-gray-400 border border-gray-200 px-[0.4vw] py-[0.05vw] rounded font-normal">Optional</span>
                </span>
                <span className="text-[0.7vw] text-gray-400 font-normal">({supportEngineers.length} available)</span>
              </label>
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400 z-10" />
                <input type="text" value={formData.assignedEngineerName || engineerSearch}
                  onChange={e => { setEngineerSearch(e.target.value); if (formData.assignedEngineerName) setFormData(p => ({ ...p, assignedEngineer: "", assignedEngineerName: "", assignedDepartment: "" })); setShowEngineerDrop(true); }}
                  onFocus={() => setShowEngineerDrop(true)}
                  placeholder="Search & select (or leave empty for auto-assign)…"
                  className="w-full border border-gray-300 rounded-[0.4vw] pl-[2.2vw] pr-[2vw] p-[0.6vw] bg-white focus:ring-2 ring-blue-100 outline-none" />
                {formData.assignedEngineer && (
                  <button type="button" onClick={() => { setFormData(p => ({ ...p, assignedEngineer: "", assignedEngineerName: "", assignedDepartment: "" })); setEngineerSearch(""); }}
                    className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer"><X className="w-[0.9vw] h-[0.9vw]" /></button>
                )}
              </div>
              {showEngineerDrop && (
                <div className="absolute top-[calc(100%+0.3vw)] left-0 w-full bg-white border border-gray-200 shadow-lg rounded-[0.4vw] max-h-[15vw] overflow-y-auto z-30">
                  {filteredEngineers.length > 0 ? filteredEngineers.map((eng, i) => (
                    <div key={i} onClick={() => selectEngineer(eng)}
                      className={`p-[0.6vw] hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center ${formData.assignedEngineer === eng.userId ? "bg-blue-50" : ""}`}>
                      <div className="flex items-center gap-[0.6vw]">
                        <Avatar name={eng.name} size="sm" />
                        <div><div className="font-medium text-gray-700">{eng.name}</div><div className="text-[0.7vw] text-gray-400 font-mono">{eng.userId}</div></div>
                      </div>
                      <span className="text-[0.7vw] bg-blue-100 text-blue-700 px-[0.5vw] py-[0.2vw] rounded font-medium">{eng.department}</span>
                    </div>
                  )) : <div className="p-[1vw] text-gray-400 text-center text-[0.8vw]">No Support Engineers found</div>}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Assignment Date & Time</label>
              <input type="datetime-local" value={formData.assignmentDate} onChange={e => set("assignmentDate", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
            <div className="flex flex-col gap-[0.3vw]">
              <label className="font-semibold text-gray-600">Expected Response</label>
              <input type="datetime-local" value={formData.expectedResponse} onChange={e => set("expectedResponse", e.target.value)} className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] outline-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-[1vw] sticky bottom-0 bg-gray-100 py-[0.6vw] pr-[0.5vw]">
          <button type="button" onClick={onBack} className="px-[1.5vw] py-[0.7vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] cursor-pointer flex items-center gap-[0.5vw] font-semibold">
            <X className="w-[1vw] h-[1vw]" />Cancel
          </button>
          <button type="submit" className="px-[1.5vw] py-[0.7vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] flex items-center gap-[0.5vw] cursor-pointer font-semibold shadow-md">
            <Save className="w-[1vw] h-[1vw]" />{isEdit ? "Update Record" : "Save Service Call"}
          </button>
        </div>
      </form>

      {showModesManager && <ConfigManagerModal title="Manage Call Modes" icon={Phone} items={modes} onClose={() => setShowModesManager(false)} onSave={onSaveModes} />}

      {showAddCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[55vw] rounded-[0.8vw] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-[1vw] py-[0.7vw] border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-[1.2vw] font-semibold text-gray-900">Add New Customer & Items</h2>
              <button onClick={() => setShowAddCustModal(false)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X className="w-[1.2vw] h-[1.2vw]" /></button>
            </div>
            <form onSubmit={handleAddCustomerSubmit} className="p-[1vw] flex flex-col gap-[1vw] overflow-y-auto">
              <div className="bg-gray-50 p-[1vw] rounded-[0.5vw] border border-gray-200">
                <h3 className="text-[0.9vw] font-bold text-gray-700 mb-[0.8vw]">Party Details</h3>
                <div className="grid grid-cols-2 gap-[1.5vw] mb-[0.8vw]">
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">Party Code *</label>
                    <input required value={newCustomer.partyCode} onChange={e => setNewCustomer({ ...newCustomer, partyCode: e.target.value })} className="border p-[0.6vw] rounded-[0.4vw] bg-white outline-none" />
                  </div>
                  <div className="flex flex-col gap-[0.4vw]">
                    <label className="text-gray-600 font-medium">Party Type</label>
                    <select value={newCustomer.partyType} onChange={e => setNewCustomer({ ...newCustomer, partyType: e.target.value })} className="border p-[0.6vw] rounded-[0.4vw] bg-white outline-none">
                      {partyTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-[0.4vw]">
                  <label className="text-gray-600 font-medium">Party Description *</label>
                  <input required value={newCustomer.partyDescription} onChange={e => setNewCustomer({ ...newCustomer, partyDescription: e.target.value })} className="border p-[0.6vw] rounded-[0.4vw] bg-white outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-[1vw] pt-[0.5vw]">
                <button type="button" onClick={() => setShowAddCustModal(false)} className="px-[2vw] py-[0.6vw] border rounded-[0.4vw] hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-[2vw] py-[0.6vw] bg-green-600 text-white rounded-[0.4vw] hover:bg-green-700 flex items-center gap-[0.5vw] cursor-pointer"><UserPlus className="w-[1vw] h-[1vw]" />Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── AvatarStack ────────────────────────────────────────────────────────────────
const AvatarStack = ({ people, onClick }) => {
  const shown  = people.slice(0, 4);
  const extra  = people.length - shown.length;
  return (
    <button onClick={onClick} title="View full flow" className="flex items-center cursor-pointer group">
      <div className="flex items-center">
        {shown.map((p, i) => (
          <div key={i} style={{ zIndex: shown.length - i, marginLeft: i === 0 ? 0 : "-0.45vw" }}>
            <Avatar name={p.name} size="sm" ring />
          </div>
        ))}
        {extra > 0 && (
          <div style={{ zIndex: 0, marginLeft: "-0.45vw" }}
            className="w-[1.4vw] h-[1.4vw] rounded-full bg-gray-200 border-[0.12vw] border-white flex items-center justify-center text-[0.52vw] font-bold text-gray-600 flex-shrink-0">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-[0.62vw] text-gray-400 ml-[0.3vw] group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">View flow</span>
    </button>
  );
};

// ── Product Status chip only ──────────────────────────────────────────────────
const ProductStatusCell = ({ prod }) => {
  const status = getProductStatus(prod);
  const cfg    = PROD_STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded text-[0.7vw] font-semibold border ${cfg.cls}`}>
      <span className={`w-[0.45vw] h-[0.45vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ServiceCall() {
  const [view, setView]           = useState("table");
  const [editingRow, setEditingRow] = useState(null);

  const [serviceCalls, setServiceCalls] = useState([]);
  const [customerDb, setCustomerDb]     = useState([]);
  const [partyTypes, setPartyTypes]     = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [modes, setModes]               = useState([]);
  const [escalationQueue, setEscalationQueue] = useState([]);

  const [searchTerm, setSearchTerm]       = useState("");
  const [filterStatus, setFilterStatus]   = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [currentPage, setCurrentPage]     = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [flowModalRow, setFlowModalRow]   = useState(null);

  useEffect(() => {
    const load = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
    setServiceCalls(load(SERVICE_CALLS_KEY, []));
    setCustomerDb(load(CUSTOMER_DB_KEY, []));
    setPartyTypes(load(PARTY_TYPES_KEY, [{ id: 1, name: "OEM" }, { id: 2, name: "End Customer" }]));
    setEmployees(load(EMPLOYEES_KEY, []));
    setModes(load(MODES_KEY, DEFAULT_MODES));
    setEscalationQueue(load(ESCALATION_KEY, []));
  }, []);

  // Keep escalation queue in sync
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const q = JSON.parse(localStorage.getItem(ESCALATION_KEY) || "[]");
        setEscalationQueue(q);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const save = (rows) => { setServiceCalls(rows); lsSave(SERVICE_CALLS_KEY, rows); };
  const handleSaveModes = (updated) => { setModes(updated); lsSave(MODES_KEY, updated); };

  const goToForm  = ()    => { setEditingRow(null); setView("form"); };
  const goToEdit  = (row) => { setEditingRow({ ...row, _editing: true }); setView("form"); };
  const goToTable = ()    => { setEditingRow(null); setView("table"); };

  const handleSave = (formRow, isEdit) => {
    const now = new Date();
    // Update service calls store
    const updatedCalls = isEdit
      ? serviceCalls.map(r => r.id === formRow.id ? formRow : r)
      : [{ ...formRow, id: Date.now() }, ...serviceCalls];
    save(updatedCalls);

    if (!isEdit) {
      // New call — push to escalation queue
      const existingQueue = lsLoad(ESCALATION_KEY, []);
      existingQueue.push({
        callId:              formRow.id || Date.now(),
        callNumber:          formRow.callNumber,
        assignedAt:          formRow.assignedAt,
        deadline:            formRow.escalationHistory?.[0]?.deadline,
        currentLevel:        0,
        currentDepartment:   formRow.assignedDepartment || "Support Engineer",
        currentEngineerId:   formRow.assignedEngineer,
        currentEngineerName: formRow.assignedEngineerName,
        status:              "Pending",
        customerName:        formRow.customerName,
        partyCode:           formRow.partyCode,
        priority:            formRow.priority,
        products:            formRow.products,
        escalationHistory:   formRow.escalationHistory,
        contactPerson:       formRow.contactPerson  || "",
        contactNumber:       formRow.contactNumber  || "",
        emailId:             formRow.emailId        || "",
        location:            formRow.location       || "",
      });
      lsSave(ESCALATION_KEY, existingQueue);
    } else {
      // Edit — merge new products into existing queue entry
      const existingQueue = lsLoad(ESCALATION_KEY, []);
      const entryIdx = existingQueue.findIndex(e =>
        e.callId === formRow.id || e.callNumber === formRow.callNumber
      );
      if (entryIdx >= 0) {
        const existing = existingQueue[entryIdx];
        const existingProds = existing.products || [];

        // Determine which products from the updated form are new
        const isAlreadyInQueue = (sp, spIdx) => {
          if (sp.serialNumber && existingProds.some(ep => ep.serialNumber === sp.serialNumber)) return true;
          const m = sp.productModel || sp.itemCode || "";
          if (m && existingProds.some(ep => (ep.productModel || ep.itemCode || "") === m)) return true;
          if (spIdx < existingProds.length) return true;
          return false;
        };

        const newProds = (formRow.products || []).filter((sp, i) => !isAlreadyInQueue(sp, i));
        const appendedProds = newProds.map(sp => ({
          ...sp,
          _escalationLevel:   0,
          _escalationHistory: [],
          _supportRequested:  false,
          _resolved:          false,
        }));

        existingQueue[entryIdx] = {
          ...existing,
          products:     [...existingProds, ...appendedProds],
          // Update call-level meta in case contact info changed
          contactPerson:  formRow.contactPerson  || existing.contactPerson  || "",
          contactNumber:  formRow.contactNumber  || existing.contactNumber  || "",
          emailId:        formRow.emailId        || existing.emailId        || "",
          location:       formRow.location       || existing.location       || "",
          priority:       formRow.priority       || existing.priority,
        };
        lsSave(ESCALATION_KEY, existingQueue);
        setEscalationQueue(existingQueue);
      }
    }
    setView("table");
  };

  // ── Build enriched call data merging escalation queue ─────────────────────
  const enrichedCalls = useMemo(() => {
    return serviceCalls.map(row => {
      const queueEntry = escalationQueue.find(e => e.callId === row.id || e.callNumber === row.callNumber);
      const products   = queueEntry?.products || row.products || [];
      const people     = getPeopleFlow(queueEntry);
      return { ...row, _queueEntry: queueEntry, _products: products, _people: people };
    });
  }, [serviceCalls, escalationQueue]);

  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return enrichedCalls.filter(row => {
      const matchSearch   = !s || row.customerName?.toLowerCase().includes(s) || row.callNumber?.toLowerCase().includes(s) || row.assignedEngineerName?.toLowerCase().includes(s);
      const matchStatus   = filterStatus === "All" || row.status === filterStatus;
      const matchPriority = filterPriority === "All" || row.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [enrichedCalls, searchTerm, filterStatus, filterPriority]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterPriority]);

  const totalPages    = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const isPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedItems.has(r.id));

  const toggleSelect     = (id) => { const s = new Set(selectedItems); s.has(id) ? s.delete(id) : s.add(id); setSelectedItems(s); };
  const toggleSelectPage = ()   => { const s = new Set(selectedItems); if (isPageSelected) paginatedData.forEach(r => s.delete(r.id)); else paginatedData.forEach(r => s.add(r.id)); setSelectedItems(s); };
  const handleBulkDelete = ()   => { if (confirm(`Delete ${selectedItems.size} selected records?`)) { save(serviceCalls.filter(r => !selectedItems.has(r.id))); setSelectedItems(new Set()); } };

  const defaultFormData = () => ({ ...emptyForm(), mode: modes[0] || "Phone" });

  // Count call-level status from queue
  const counts = useMemo(() => {
    const c = { All: serviceCalls.length, Open: 0, Assigned: 0, Pending: 0, Closed: 0 };
    serviceCalls.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [serviceCalls]);

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      <AnimatePresence mode="wait">
        {view === "form" ? (
          <ServiceCallForm key="form" initialData={editingRow || defaultFormData()}
            customerDb={customerDb} serviceCalls={serviceCalls} partyTypes={partyTypes}
            employees={employees} modes={modes} onSave={handleSave} onBack={goToTable} onSaveModes={handleSaveModes} />
        ) : (
          <motion.div key="table" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>

            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-200 mb-[0.9vw]">
              <div className="relative w-[30vw]">
                <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
                <input type="text" placeholder="Search by customer, call no, engineer…"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-300 rounded-[0.8vw] focus:outline-none focus:border-gray-800" />
              </div>
              <div className="flex gap-[0.8vw] items-center">
                <AnimatePresence>
                  {selectedItems.size > 0 && (
                    <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDelete}
                      className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-semibold">
                      <Trash2 className="w-[1vw] h-[1vw]" />Delete ({selectedItems.size})
                    </motion.button>
                  )}
                </AnimatePresence>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-transparent font-medium text-gray-700 border border-gray-300 p-[0.4vw] rounded-[0.3vw] outline-none cursor-pointer h-[2.4vw]">
                  <option value="All">All Priorities</option>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
                <button onClick={goToForm} className="cursor-pointer flex items-center gap-[0.5vw] bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-[1vw] h-[2.4vw] rounded-[0.4vw]">
                  <Plus className="w-[1.2vw] h-[1.2vw]" />Add
                </button>
              </div>
            </div>

            {/* Status Summary Bar */}
            <div className="flex gap-[0.8vw] mb-[0.9vw]">
              {[
                { label: "All",      color: "bg-gray-100 text-gray-700 border-gray-200",   dot: "bg-gray-400"   },
                { label: "Assigned", color: "bg-blue-50 text-blue-700 border-blue-200",    dot: "bg-blue-500"   },
                { label: "Open",     color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500"  },
                { label: "Pending",  color: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
                { label: "Closed",   color: "bg-gray-50 text-gray-500 border-gray-200",    dot: "bg-gray-400"   },
              ].map(({ label, color, dot }) => (
                <button key={label} onClick={() => setFilterStatus(label === "All" ? "All" : label)}
                  className={`flex items-center gap-[0.5vw] px-[1vw] py-[0.55vw] rounded-[0.5vw] border font-medium text-[0.8vw] cursor-pointer transition-all ${color} ${filterStatus === (label === "All" ? "All" : label) ? "ring-2 ring-offset-1 ring-blue-300 shadow-sm" : "opacity-80 hover:opacity-100"}`}>
                  <span className={`w-[0.6vw] h-[0.6vw] rounded-full ${dot}`} />
                  {label}
                  <span className="font-bold">{counts[label] ?? 0}</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 flex flex-col">
              <div className="overflow-y-auto max-h-[65vh] min-h-[65vh] w-full rounded-t-[0.6vw]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-[0.6vw] border-b border-r border-gray-200 w-[3%] text-center">
                        <button onClick={toggleSelectPage} className="flex items-center justify-center w-full cursor-pointer">
                          {isPageSelected ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" /> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-400" />}
                        </button>
                      </th>
                      {["S.No","Call No","Date & Time","Customer","Mode","Category","Priority","Assigned Engineer","Products","Error Code","Expected Response","Status",""].map(h => (
                        <th key={h} className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap text-[0.78vw]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedData.length > 0 ? paginatedData.map((row, i) => {
                      const sn         = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                      const isSelected = selectedItems.has(row.id);
                      const products   = (row._products?.length > 0 ? row._products : row.products?.length > 0 ? row.products : [{}]);
                      const queueEntry = row._queueEntry;
                      const people     = row._people || [];
                      const rowCount   = products.length;
                      const rowBase    = isSelected ? "bg-blue-50" : "hover:bg-gray-50";

                      return products.map((prod, pIdx) => (
                        <tr key={`${row.id}-${pIdx}`} className={`transition-colors border-b border-gray-200 ${rowBase}`}>

                          {/* ── rowspan cells — shown only on first product row ── */}
                          {pIdx === 0 && <>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 text-center align-middle">
                              <button onClick={() => toggleSelect(row.id)} className="flex items-center justify-center w-full cursor-pointer">
                                {isSelected ? <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" /> : <Square className="w-[1.1vw] h-[1.1vw] text-gray-300 hover:text-gray-500" />}
                              </button>
                            </td>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 text-gray-600 font-medium text-center align-middle text-[0.78vw]">{sn}</td>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 align-middle">
                              <div className="font-mono text-[0.78vw] font-bold text-blue-600 whitespace-nowrap">{row.callNumber}</div>
                            </td>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 text-gray-500 whitespace-nowrap text-[0.75vw] align-middle">{row.dateTime}</td>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 align-middle max-w-[10vw]">
                              <div className="font-semibold text-gray-800 text-[0.78vw] truncate" title={row.customerName}>{row.customerName || "—"}</div>
                              {row.contactPerson && <div className="text-[0.6vw] text-gray-400 truncate mt-[0.1vw]">{row.contactPerson}</div>}
                            </td>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 text-gray-600 text-[0.75vw] align-middle">{row.mode || "—"}</td>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 text-gray-500 text-[0.75vw] align-middle">—</td>
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 align-middle">
                              <span className={`px-[0.5vw] py-[0.2vw] rounded text-[0.72vw] font-semibold ${PRIORITY_COLORS[row.priority] || "bg-gray-100 text-gray-600"}`}>{row.priority}</span>
                            </td>
                            {/* Assigned Engineer — avatar only, title = name, clicking opens flow */}
                            <td rowSpan={rowCount} className="p-[0.8vw] border-r border-gray-200 align-middle">
                              {(queueEntry?.currentEngineerName || row.assignedEngineerName) ? (
                                <button
                                  onClick={() => setFlowModalRow(row)}
                                  title={queueEntry?.currentEngineerName || row.assignedEngineerName}
                                  className="cursor-pointer hover:scale-110 transition-transform">
                                  <Avatar name={queueEntry?.currentEngineerName || row.assignedEngineerName} size="md" />
                                </button>
                              ) : <span className="text-gray-300 text-[0.72vw]">—</span>}
                            </td>
                          </>}

                          {/* ── per-product cells (one row each) ── */}

                          {/* Products column */}
                          <td className="px-[0.8vw] py-[0.55vw] border-r border-gray-200 align-middle">
                            <div className="flex items-start gap-[0.45vw]">
                              <span className="mt-[0.05vw] flex-shrink-0 w-[1.2vw] h-[1.2vw] rounded-full bg-blue-100 text-blue-600 text-[0.6vw] font-bold flex items-center justify-center">
                                {pIdx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="text-[0.75vw] font-semibold text-gray-800 truncate max-w-[10vw]" title={prod?.productModel || prod?.itemCode || "—"}>
                                  {prod?.productModel || prod?.itemCode || "—"}
                                </div>
                                {prod?.serialNumber && <div className="text-[0.62vw] text-gray-400 font-mono">SN: {prod.serialNumber}</div>}
                              </div>
                            </div>
                          </td>

                          {/* Error Code */}
                          <td className="px-[0.8vw] py-[0.55vw] border-r border-gray-200 text-center align-middle">
                            {prod?.errorCode
                              ? <span className="bg-red-50 text-red-600 border border-red-200 px-[0.5vw] py-[0.15vw] rounded text-[0.72vw] font-mono font-semibold">{prod.errorCode}</span>
                              : <span className="text-gray-300 text-[0.72vw]">—</span>}
                          </td>

                          {/* Expected Response — per product row (show on first only, blank on rest) */}
                          <td className="px-[0.8vw] py-[0.55vw] border-r border-gray-200 text-gray-500 text-[0.72vw] whitespace-nowrap align-middle">
                            {pIdx === 0 && row.expectedResponse
                              ? new Date(row.expectedResponse).toLocaleString()
                              : <span className="text-gray-300">—</span>}
                          </td>

                          {/* Status — INDEPENDENT per product */}
                          <td className="px-[0.8vw] py-[0.55vw] border-r border-gray-200 align-middle">
                            {(() => {
                              const status = getProductStatus(prod || {});
                              const cfg    = PROD_STATUS_CFG[status];
                              return (
                                <span className={`inline-flex items-center gap-[0.3vw] px-[0.5vw] py-[0.2vw] rounded text-[0.7vw] font-semibold border ${cfg.cls}`}>
                                  <span className={`w-[0.45vw] h-[0.45vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                                  {cfg.label}
                                </span>
                              );
                            })()}
                          </td>

                          {/* Actions — edit on first row, per-product flow on every row */}
                          <td className="px-[0.6vw] py-[0.55vw] text-center align-middle">
                            <div className="flex items-center justify-center gap-[0.3vw]">
                              {pIdx === 0 && (
                                <button onClick={() => goToEdit(row)} title="Edit Call"
                                  className="text-gray-400 hover:text-blue-600 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-blue-50 transition-colors">
                                  <Edit3 className="w-[0.95vw] h-[0.95vw]" />
                                </button>
                              )}
                              <button
                                onClick={() => setFlowModalRow({ ...row, _focusProduct: pIdx })}
                                title={`View P${pIdx + 1} flow`}
                                className="text-gray-400 hover:text-purple-600 cursor-pointer p-[0.3vw] rounded-[0.3vw] hover:bg-purple-50 transition-colors">
                                <Activity className="w-[0.95vw] h-[0.95vw]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    }) : (
                      <tr><td colSpan={14} className="py-[4vw] text-center text-gray-400">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-blue-100 p-[0.6vw] bg-blue-50 flex justify-between items-center rounded-b-[0.6vw]">
                <div className="text-[0.8vw] text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-semibold text-gray-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> of <span className="font-bold text-gray-800">{filteredData.length}</span> entries
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
                          className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                          {pNum}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"><ChevronRight className="w-[1vw] h-[1vw] text-gray-600" /></button>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Flow Modal */}
      {flowModalRow && <FlowModal row={flowModalRow} onClose={() => setFlowModalRow(null)} />}
    </div>
  );
}