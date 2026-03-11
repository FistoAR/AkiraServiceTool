import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertTriangle, Clock, User, Package, FileText, CheckCircle,
  History, Shield, ChevronDown, ChevronUp,
  RefreshCw, HelpCircle, Send, X, MapPin, Bell,
  CheckSquare, Wrench, BarChart2, Eye,
  AlertCircle, ChevronRight, Layers, Phone, Mail, Share2,
} from "lucide-react";
import useEscalationWorker from "../service/useEscalationWorker";

// ── Storage keys ──────────────────────────────────────────────────────────────
const ESCALATION_KEY       = "escalation_queue_v1";
const SUPPORT_REQ_KEY      = "support_requests_v1";
const FIELD_VISIT_KEY      = "field_visits_v1";
const INHOUSE_REPAIR_KEY   = "inhouse_repairs_v1";
const EMPLOYEES_KEY        = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";

const RESOLUTION_TYPES = ["Fixed", "Replaced", "No Fault Found", "Partially Fixed"];
const SLA_OPTIONS      = ["Under SLA", "Breached"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const load  = (key, fb = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)); } catch { return fb; } };
const save  = (key, val)     => localStorage.setItem(key, JSON.stringify(val));
const loadQ = ()             => load(ESCALATION_KEY, []);
const saveQ = (q)            => save(ESCALATION_KEY, q);

function requestNotifPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default")
    Notification.requestPermission().catch(() => {});
}

// ── Product status helper ─────────────────────────────────────────────────────
const getProductStatus = (prod) => {
  if (prod._resolved)                              return "resolved";
  if (prod._productClosure?.status === "Closed")  return "closed";
  if (prod._productClosure?.status === "Pending") return "pending";
  if (prod._supportRequested)                     return "support";
  return "open";
};

const PROD_STATUS_CFG = {
  resolved: { dot: "bg-green-500",  label: "Resolved",    cls: "bg-green-50 border-green-300 text-green-700"    },
  closed:   { dot: "bg-green-400",  label: "Closed",      cls: "bg-green-50 border-green-300 text-green-700"    },
  pending:  { dot: "bg-gray-500",   label: "Pending",     cls: "bg-gray-50 border-gray-300 text-gray-700"       },
  support:  { dot: "bg-blue-400",   label: "Support Req", cls: "bg-blue-50 border-blue-300 text-blue-700"       },
  open:     { dot: "bg-blue-400",   label: "Open",        cls: "bg-blue-50 border-blue-300 text-blue-700"       },
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ label, color = "gray" }) => {
  const map = {
    green:  "bg-green-100 text-green-700 border-green-300",
    blue:   "bg-blue-100 text-blue-700 border-blue-300",
    slate:  "bg-slate-100 text-slate-600 border-slate-300",
    gray:   "bg-gray-100 text-gray-600 border-gray-300",
    black:  "bg-gray-900 text-white border-gray-900",
    red:    "bg-red-100 text-red-700 border-red-300",
  };
  return (
    <span className={`text-[0.68vw] px-[0.5vw] py-[0.15vw] rounded-full border font-semibold whitespace-nowrap ${map[color] || map.gray}`}>
      {label}
    </span>
  );
};

// ── Contact Info Container ─────────────────────────────────────────────────────
const ContactInfoBar = ({ entry }) => {
  if (!entry?.contactPerson && !entry?.contactNumber && !entry?.emailId && !entry?.location) return null;
  return (
    <div className="mx-[0.9vw] mb-[0.6vw] bg-slate-50 border border-slate-200 rounded-[0.45vw] px-[0.8vw] py-[0.5vw] flex items-center gap-[1.4vw] flex-wrap">
      <span className="text-[0.62vw] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Contact</span>
      {entry.contactPerson && (
        <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700">
          <User className="w-[0.8vw] h-[0.8vw] text-slate-400 flex-shrink-0" />
          <span className="font-semibold">{entry.contactPerson}</span>
        </div>
      )}
      {entry.contactNumber && (
        <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700">
          <Phone className="w-[0.75vw] h-[0.75vw] text-slate-400 flex-shrink-0" />
          <span>{entry.contactNumber}</span>
        </div>
      )}
      {entry.emailId && (
        <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700">
          <Mail className="w-[0.75vw] h-[0.75vw] text-slate-400 flex-shrink-0" />
          <span>{entry.emailId}</span>
        </div>
      )}
      {entry.location && (
        <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700">
          <MapPin className="w-[0.75vw] h-[0.75vw] text-slate-400 flex-shrink-0" />
          <span>{entry.location}</span>
        </div>
      )}
    </div>
  );
};

// ── Per-product SLA Timer ──────────────────────────────────────────────────────
const ProductSLATimer = ({ product, globalTimer }) => {
  const lastEsc = product._escalationHistory?.[product._escalationHistory.length - 1];
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!lastEsc?.assignedAt) return;
    const flows = load(ESCALATION_FLOWS_KEY, {});
    const allFlows = Object.values(flows).find(f => Array.isArray(f)) || [];
    const step = allFlows.find(s => s.dept === lastEsc.department);
    const durationMs = (step?.slaHours || 2) * 60 * 60 * 1000;
    const deadline = new Date(lastEsc.assignedAt).getTime() + durationMs;

    const update = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) { setTimeLeft("overdue"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [lastEsc]);

  if (!lastEsc && !globalTimer) return null;
  if (!lastEsc && globalTimer) {
    return (
      <div className={`flex items-center gap-[0.25vw] px-[0.45vw] py-[0.2vw] rounded-[0.3vw] font-mono text-[0.68vw] font-bold ${globalTimer.isExpired ? "bg-red-100 text-red-600" : globalTimer.isUrgent ? "bg-gray-100 text-gray-700" : "bg-blue-50 text-blue-600"}`}>
        <Clock className="w-[0.7vw] h-[0.7vw]" />
        {globalTimer.isExpired ? "Escalating" : globalTimer.remainingFormatted}
      </div>
    );
  }
  if (!timeLeft) return null;
  const isOverdue = timeLeft === "overdue";
  return (
    <div className={`flex items-center gap-[0.25vw] px-[0.45vw] py-[0.2vw] rounded-[0.3vw] font-mono text-[0.68vw] font-bold ${isOverdue ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600"}`}>
      <Clock className="w-[0.7vw] h-[0.7vw]" />
      {isOverdue ? "SLA Breached" : timeLeft}
    </div>
  );
};

// ── Support Escalation Modal (per-product) ────────────────────────────────────
const SupportEscalationModal = ({ product, entry, currentUser, onConfirm, onClose, showAll = false }) => {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const emps = load(EMPLOYEES_KEY, []);
    const flows = load(ESCALATION_FLOWS_KEY, {});
    const q = search.toLowerCase();
    const matchesSearch = (e) =>
      !q || e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
    if (showAll)
      return emps.filter((e) => e.userId !== currentUser?.userId && matchesSearch(e));
    const prodDept = product._currentDepartment || entry.currentDepartment;
    const allFlowsArr = Object.values(flows).find((f) => Array.isArray(f)) || [];
    const allowedDepts = new Set([prodDept]);
    const myIdx = allFlowsArr.findIndex((s) => s.dept === prodDept);
    if (myIdx >= 0 && myIdx + 1 < allFlowsArr.length)
      allowedDepts.add(allFlowsArr[myIdx + 1].dept);
    return emps.filter(
      (e) =>
        allowedDepts.has(e.department) &&
        e.userId !== currentUser?.userId &&
        matchesSearch(e)
    );
  }, [entry, product, currentUser, search, showAll]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[34vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-gray-900 px-[1.2vw] py-[0.8vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.6vw]">
            <Share2 className="w-[1.1vw] h-[1.1vw] text-white/80" />
            <h3 className="text-[0.95vw] font-bold text-white">
              {showAll ? "Reassign Support Request" : "Request Support — This Product"}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer transition-colors">
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        <div className="p-[1.2vw] flex flex-col gap-[0.9vw] overflow-y-auto flex-1">
          <div className="bg-blue-50 border border-blue-200 rounded-[0.4vw] p-[0.6vw] text-[0.72vw] text-blue-700">
            <strong>Note:</strong>{" "}
            {showAll
              ? "Reassign this support request to any available person."
              : "Only this product will be reassigned. Others remain with you."}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-[0.5vw] p-[0.7vw]">
            <div className="text-[0.8vw] font-bold text-gray-800">
              {product.productModel || product.itemCode}
            </div>
            {product.serialNumber && (
              <div className="text-[0.7vw] text-gray-400 font-mono mt-[0.15vw]">
                SN: {product.serialNumber}
              </div>
            )}
            {product.callDescription && (
              <div className="text-[0.7vw] text-gray-600 mt-[0.25vw]">
                <strong>Issue:</strong> {product.callDescription}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[0.4vw]">
            <label className="text-[0.78vw] font-semibold text-gray-700">
              Select Support Person <span className="text-blue-500">*</span>
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or department…"
              className="w-full border border-gray-300 rounded-[0.4vw] px-[0.8vw] py-[0.45vw] text-[0.8vw] outline-none focus:border-blue-400 transition-colors"
            />
            <div className="border border-gray-200 rounded-[0.4vw] max-h-[12vw] overflow-y-auto divide-y divide-gray-100">
              {candidates.length === 0 ? (
                <div className="p-[1vw] text-center text-gray-400 text-[0.75vw]">
                  No eligible support personnel found
                </div>
              ) : (
                candidates.map((emp) => (
                  <div
                    key={emp.userId}
                    onClick={() => setSelectedPerson(emp)}
                    className={`flex items-center gap-[0.7vw] px-[0.8vw] py-[0.55vw] cursor-pointer transition-all
                      ${selectedPerson?.userId === emp.userId
                        ? "bg-blue-50 border-l-[0.15vw] border-blue-500"
                        : "hover:bg-gray-50 border-l-[0.15vw] border-transparent"
                      }`}
                  >
                    <div className="w-[1.7vw] h-[1.7vw] rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[0.58vw] font-bold">
                        {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8vw] font-semibold text-gray-800">{emp.name}</div>
                      <div className="text-[0.68vw] text-gray-400">{emp.department} · {emp.userId}</div>
                    </div>
                    {selectedPerson?.userId === emp.userId && (
                      <CheckCircle className="w-[0.9vw] h-[0.9vw] text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[0.3vw]">
            <label className="text-[0.78vw] font-semibold text-gray-700">
              Handover Notes <span className="text-blue-500">*</span>
            </label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the issue, what you've tried, what they need to know…"
              className="border border-gray-300 rounded-[0.4vw] p-[0.6vw] text-[0.8vw] outline-none resize-none focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        <div className="px-[1.2vw] py-[0.7vw] border-t border-gray-200 bg-gray-50 flex justify-end gap-[0.6vw]">
          <button
            onClick={onClose}
            className="px-[1.1vw] py-[0.45vw] border border-gray-300 bg-white rounded-[0.4vw] text-[0.8vw] font-medium cursor-pointer hover:bg-gray-100 text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!selectedPerson) { alert("Please select a support person."); return; }
              if (!notes.trim()) { alert("Please add handover notes."); return; }
              onConfirm({ supportPerson: selectedPerson, notes });
            }}
            className="px-[1.1vw] py-[0.45vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer flex items-center gap-[0.35vw] transition-colors"
          >
            <Send className="w-[0.85vw] h-[0.85vw]" />
            Reassign Product
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Assign Field Visit / In-house Repair Modal ────────────────────────────────
const AssignVisitModal = ({ type, entry, product, currentUser, onSave, onClose, inlineMode = false }) => {
  const employees = load(EMPLOYEES_KEY, []);
  const techEngs  = employees.filter(e => ["Support Engineer", "Service Engineer", "R&D"].includes(e.department));
  const [form, setForm] = useState({
    assignedTo: "", assignedToName: "",
    assignmentDate: new Date().toISOString().slice(0, 16),
    visitDate: "", diagnosisSummary: "",
    spareRequired: "No", spareUsedDetails: "",
  });
  const sf  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isFV = type === "Field Visit";

  const formBody = (
    <div className="flex flex-col gap-[0.8vw]">
      {product && (
        <div className="border rounded-[0.4vw] p-[0.55vw] bg-blue-50 border-blue-200">
          <div className="text-[0.72vw] font-semibold text-blue-700">
            Product: <strong>{product.productModel || product.itemCode}</strong>
            {product.serialNumber && <span className="ml-[0.4vw] font-mono text-[0.65vw] text-blue-700">SN: {product.serialNumber}</span>}
          </div>
        </div>
      )}
      {(entry?.contactPerson || entry?.contactNumber) && (
        <div className="bg-slate-50 border border-slate-200 rounded-[0.4vw] px-[0.6vw] py-[0.4vw] flex flex-wrap gap-[1vw]">
          {entry.contactPerson && <div className="flex items-center gap-[0.25vw] text-[0.7vw] text-slate-700"><User className="w-[0.75vw] h-[0.75vw] text-slate-400"/><strong>Contact:</strong> {entry.contactPerson}</div>}
          {entry.contactNumber && <div className="flex items-center gap-[0.25vw] text-[0.7vw] text-slate-700"><Phone className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{entry.contactNumber}</div>}
          {entry.emailId && <div className="flex items-center gap-[0.25vw] text-[0.7vw] text-slate-700"><Mail className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{entry.emailId}</div>}
          {entry.location && <div className="flex items-center gap-[0.25vw] text-[0.7vw] text-slate-700"><MapPin className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{entry.location}</div>}
        </div>
      )}
      <div className="flex flex-col gap-[0.25vw]">
        <label className="text-[0.78vw] font-semibold text-gray-600">Assign To *</label>
        <select value={form.assignedTo} onChange={e => {
          const emp = techEngs.find(en => en.userId === e.target.value);
          sf("assignedTo", e.target.value); sf("assignedToName", emp?.name || "");
        }} className="border border-gray-300 rounded-[0.4vw] p-[0.55vw] text-[0.8vw] bg-white outline-none">
          <option value="">-- Select person --</option>
          {techEngs.map(e => <option key={e.userId} value={e.userId}>{e.name} ({e.department})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-[0.7vw]">
        <div className="flex flex-col gap-[0.25vw]">
          <label className="text-[0.78vw] font-semibold text-gray-600">Assignment Date</label>
          <input type="datetime-local" value={form.assignmentDate} onChange={e => sf("assignmentDate", e.target.value)}
            className="border border-gray-300 rounded-[0.4vw] p-[0.55vw] text-[0.78vw] outline-none" />
        </div>
        <div className="flex flex-col gap-[0.25vw]">
          <label className="text-[0.78vw] font-semibold text-gray-600">{isFV ? "Visit Date" : "Received Date"}</label>
          <input type="date" value={form.visitDate} onChange={e => sf("visitDate", e.target.value)}
            className="border border-gray-300 rounded-[0.4vw] p-[0.55vw] text-[0.78vw] outline-none" />
        </div>
      </div>
      <div className="flex flex-col gap-[0.25vw]">
        <label className="text-[0.78vw] font-semibold text-gray-600">Initial Diagnosis Summary</label>
        <textarea rows="2" value={form.diagnosisSummary} onChange={e => sf("diagnosisSummary", e.target.value)}
          placeholder="Describe reported issue / initial findings…"
          className="border border-gray-300 rounded-[0.4vw] p-[0.55vw] text-[0.78vw] outline-none resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-[0.7vw]">
        <div className="flex flex-col gap-[0.25vw]">
          <label className="text-[0.78vw] font-semibold text-gray-600">Spare Required?</label>
          <div className="flex gap-[0.4vw]">
            {["Yes", "No"].map(o => (
              <button key={o} type="button" onClick={() => sf("spareRequired", o)}
                className={`flex-1 py-[0.45vw] rounded-[0.4vw] border text-[0.78vw] font-medium cursor-pointer transition-all ${form.spareRequired === o ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-300 text-gray-600"}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[0.25vw]">
          <label className="text-[0.78vw] font-semibold text-gray-600">Spare Details</label>
          <input value={form.spareUsedDetails} onChange={e => sf("spareUsedDetails", e.target.value)}
            disabled={form.spareRequired === "No"}
            placeholder={form.spareRequired === "Yes" ? "Part name, qty…" : "N/A"}
            className="border border-gray-300 rounded-[0.4vw] p-[0.55vw] text-[0.78vw] outline-none disabled:bg-gray-100 disabled:text-gray-400" />
        </div>
      </div>
    </div>
  );

  const saveBtn = (
    <button onClick={() => { if (!form.assignedTo) { alert("Please select a person."); return; } onSave(form); }}
      className="px-[1.1vw] py-[0.45vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer flex items-center gap-[0.35vw]">
      <CheckCircle className="w-[0.85vw] h-[0.85vw]" />Save Assignment
    </button>
  );

  if (inlineMode) return (
    <div className={`border ${isFV ? "border-blue-200" : "border-gray-300"} rounded-[0.5vw] overflow-hidden bg-white`}>
      <div className={`${isFV ? "bg-blue-50 border-b border-blue-200" : "bg-gray-50 border-b border-gray-200"} px-[0.7vw] py-[0.45vw] flex items-center gap-[0.35vw]`}>
        {isFV ? <MapPin className="w-[0.85vw] h-[0.85vw] text-blue-600" /> : <Wrench className="w-[0.85vw] h-[0.85vw] text-gray-600" />}
        <span className={`text-[0.78vw] font-bold ${isFV ? "text-blue-800" : "text-gray-700"}`}>Assign {type}</span>
      </div>
      <div className="p-[0.75vw]">{formBody}<div className="flex justify-end mt-[0.7vw]">{saveBtn}</div></div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white w-[38vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="border-b px-[1.2vw] py-[0.8vw] flex justify-between items-center bg-gray-50 border-gray-200">
          <div className="flex items-center gap-[0.6vw]">
            <h3 className="text-[0.95vw] font-bold text-gray-800">Assign {type}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
        </div>
        <div className="p-[1.2vw] overflow-y-auto flex-1">{formBody}</div>
        <div className="px-[1.2vw] py-[0.7vw] border-t border-gray-200 bg-gray-50 flex justify-end gap-[0.6vw]">
          <button onClick={onClose} className="px-[1.1vw] py-[0.45vw] border border-gray-300 bg-white rounded-[0.4vw] text-[0.8vw] font-medium cursor-pointer hover:bg-gray-50">Cancel</button>
          {saveBtn}
        </div>
      </div>
    </div>
  );
};

const ProductClosurePanel = ({
  prod, prodIdx, entry, currentUser,
  onAssignFieldVisit, onAssignInhouse, onProductClose,
  hidePending = false,
}) => {
  const existing = prod._productClosure || {};
  const saved = existing.status;
  const [selected, setSelected] = useState(saved || "");
  const [resolutionType, setResolutionType] = useState(existing.resolutionType || "Fixed");
  const [remarks, setRemarks] = useState(existing.remarks || "");
  const [showFVModal, setShowFVModal] = useState(false);
  const [showIHModal, setShowIHModal] = useState(false);

  const resetPanel = () => { setSelected(""); setResolutionType("Fixed"); setRemarks(""); };

  if (saved === "Closed")
    return (
      <div className="mt-[0.4vw] bg-green-50 border border-green-200 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] flex items-center gap-[0.4vw]">
        <CheckCircle className="w-[0.8vw] h-[0.8vw] text-green-500 flex-shrink-0" />
        <span className="text-[0.7vw] font-bold text-green-700">
          Closed ·{" "}
          {existing.closureType === "FieldVisit" ? "Field Visit"
            : existing.closureType === "InhouseRepair" ? "In-house Repair"
            : existing.resolutionType || "Direct"}
        </span>
        {existing.remarks && <span className="text-[0.65vw] text-green-500 truncate ml-[0.2vw]">— {existing.remarks}</span>}
      </div>
    );

  const actionTabs = [
    { key: "Closed", label: "Close", icon: CheckCircle },
    { key: "Open", label: "Assign Work", icon: MapPin },
    ...(!hidePending ? [{ key: "Pending", label: "Pending", icon: AlertCircle }] : []),
  ];

  return (
    <>
      <div className="mt-[0.5vw] flex items-center gap-[0.35vw]">
        <span className="text-[0.62vw] text-gray-400 font-semibold uppercase tracking-wider mr-[0.15vw]">Action:</span>
        {actionTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setSelected(selected === key ? "" : key)}
            className={`flex items-center gap-[0.25vw] px-[0.65vw] py-[0.3vw] rounded-[0.35vw] border text-[0.7vw] font-semibold cursor-pointer transition-all
              ${selected === key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-400"
              }`}>
            <Icon className="w-[0.72vw] h-[0.72vw]" />{label}
          </button>
        ))}
      </div>

      {selected === "Closed" && (
        <div className="mt-[0.4vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.55vw] space-y-[0.4vw]">
          <div className="flex items-center justify-between">
            <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider">Resolution Type</div>
            <button type="button" onClick={resetPanel} className="flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all cursor-pointer">
              <X className="w-[0.7vw] h-[0.7vw]" />
            </button>
          </div>
          <div className="flex flex-wrap gap-[0.25vw]">
            {["Fixed", "Replaced", "No Fault Found", "Partially Fixed"].map(t => (
              <button key={t} type="button" onClick={() => setResolutionType(t)}
                className={`px-[0.55vw] py-[0.25vw] rounded-[0.3vw] border text-[0.65vw] font-medium cursor-pointer transition-all
                  ${resolutionType === t ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                {t}
              </button>
            ))}
          </div>
          <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Closure remarks…"
            className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.68vw] outline-none resize-none focus:border-gray-400 bg-white" />
          <div className="flex justify-end gap-[0.3vw]">
            <button onClick={resetPanel} className="flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">Cancel</button>
            <button onClick={() => {
              if (!remarks.trim()) { alert("Please enter closure remarks."); return; }
              onProductClose(prodIdx, { status: "Closed", closureType: "Direct", resolutionType, remarks, closedAt: new Date().toISOString() });
            }} className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.35vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">
              <CheckCircle className="w-[0.72vw] h-[0.72vw]" />Confirm Close
            </button>
          </div>
        </div>
      )}

      {selected === "Open" && (
        <div className="mt-[0.4vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.55vw] space-y-[0.35vw]">
          <div className="flex items-center justify-between">
            <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider">Assignment Type</div>
            <button type="button" onClick={resetPanel} className="flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all cursor-pointer">
              <X className="w-[0.7vw] h-[0.7vw]" />
            </button>
          </div>
          <div className="flex gap-[0.4vw]">
            <button type="button" onClick={() => setShowFVModal(true)}
              className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.4vw] bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer transition-all">
              <MapPin className="w-[0.8vw] h-[0.8vw]" />Field Visit
            </button>
            <button type="button" onClick={() => setShowIHModal(true)}
              className="flex items-center gap-[0.3vw] px-[0.7vw] py-[0.4vw] bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-400 text-gray-700 rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer transition-all">
              <Wrench className="w-[0.8vw] h-[0.8vw]" />In-house Repair
            </button>
          </div>
        </div>
      )}

      {selected === "Pending" && !hidePending && (
        <div className="mt-[0.4vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.55vw] space-y-[0.35vw]">
          <div className="flex items-center justify-between">
            <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider">Pending Reason</div>
            <button type="button" onClick={resetPanel} className="flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all cursor-pointer">
              <X className="w-[0.7vw] h-[0.7vw]" />
            </button>
          </div>
          <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Reason for pending / awaiting parts…"
            className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.68vw] outline-none resize-none focus:border-gray-400 bg-white" />
          <div className="flex justify-end gap-[0.3vw]">
            <button onClick={resetPanel} className="flex items-center gap-[0.25vw] px-[0.7vw] py-[0.35vw] bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">Cancel</button>
            <button onClick={() => { onProductClose(prodIdx, { status: "Pending", closureType: "Pending", remarks, pendingAt: new Date().toISOString() }); }}
              className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.35vw] bg-gray-700 hover:bg-gray-800 text-white rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">
              <AlertCircle className="w-[0.72vw] h-[0.72vw]" />Mark Pending
            </button>
          </div>
        </div>
      )}

      {showFVModal && (
        <AssignVisitModal type="Field Visit" entry={entry} product={prod} currentUser={currentUser}
          onClose={() => setShowFVModal(false)}
          onSave={(form) => {
            onAssignFieldVisit(form, prodIdx);
            onProductClose(prodIdx, { status: "Closed", closureType: "FieldVisit", remarks: form.diagnosisSummary || "", closedAt: new Date().toISOString() });
            setShowFVModal(false);
          }} />
      )}
      {showIHModal && (
        <AssignVisitModal type="In-house Repair" entry={entry} product={prod} currentUser={currentUser}
          onClose={() => setShowIHModal(false)}
          onSave={(form) => {
            onAssignInhouse(form, prodIdx);
            onProductClose(prodIdx, { status: "Closed", closureType: "InhouseRepair", remarks: form.diagnosisSummary || "", closedAt: new Date().toISOString() });
            setShowIHModal(false);
          }} />
      )}
    </>
  );
};

// ── Visit Completion Form ─────────────────────────────────────────────────────
const VisitCompletionForm = ({ record, type, currentUser, onSave }) => {
  const [form, setForm] = useState({
    fieldDiagnosisSummary: record.fieldDiagnosisSummary || "",
    spareUsedDetails:      record.spareUsedDetails || "",
    visitCompletionDate:   record.visitCompletionDate || "",
    sla:               record.sla || "Under SLA",
    escalation:        record.escalation || "No",
    visitStatus:       record.visitStatus || "Open",
    remarks:           record.remarks || "",
    resolutionType:    record.resolutionType || "Fixed",
    resolutionRemarks: record.resolutionRemarks || "",
  });
  const sf         = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isAssignee = record.assignedTo === currentUser?.userId;
  const isClosed   = record.visitStatus === "Closed";

  return (
    <div className={`border rounded-[0.5vw] overflow-hidden mt-[0.8vw] ${isClosed ? "border-green-200 bg-green-50/30" : "border-gray-200 bg-white"}`}>
      <div className="bg-gray-50 border-b border-gray-200 px-[0.8vw] py-[0.5vw] flex items-center justify-between">
        <span className="text-[0.78vw] font-bold text-gray-600">
          Completion Details {!isAssignee && <span className="text-gray-400 font-normal">(read-only)</span>}
        </span>
        {isClosed && <Badge label="✓ Completed" color="green" />}
      </div>
      <div className="p-[0.8vw] grid grid-cols-2 gap-[0.7vw]">
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Field Diagnosis Summary</label>
          <textarea rows="2" value={form.fieldDiagnosisSummary} onChange={e => sf("fieldDiagnosisSummary", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-300 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500" />
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Visit Completion Date</label>
          <input type="date" value={form.visitCompletionDate} onChange={e => sf("visitCompletionDate", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-300 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none disabled:bg-gray-50" />
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">SLA Status</label>
          <div className="flex gap-[0.4vw]">
            {SLA_OPTIONS.map(o => (
              <button key={o} type="button" disabled={!isAssignee || isClosed} onClick={() => sf("sla", o)}
                className={`flex-1 py-[0.4vw] rounded-[0.3vw] border text-[0.75vw] font-medium cursor-pointer transition-all disabled:cursor-default ${form.sla === o ? (o === "Breached" ? "bg-red-500 text-white border-red-500" : "bg-green-500 text-white border-green-500") : "bg-white border-gray-300 text-gray-500"}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Escalation Required?</label>
          <div className="flex gap-[0.4vw]">
            {["Yes", "No"].map(o => (
              <button key={o} type="button" disabled={!isAssignee || isClosed} onClick={() => sf("escalation", o)}
                className={`flex-1 py-[0.4vw] rounded-[0.3vw] border text-[0.75vw] font-medium cursor-pointer disabled:cursor-default ${form.escalation === o ? (o === "Yes" ? "bg-gray-800 text-white border-gray-800" : "bg-gray-600 text-white border-gray-600") : "bg-white border-gray-300 text-gray-500"}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Spare Used Details</label>
          <input value={form.spareUsedDetails} onChange={e => sf("spareUsedDetails", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-300 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none disabled:bg-gray-50" />
        </div>
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Resolution Type</label>
          <div className="grid grid-cols-4 gap-[0.4vw]">
            {["Fixed", "Replaced", "No Fault Found", "Partially Fixed"].map(t => (
              <button key={t} type="button" disabled={!isAssignee || isClosed} onClick={() => sf("resolutionType", t)}
                className={`py-[0.4vw] rounded-[0.3vw] border text-[0.72vw] font-medium cursor-pointer disabled:cursor-default ${form.resolutionType === t ? "bg-green-600 text-white border-green-600" : "bg-white border-gray-300 text-gray-600"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Resolution Remarks</label>
          <textarea rows="2" value={form.resolutionRemarks} onChange={e => sf("resolutionRemarks", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-300 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none resize-none disabled:bg-gray-50" />
        </div>
        <div className="col-span-2 flex flex-col gap-[0.2vw]">
          <label className="text-[0.75vw] font-semibold text-gray-500">Remarks</label>
          <textarea rows="1" value={form.remarks} onChange={e => sf("remarks", e.target.value)}
            disabled={!isAssignee || isClosed}
            className="border border-gray-300 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] outline-none resize-none disabled:bg-gray-50" />
        </div>
      </div>
      {isAssignee && !isClosed && (
        <div className="px-[0.8vw] pb-[0.8vw] flex gap-[0.5vw] justify-end">
          <button onClick={() => onSave({ ...form, visitStatus: "Open" })}
            className="px-[1vw] py-[0.45vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[0.4vw] text-[0.78vw] font-medium cursor-pointer">
            Save Progress
          </button>
          <button onClick={() => onSave({ ...form, visitStatus: "Closed", closedAt: new Date().toISOString() })}
            className="px-[1vw] py-[0.45vw] bg-green-600 hover:bg-green-700 text-white rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer flex items-center gap-[0.3vw]">
            <CheckCircle className="w-[0.85vw] h-[0.85vw]" />Close & Resolve
          </button>
        </div>
      )}
    </div>
  );
};

// ── Report Details Modal ──────────────────────────────────────────────────────
const ReportDetailsModal = ({ rec, onClose }) => {
  const getStatusColor = (s) => ({
    Resolved: "bg-green-100 text-green-700", Closed: "bg-gray-100 text-gray-600",
    Pending: "bg-gray-100 text-gray-600", Escalated: "bg-blue-100 text-blue-700",
    Assigned: "bg-blue-100 text-blue-700", Critical_Unresolved: "bg-red-100 text-red-700",
  })[s] || "bg-gray-100 text-gray-600";

  const startHistory = rec.escalationHistory?.[0];
  const startDate    = startHistory ? new Date(startHistory.assignedAt).toLocaleString() : (rec.assignedAt ? new Date(rec.assignedAt).toLocaleString() : "—");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
      <div className="bg-white w-[60vw] max-h-[85vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gray-900 px-[1.5vw] py-[1vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <Eye className="w-[1.2vw] h-[1.2vw] text-white" />
            <div>
              <h3 className="text-[1vw] font-bold text-white">{rec.callNumber}</h3>
              <p className="text-[0.72vw] text-gray-400">{rec.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-[0.7vw]">
            <span className={`text-[0.72vw] px-[0.6vw] py-[0.2vw] rounded font-bold ${getStatusColor(rec.status)}`}>
              {rec.status === "Critical_Unresolved" ? "CRITICAL" : rec.status}
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-[1.5vw] space-y-[1vw]">
          {(rec.contactPerson || rec.contactNumber || rec.emailId || rec.location) && (
            <div className="bg-slate-50 border border-slate-200 rounded-[0.5vw] px-[1vw] py-[0.7vw] flex flex-wrap gap-[1.5vw] items-center">
              <span className="text-[0.62vw] font-bold text-slate-400 uppercase tracking-wider">Contact</span>
              {rec.contactPerson  && <div className="flex items-center gap-[0.3vw] text-[0.78vw] text-slate-700"><User className="w-[0.85vw] h-[0.85vw] text-slate-400"/><strong>{rec.contactPerson}</strong></div>}
              {rec.contactNumber  && <div className="flex items-center gap-[0.3vw] text-[0.78vw] text-slate-700"><Phone className="w-[0.8vw] h-[0.8vw] text-slate-400"/>{rec.contactNumber}</div>}
              {rec.emailId        && <div className="flex items-center gap-[0.3vw] text-[0.78vw] text-slate-700"><Mail className="w-[0.8vw] h-[0.8vw] text-slate-400"/>{rec.emailId}</div>}
              {rec.location       && <div className="flex items-center gap-[0.3vw] text-[0.78vw] text-slate-700"><MapPin className="w-[0.8vw] h-[0.8vw] text-slate-400"/>{rec.location}</div>}
            </div>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded-[0.5vw] p-[0.8vw] flex items-center gap-[1vw]">
            <div className="flex-1">
              <div className="text-[0.68vw] font-semibold text-gray-400 uppercase mb-[0.2vw]">Started</div>
              <div className="text-[0.82vw] font-bold text-gray-700">{startHistory ? `${startHistory.department} → ${startHistory.engineerName}` : "—"}</div>
              <div className="text-[0.7vw] text-gray-400 mt-[0.1vw]">{startDate}</div>
            </div>
            <div className="flex items-center gap-[0.4vw] text-gray-300">
              <div className="w-[3vw] h-[0.1vw] bg-gray-300" /><ChevronRight className="w-[1vw] h-[1vw] text-gray-400" /><div className="w-[3vw] h-[0.1vw] bg-gray-300" />
            </div>
            <div className="flex-1 text-right">
              <div className="text-[0.68vw] font-semibold text-gray-400 uppercase mb-[0.2vw]">Current</div>
              <div className="text-[0.82vw] font-bold text-gray-700">{rec.currentEngineerName} ({rec.currentDepartment})</div>
              <span className={`inline-block text-[0.7vw] px-[0.5vw] py-[0.1vw] rounded mt-[0.1vw] font-semibold ${getStatusColor(rec.status)}`}>
                {rec.status === "Critical_Unresolved" ? "CRITICAL" : rec.status}
              </span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-[0.5vw] overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
              <Package className="w-[0.9vw] h-[0.9vw] text-blue-500" />
              <span className="text-[0.8vw] font-bold text-gray-700">Products ({rec.products?.length || 0})</span>
            </div>
            <div className="divide-y divide-gray-100">
              {rec.products?.map((p, i) => {
                const cfg = PROD_STATUS_CFG[getProductStatus(p)];
                return (
                  <div key={i} className={`px-[0.8vw] py-[0.7vw] ${p._resolved ? "bg-green-50" : p._productClosure?.status === "Pending" ? "bg-gray-50" : ""}`}>
                    <div className="flex items-center justify-between mb-[0.25vw]">
                      <div className="flex items-center gap-[0.5vw]">
                        <div className={`w-[0.6vw] h-[0.6vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-[0.8vw] font-semibold text-gray-700">{p.productModel || p.itemCode || `Product ${i+1}`}</span>
                        {p.serialNumber && <span className="text-[0.65vw] text-gray-400 font-mono">SN: {p.serialNumber}</span>}
                      </div>
                      <span className={`text-[0.65vw] px-[0.45vw] py-[0.12vw] rounded-full border font-bold ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {rec.escalationHistory?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-[0.5vw] overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
                <History className="w-[0.9vw] h-[0.9vw] text-gray-500" />
                <span className="text-[0.8vw] font-bold text-gray-700">Call Escalation Flow</span>
              </div>
              <div className="p-[0.8vw] space-y-[0.5vw]">
                {rec.escalationHistory.map((h, i) => (
                  <div key={i} className="flex gap-[0.6vw]">
                    <div className="flex flex-col items-center">
                      <div className={`w-[1.6vw] h-[1.6vw] rounded-full flex items-center justify-center text-white text-[0.6vw] font-bold flex-shrink-0 ${h.level === 0 ? "bg-blue-500" : h.level === 1 ? "bg-gray-500" : "bg-gray-800"}`}>L{h.level + 1}</div>
                      {i < rec.escalationHistory.length - 1 && <div className="w-[0.1vw] flex-1 bg-gray-200 my-[0.2vw]" />}
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-100 rounded-[0.4vw] p-[0.5vw] mb-[0.2vw]">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[0.8vw] font-bold text-gray-700">{h.department}</span>
                          <span className="text-[0.72vw] text-gray-500 ml-[0.4vw]">→ {h.engineerName}</span>
                        </div>
                        <span className="text-[0.68vw] text-gray-400">{new Date(h.assignedAt).toLocaleString()}</span>
                      </div>
                      {h.reason && <p className="text-[0.7vw] text-gray-600 mt-[0.2vw] flex items-center gap-[0.25vw]"><AlertTriangle className="w-[0.7vw] h-[0.7vw]" />{h.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-[1.5vw] py-[0.8vw] border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-[1.5vw] py-[0.5vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.4vw] text-[0.82vw] font-semibold cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
};

const IssueDetailsContainer = ({ product }) => {
  const hasPhotos = product.photos && product.photos.length > 0;
  const hasVideos = product.videos && product.videos.length > 0;

  if (!product.callDescription && !product.errorCode && !product.warrantyStatus && !hasPhotos && !hasVideos) return null;

  return (
    <div className="mt-[0.4vw] bg-white border border-gray-200 rounded-[0.4vw] p-[0.55vw] shadow-sm">
      <div className="flex items-center gap-[0.4vw] mb-[0.3vw]">
        <AlertCircle className="w-[0.7vw] h-[0.7vw] text-blue-600" />
        <span className="text-[0.7vw] font-bold text-gray-700">Product Issue Details</span>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-[0.35vw] p-[0.5vw] space-y-[0.25vw]">
        {product.errorCode && (
          <div className="text-[0.7vw] text-gray-700">
            <span className="font-semibold text-gray-500">Error Code:</span>{" "}
            <span className="font-mono text-red-600">{product.errorCode}</span>
          </div>
        )}
        {product.warrantyStatus && (
          <div className="text-[0.7vw] text-gray-700">
            <span className="font-semibold text-gray-500">Warranty Status:</span>{" "}
            <span className={product.warrantyStatus === "In Warranty" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {product.warrantyStatus}
            </span>
          </div>
        )}
        {product.callDescription && (
          <div className="text-[0.7vw] text-gray-700">
            <span className="font-semibold text-gray-500">Description:</span>{" "}
            <span className="text-gray-800 whitespace-pre-line">{product.callDescription}</span>
          </div>
        )}
      </div>
      {(hasPhotos || hasVideos) && (
        <div className="mt-[0.4vw] pt-[0.3vw] border-t border-dashed border-gray-200">
          <div className="text-[0.6vw] text-gray-400 uppercase font-bold mb-[0.2vw]">Evidence</div>
          <div className="flex gap-[0.3vw] overflow-x-auto">
            {hasPhotos && product.photos.map((url, idx) => (
              <div key={`ph-${idx}`} className="relative w-[2.5vw] h-[2.5vw] rounded-[0.25vw] overflow-hidden border border-gray-200">
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
            {hasVideos && product.videos.map((url, idx) => (
              <div key={`vid-${idx}`} className="relative w-[2.5vw] h-[2.5vw] rounded-[0.25vw] overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                <video src={url} className="w-full h-full object-cover" controls />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Escalation Card ───────────────────────────────────────────────────────────
const EscalationCard = ({ entry, currentUser, timer, isExpanded, onToggle,
  onSupportRequest, onAssignFieldVisit, onAssignInhouse, onProductClose }) => {

  const [activeProductIdx, setActiveProductIdx] = useState(0);
  const [productModals, setProductModals]        = useState({});
  const setPM = (idx, key, val) => setProductModals(p => ({ ...p, [idx]: { ...(p[idx] || {}), [key]: val } }));

  const totalProducts  = entry.products?.length || 0;
  const resolvedCount  = entry.products?.filter(p => p._resolved || p._productClosure?.closedAt).length || 0;
  const isCurrentOwner = entry.currentEngineerId === currentUser?.userId;
  const isCritical     = entry.status === "Critical_Unresolved";

  const isProductHandled = (p) =>
    p._supportRequested || p._productClosure?.status === "Pending" ||
    p._productClosure?.status === "Closed" || p._resolved;

  const openProducts = useMemo(() =>
    (entry.products || []).map((p, i) => ({ p, i })).filter(({ p }) => !isProductHandled(p)),
    [entry.products]
  );

  const clampedIdx    = Math.min(activeProductIdx, Math.max(0, openProducts.length - 1));
  const activeProdObj = openProducts[clampedIdx];
  const activeProd    = activeProdObj?.p;
  const safeActiveIdx = activeProdObj?.i ?? 0;

  return (
    <>
      <div className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all ${
        isCritical ? "border-red-300 shadow-sm shadow-red-100"
        : entry.status === "Escalated" ? "border-gray-400"
        : entry.status === "Resolved"  ? "border-green-300"
        : "border-gray-200"}`}>

        <div className="px-[0.9vw] pt-[0.8vw] pb-[0.6vw] cursor-pointer" onClick={onToggle}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-[0.8vw]">
              <div>
                <div className="flex items-center gap-[0.4vw] flex-wrap">
                  <span className="font-mono text-[0.88vw] font-bold text-gray-800">{entry.callNumber}</span>
                  <span className={`text-[0.62vw] px-[0.4vw] py-[0.1vw] rounded font-semibold ${
                    entry.priority === "Critical" ? "bg-red-50 text-red-600 border border-red-200"
                    : entry.priority === "High"   ? "bg-gray-100 text-gray-700 border border-gray-300"
                    : entry.priority === "Medium" ? "bg-gray-50 text-gray-600 border border-gray-200"
                    : "bg-green-50 text-green-600 border border-green-200"}`}>
                    {entry.priority}
                  </span>
                </div>
                <div className="text-[0.72vw] text-gray-600 mt-[0.15vw] font-medium">
                  <User className="w-[0.72vw] h-[0.72vw] inline mr-[0.2vw] text-gray-400" />{entry.customerName}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-[0.5vw]">
              {timer && entry.status !== "Resolved" && (
                <div className={`flex items-center gap-[0.25vw] px-[0.5vw] py-[0.28vw] rounded-[0.4vw] font-mono text-[0.72vw] font-bold ${timer.isExpired ? "bg-red-100 text-red-600 animate-pulse" : timer.isUrgent ? "bg-gray-100 text-gray-700 animate-pulse" : "bg-blue-50 text-blue-600"}`}>
                  <Clock className="w-[0.78vw] h-[0.78vw]" />{timer.isExpired ? "ESCALATING" : timer.remainingFormatted}
                </div>
              )}
              {isExpanded ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
            </div>
          </div>
        </div>

        {isExpanded && <ContactInfoBar entry={entry} />}

        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/60">
            {openProducts.length > 1 && (
              <div className="flex border-b border-gray-200 bg-white px-[0.8vw] pt-[0.5vw] gap-[0.25vw] overflow-x-auto">
                {openProducts.map(({ p: prod, i: realIdx }, tabIdx) => {
                  const cfg = PROD_STATUS_CFG[getProductStatus(prod)];
                  const isActive = clampedIdx === tabIdx;
                  return (
                    <button key={realIdx} type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveProductIdx(tabIdx); }}
                      className={`flex items-center gap-[0.3vw] px-[0.75vw] py-[0.45vw] rounded-t-[0.4vw] border-b-2 text-[0.72vw] font-semibold cursor-pointer whitespace-nowrap transition-all ${isActive ? "border-gray-900 text-gray-900 bg-gray-50/80" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                      <div className={`w-[0.5vw] h-[0.5vw] rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <Layers className="w-[0.72vw] h-[0.72vw]" />
                      <span>P{realIdx + 1}</span>
                      <span className="text-[0.62vw] max-w-[5vw] truncate text-gray-400">{prod.productModel || prod.itemCode || ""}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {openProducts.length === 0 ? (
              <div className="p-[0.8vw]">
                <div className="bg-gray-50 border border-gray-200 rounded-[0.4vw] px-[0.8vw] py-[0.6vw] text-center text-[0.78vw] text-gray-400">
                  All products handled — check Pending or Support tabs.
                </div>
              </div>
            ) : activeProd ? (
              <div className="p-[0.8vw] space-y-[0.5vw]">
                <div className="rounded-[0.5vw] border p-[0.7vw] bg-white border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-[0.5vw]">
                      <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-900 flex items-center justify-center text-[0.58vw] font-bold text-white flex-shrink-0">
                        {safeActiveIdx + 1}
                      </div>
                      <div>
                        <div className="text-[0.82vw] font-bold text-gray-800">{activeProd.productModel || activeProd.itemCode || `Product ${safeActiveIdx + 1}`}</div>
                        <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                          {activeProd.serialNumber && <span className="text-[0.63vw] text-gray-400 font-mono">SN: {activeProd.serialNumber}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-[0.5vw] items-center">
                      <button onClick={() => setPM(safeActiveIdx, "support", true)}
                        className="flex items-center gap-[0.3vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-[0.65vw] py-[0.28vw] rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer transition-all">
                        <Share2 className="w-[0.75vw] h-[0.75vw]" />Request Support
                      </button>
                      <ProductSLATimer product={activeProd} globalTimer={timer} />
                    </div>
                  </div>

                  <IssueDetailsContainer product={activeProd} />

                  {activeProd._escalationHistory?.length > 0 && (
                    <div className="mt-[0.45vw] pt-[0.35vw] border-t border-gray-100">
                      <div className="text-[0.6vw] font-bold text-gray-400 uppercase tracking-wider mb-[0.2vw]">Escalation Trail</div>
                      {activeProd._escalationHistory.map((h, hi) => (
                        <div key={hi} className="flex items-center gap-[0.4vw] text-[0.65vw] py-[0.08vw]">
                          <span className={`px-[0.3vw] rounded text-[0.55vw] font-bold text-white ${hi === 0 ? "bg-blue-500" : hi === 1 ? "bg-gray-500" : "bg-gray-800"}`}>L{hi+1}</span>
                          <span className="text-gray-600 font-medium">{h.department}</span>
                          <span className="text-gray-400">→ {h.engineerName}</span>
                          <span className="text-gray-300 ml-auto text-[0.6vw]">{new Date(h.assignedAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(isCurrentOwner || isCritical) && (
                  <ProductClosurePanel
                    prod={activeProd} prodIdx={safeActiveIdx} entry={entry}
                    currentUser={currentUser} hidePending={false}
                    onAssignFieldVisit={(form, pIdx) => onAssignFieldVisit(form, pIdx)}
                    onAssignInhouse={(form, pIdx)    => onAssignInhouse(form, pIdx)}
                    onProductClose={(pIdx, data)     => onProductClose(pIdx, data)}
                  />
                )}
              </div>
            ) : null}

            {isCurrentOwner && entry.escalationHistory?.length > 0 && (
              <div className="mx-[0.8vw] mb-[0.8vw] bg-white rounded-[0.4vw] border border-gray-200 p-[0.7vw]">
                <h4 className="text-[0.72vw] font-bold text-gray-600 flex items-center gap-[0.3vw] mb-[0.45vw]">
                  <History className="w-[0.78vw] h-[0.78vw] text-gray-500" />Call Escalation Timeline
                </h4>
                {entry.escalationHistory.map((hist, idx) => (
                  <div key={idx} className="flex gap-[0.5vw] mb-[0.45vw] last:mb-0">
                    <div className="flex flex-col items-center mt-[0.5vw]">
                      <div className={`w-[1.3vw] h-[1.3vw] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[0.55vw] font-bold ${hist.level === 0 ? "bg-blue-500" : hist.level === 1 ? "bg-gray-500" : "bg-gray-800"}`}>
                        {hist.level + 1}
                      </div>
                      {idx < entry.escalationHistory.length - 1 && <div className="w-[0.1vw] flex-1 bg-gray-200 my-[0.1vw]" />}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-[0.35vw] p-[0.45vw] border border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[0.75vw] font-bold text-gray-700">{hist.department}</span>
                          <span className="text-[0.68vw] text-gray-500 ml-[0.35vw]">→ {hist.engineerName}</span>
                        </div>
                        <span className="text-[0.64vw] text-gray-700">{new Date(hist.assignedAt).toLocaleString()}</span>
                      </div>
                      {hist.reason && <p className="text-[0.67vw] text-gray-600 mt-[0.15vw] flex items-center gap-[0.2vw]"><AlertTriangle className="w-[0.65vw] h-[0.65vw]" />{hist.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {productModals[safeActiveIdx]?.support && (
        <SupportEscalationModal product={activeProd} entry={entry} currentUser={currentUser}
          onClose={() => setPM(safeActiveIdx, "support", false)}
          onConfirm={(d) => { onSupportRequest(safeActiveIdx, d); setPM(safeActiveIdx, "support", false); }} />
      )}
    </>
  );
};

// ── Visits Tab ────────────────────────────────────────────────────────────────
const VisitsTab = ({ type, currentUser, onAssignVisit }) => {
  const key = type === "Field Visit" ? FIELD_VISIT_KEY : INHOUSE_REPAIR_KEY;
  const [records, setRecords]   = useState([]);
  const [queue, setQueueLocal]  = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("assigned");
  const isFV = type === "Field Visit";

  useEffect(() => {
    const ld = () => { setRecords(load(key, [])); setQueueLocal(loadQ()); };
    ld(); const iv = setInterval(ld, 2000); return () => clearInterval(iv);
  }, [key]);

  const mine = records.filter(r => r.assignedTo === currentUser?.userId || r.assignedBy === currentUser?.userId);

  const openCalls = useMemo(() => {
    const uid = currentUser?.userId;
    if (!uid) return [];
    return queue.filter(e => {
      const isAssigned = e.currentEngineerId === uid;
      const isOpen     = ["Assigned", "Pending", "Escalated"].includes(e.status);
      const hasRecord  = records.some(r => r.callId === e.callId && r.type === type);
      return isAssigned && isOpen && !hasRecord;
    });
  }, [queue, records, currentUser, type]);

  const handleSaveCompletion = (recId, formData) => {
    const updated = records.map(r => r.id === recId ? { ...r, ...formData } : r);
    save(key, updated); setRecords(updated);
    if (formData.visitStatus === "Closed") {
      const q   = loadQ();
      const rec = records.find(r => r.id === recId);
      const upd = q.map(e => {
        if (e.callId !== rec?.callId) return e;
        const products = e.products?.map((p, i) => {
          if (rec.productIdx !== null && rec.productIdx !== undefined && i !== rec.productIdx) return p;
          return { ...p, _resolved: true, _resolutionType: formData.resolutionType, _resolutionRemarks: formData.resolutionRemarks, _resolvedAt: formData.closedAt };
        });
        const allDone = products.every(p => p._resolved || p._productClosure?.closedAt);
        return { ...e, products, status: allDone ? "Resolved" : e.status };
      });
      saveQ(upd);
    }
  };

  const Icon = isFV ? MapPin : Wrench;

  return (
    <div className="mt-[0.5vw]">
      <div className="flex gap-[0.3vw] mb-[0.8vw] bg-white border border-gray-200 rounded-[0.5vw] p-[0.25vw]">
        <button onClick={() => setViewMode("assigned")}
          className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${viewMode === "assigned" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
          <Icon className="w-[0.85vw] h-[0.85vw]" />Assigned Records
          {mine.length > 0 && <span className={`text-[0.62vw] px-[0.4vw] rounded-full font-bold ${viewMode === "assigned" ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600"}`}>{mine.length}</span>}
        </button>
        <button onClick={() => setViewMode("open")}
          className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${viewMode === "open" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
          <AlertCircle className="w-[0.85vw] h-[0.85vw]" />Open Calls
          {openCalls.length > 0 && <span className={`text-[0.62vw] px-[0.4vw] rounded-full font-bold ${viewMode === "open" ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700"}`}>{openCalls.length}</span>}
        </button>
      </div>

      {viewMode === "assigned" && (
        mine.length === 0 ? (
          <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
            <Icon className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
            <p className="text-[1vw] text-gray-400 font-medium">No {type} records</p>
          </div>
        ) : (
          <div className="space-y-[0.8vw]">
            {mine.map(rec => {
              const isExp = expanded === rec.id;
              const isClosed = rec.visitStatus === "Closed";
              const isAssignee = rec.assignedTo === currentUser?.userId;
              return (
                <div key={rec.id} className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all ${isClosed ? "border-green-300" : "border-gray-200"}`}>
                  <div className="p-[0.9vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : rec.id)}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-[0.7vw]">
                        <div className={`w-[2vw] h-[2vw] rounded-full flex items-center justify-center flex-shrink-0 ${isClosed ? "bg-green-500" : "bg-gray-900"}`}>
                          {isClosed ? <CheckCircle className="w-[1.1vw] h-[1.1vw] text-white" /> : <Icon className="w-[1vw] h-[1vw] text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-[0.4vw]">
                            <span className="font-mono text-[0.85vw] font-bold text-gray-800">{rec.callNumber}</span>
                            {isClosed && <Badge label="Completed" color="green" />}
                            {!isAssignee && <Badge label="Assigned by you" color="gray" />}
                            {rec.productIdx != null && <Badge label={`P${rec.productIdx + 1}`} color="blue" />}
                          </div>
                          <div className="text-[0.72vw] text-gray-500 mt-[0.15vw]">
                            {rec.customerName} · To: <strong>{rec.assignedToName}</strong>
                            {rec.visitDate && ` · ${rec.visitDate}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-[0.5vw]">
                        <span className="text-[0.68vw] text-gray-400">{new Date(rec.assignmentDate).toLocaleString()}</span>
                        {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
                      </div>
                    </div>
                  </div>
                  {isExp && (
                    <div className="border-t border-gray-100 p-[0.9vw] bg-gray-50">
                      {(rec.contactPerson || rec.contactNumber || rec.emailId || rec.location) && (
                        <div className="bg-slate-50 border border-slate-200 rounded-[0.4vw] px-[0.7vw] py-[0.4vw] flex flex-wrap gap-[1vw] mb-[0.6vw]">
                          <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider">Contact</span>
                          {rec.contactPerson && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><User className="w-[0.72vw] h-[0.72vw] text-slate-400"/><strong>{rec.contactPerson}</strong></div>}
                          {rec.contactNumber && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><Phone className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{rec.contactNumber}</div>}
                          {rec.emailId && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><Mail className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{rec.emailId}</div>}
                          {rec.location && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><MapPin className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{rec.location}</div>}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-[0.4vw] text-[0.75vw] bg-white border border-gray-200 rounded-[0.4vw] p-[0.7vw] mb-[0.6vw]">
                        <span className="text-gray-400">Product(s):</span>
                        <span className="font-medium">{rec.products?.map(p => p.productModel || p.itemCode).join(", ") || "—"}</span>
                        <span className="text-gray-400">Spare Required:</span>
                        <span className={rec.spareRequired === "Yes" ? "text-gray-900 font-semibold" : "text-gray-600"}>{rec.spareRequired}</span>
                        {rec.diagnosisSummary && <><span className="text-gray-400">Diagnosis:</span><span>{rec.diagnosisSummary}</span></>}
                      </div>
                      <VisitCompletionForm record={rec} type={type} currentUser={currentUser}
                        onSave={(formData) => handleSaveCompletion(rec.id, formData)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {viewMode === "open" && (
        openCalls.length === 0 ? (
          <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
            <CheckCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
            <p className="text-[1vw] text-gray-400 font-medium">All calls covered</p>
          </div>
        ) : (
          <div className="space-y-[0.6vw]">
            <div className="bg-blue-50 border border-blue-200 rounded-[0.4vw] px-[0.8vw] py-[0.5vw] text-[0.75vw] text-blue-700 font-medium">
              ⚡ These calls are assigned to you but have no {type} scheduled yet.
            </div>
            {openCalls.map(entry => {
              const isExp = expanded === ("open-" + entry.callId);
              return (
                <div key={entry.callId} className="bg-white rounded-[0.5vw] border border-gray-300 overflow-hidden hover:shadow-md transition-all">
                  <div className="p-[0.8vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : ("open-" + entry.callId))}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-[0.6vw]">
                        <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-[1vw] h-[1vw] text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-[0.4vw]">
                            <span className="font-mono text-[0.85vw] font-bold text-gray-800">{entry.callNumber}</span>
                            <Badge label={`${entry.products?.length || 0} product(s)`} color="blue" />
                          </div>
                          <div className="text-[0.72vw] text-gray-500 mt-[0.1vw]">{entry.customerName}</div>
                        </div>
                      </div>
                      {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
                    </div>
                  </div>
                  {isExp && (
                    <div className="border-t border-gray-100 p-[0.8vw] bg-gray-50/30 space-y-[0.6vw]">
                      {entry.products?.map((prod, pIdx) => {
                        if (prod._resolved || prod._productClosure?.closedAt) return null;
                        return (
                          <div key={pIdx} className="bg-white rounded-[0.4vw] border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-[0.7vw] py-[0.4vw] flex items-center gap-[0.4vw]">
                              <Layers className="w-[0.85vw] h-[0.85vw] text-gray-500" />
                              <span className="text-[0.75vw] font-bold text-gray-700">P{pIdx+1}: {prod.productModel || prod.itemCode}</span>
                              {prod.serialNumber && <span className="text-[0.63vw] text-gray-400 font-mono">SN: {prod.serialNumber}</span>}
                            </div>
                            <div className="p-[0.6vw]">
                              <AssignVisitModal type={type} entry={entry} product={prod} currentUser={currentUser}
                                inlineMode={true} onClose={() => setExpanded(null)}
                                onSave={(form) => { if (onAssignVisit) onAssignVisit(entry.callId, type, form, pIdx); setExpanded(null); setViewMode("assigned"); }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

// ── Small reusable close sub-panel ────────────────────────────────────────────
const _CloseSubPanel = ({ resolutionType, setResType, remarks, setRemarks, onConfirm }) => (
  <div className="p-[0.6vw] border border-gray-200 rounded-[0.4vw] bg-gray-50 space-y-[0.4vw]">
    <div className="text-[0.65vw] font-bold text-gray-400 uppercase tracking-wider">Resolution Type</div>
    <div className="flex flex-wrap gap-[0.25vw]">
      {["Fixed","Replaced","No Fault Found","Partially Fixed"].map(t => (
        <button key={t} type="button" onClick={() => setResType(t)}
          className={`px-[0.55vw] py-[0.28vw] rounded-[0.3vw] border text-[0.65vw] font-medium cursor-pointer ${resolutionType === t ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>
          {t}
        </button>
      ))}
    </div>
    <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)}
      placeholder="Closure remarks…"
      className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.7vw] outline-none resize-none focus:border-gray-400 bg-white" />
    <div className="flex justify-end">
      <button onClick={onConfirm}
        className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.35vw] bg-green-600 hover:bg-green-700 text-white rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">
        <CheckCircle className="w-[0.72vw] h-[0.72vw]" />Confirm Close
      </button>
    </div>
  </div>
);

// ── Support Request Action Panel ──────────────────────────────────────────────
const SupportReqActionPanel = ({ req, currentUser, onDone }) => {
  const [action, setAction]          = useState("");
  const [resolutionType, setResType] = useState("Fixed");
  const [remarks, setRemarks]        = useState("");
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  const fakeEntry   = { callId: req.callId, callNumber: req.callNumber, customerName: req.product?.customerName || "", contactPerson: req.contactPerson || "", contactNumber: req.contactNumber || "", emailId: req.emailId || "", location: req.location || "", currentDepartment: currentUser?.department || "" };
  const fakeProduct = req.product || {};

  const markReqStatus = (updates) => {
    const all     = load(SUPPORT_REQ_KEY, []);
    const updated = all.map(r => r.id === req.id ? { ...r, ...updates } : r);
    save(SUPPORT_REQ_KEY, updated); onDone();
  };

  const handleClose = () => {
    if (!remarks.trim()) { alert("Please enter closure remarks."); return; }
    markReqStatus({ status: "Resolved", resolvedAt: new Date().toISOString(), resolutionNotes: remarks, resolutionType, closureType: "Direct" });
    const q = loadQ();
    const upd = q.map(e => {
      if (e.callId !== req.callId) return e;
      const products = e.products?.map((p, i) => i !== req.productIdx ? p : { ...p, _productClosure: { status: "Closed", closureType: "Direct", resolutionType, remarks, closedAt: new Date().toISOString() } });
      const allDone = products.every(p => p._resolved || p._productClosure?.closedAt);
      return { ...e, products, status: allDone ? "Resolved" : e.status };
    });
    saveQ(upd);
  };

  const handlePending = () => {
    markReqStatus({ status: "Pending", pendingReason: remarks, pendingAt: new Date().toISOString() });
    const q = loadQ();
    const upd = q.map(e => {
      if (e.callId !== req.callId) return e;
      const products = e.products?.map((p, i) => i !== req.productIdx ? p : { ...p, _productClosure: { status: "Pending", closureType: "Pending", remarks, pendingAt: new Date().toISOString() } });
      return { ...e, products };
    });
    saveQ(upd);
  };

  const handleAssignVisit = (type, form) => {
    const key = type === "Field Visit" ? FIELD_VISIT_KEY : INHOUSE_REPAIR_KEY;
    const records = load(key, []);
    records.push({ id: Date.now(), callId: req.callId, callNumber: req.callNumber, customerName: req.product?.customerName || "", products: [fakeProduct], productIdx: req.productIdx, assignedTo: form.assignedTo, assignedToName: form.assignedToName, assignedBy: currentUser?.userId, assignedByName: currentUser?.name, assignmentDate: form.assignmentDate, visitDate: form.visitDate, diagnosisSummary: form.diagnosisSummary, spareRequired: form.spareRequired, spareUsedDetails: form.spareUsedDetails, visitStatus: "Open", type, createdAt: new Date().toISOString(), contactPerson: req.contactPerson || "", contactNumber: req.contactNumber || "", emailId: req.emailId || "", location: req.location || "" });
    save(key, records);
    markReqStatus({ status: `${type} Assigned`, assignedVisitAt: new Date().toISOString(), assignedVisitTo: form.assignedToName });
  };

  // Support person escalating to another support person
  const handleEscalate = (data) => {
    const reqs = load(SUPPORT_REQ_KEY, []);
    reqs.push({ id: Date.now(), callId: req.callId, callNumber: req.callNumber, product: fakeProduct, productIdx: req.productIdx, requestedById: currentUser?.userId, requestedByName: currentUser?.name, supportPerson: data.supportPerson, notes: data.notes, status: "Pending", createdAt: new Date().toISOString(), contactPerson: req.contactPerson || "", contactNumber: req.contactNumber || "", emailId: req.emailId || "", location: req.location || "" });
    save(SUPPORT_REQ_KEY, reqs);
    markReqStatus({ status: "Escalated Further", escalatedTo: data.supportPerson.name, escalatedAt: new Date().toISOString() });
  };

  const isResolved = ["Resolved","Field Visit Assigned","In-house Repair Assigned","Escalated Further"].includes(req.status);
  if (isResolved) return (
    <div className="bg-green-50 border border-green-200 rounded-[0.4vw] p-[0.6vw]">
      <p className="text-[0.75vw] font-bold text-green-700 mb-[0.15vw]">{req.status}</p>
      <p className="text-[0.72vw] text-green-800">{req.resolutionNotes || req.pendingReason || `Assigned to: ${req.assignedVisitTo || req.escalatedTo || ""}`}</p>
      {req.resolvedAt && <p className="text-[0.65vw] text-green-500 mt-[0.1vw]">{new Date(req.resolvedAt).toLocaleString()}</p>}
    </div>
  );

  const isPending = req.status === "Pending";

  const actionBtns = isPending
    ? [
        { key:"close",    label:"Close",       icon: CheckCircle, cls:"bg-gray-900 text-white",  hov:"hover:bg-gray-50 text-gray-700" },
        { key:"fv",       label:"Field Visit",  icon: MapPin,      cls:"bg-blue-600 text-white",   hov:"hover:bg-blue-50 text-blue-700" },
        { key:"inhouse",  label:"In-house",     icon: Wrench,      cls:"bg-gray-700 text-white",   hov:"hover:bg-gray-100 text-gray-700" },
      ]
    : [
        { key:"close",    label:"Close",       icon: CheckCircle, cls:"bg-gray-900 text-white",   hov:"hover:bg-gray-50 text-gray-700"  },
        { key:"pending",  label:"Pending",      icon: AlertCircle, cls:"bg-gray-600 text-white",   hov:"hover:bg-gray-100 text-gray-700" },
        { key:"fv",       label:"Field Visit",  icon: MapPin,      cls:"bg-blue-600 text-white",   hov:"hover:bg-blue-50 text-blue-700"  },
        { key:"inhouse",  label:"In-house",     icon: Wrench,      cls:"bg-gray-700 text-white",   hov:"hover:bg-gray-100 text-gray-700" },
        { key:"escalate", label:"Ask Support",  icon: Share2,      cls:"bg-blue-800 text-white",   hov:"hover:bg-blue-50 text-blue-800"  },
      ];

  return (
    <div className="space-y-[0.45vw]">
      <div className="flex flex-wrap gap-[0.3vw]">
        {actionBtns.map(({ key, label, icon: Icon, cls, hov }) => (
          <button key={key} type="button" onClick={() => setAction(action === key ? "" : key)}
            className={`flex items-center gap-[0.25vw] px-[0.65vw] py-[0.3vw] rounded-[0.35vw] border text-[0.7vw] font-semibold cursor-pointer transition-all ${action === key ? cls + " border-transparent" : `bg-white border-gray-200 ${hov}`}`}>
            <Icon className="w-[0.72vw] h-[0.72vw]" />{label}
          </button>
        ))}
      </div>
      {action === "close"   && <_CloseSubPanel resolutionType={resolutionType} setResType={setResType} remarks={remarks} setRemarks={setRemarks} onConfirm={handleClose} />}
      {action === "pending" && (
        <div className="p-[0.55vw] border border-gray-200 rounded-[0.4vw] bg-gray-50 space-y-[0.3vw]">
          <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Awaiting parts / further info…"
            className="w-full border border-gray-200 rounded-[0.3vw] p-[0.35vw] text-[0.7vw] outline-none resize-none focus:border-gray-400 bg-white" />
          <div className="flex justify-end">
            <button onClick={handlePending} className="flex items-center gap-[0.28vw] px-[0.75vw] py-[0.32vw] bg-gray-700 hover:bg-gray-800 text-white rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">
              <AlertCircle className="w-[0.7vw] h-[0.7vw]"/>Mark Pending
            </button>
          </div>
        </div>
      )}
      {action === "fv"      && <AssignVisitModal type="Field Visit" entry={fakeEntry} product={fakeProduct} currentUser={currentUser} inlineMode onClose={() => setAction("")} onSave={f => { handleAssignVisit("Field Visit", f); setAction(""); }} />}
      {action === "inhouse" && <AssignVisitModal type="In-house Repair" entry={fakeEntry} product={fakeProduct} currentUser={currentUser} inlineMode onClose={() => setAction("")} onSave={f => { handleAssignVisit("In-house Repair", f); setAction(""); }} />}
      {action === "escalate" && (
        <SupportEscalationModal product={fakeProduct} entry={{ ...fakeEntry, currentDepartment: currentUser?.department }} currentUser={currentUser} showAll={true}
          onClose={() => setAction("")}
          onConfirm={d => { handleEscalate(d); setAction(""); }} />
      )}
    </div>
  );
};

// ── Support Requests Tab ──────────────────────────────────────────────────────
const SupportRequestsTab = ({ currentUser }) => {
  const [reqs, setReqs]         = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [subTab, setSubTab]     = useState("assigned");
  const reload = () => setReqs(load(SUPPORT_REQ_KEY, []));
  const DONE   = ["Resolved","Field Visit Assigned","In-house Repair Assigned","Escalated Further"];

  useEffect(() => { reload(); const iv = setInterval(reload, 2000); return () => clearInterval(iv); }, []);

  const assignedToMe = reqs.filter(r => r.supportPerson?.userId === currentUser?.userId);
  const raisedByMe   = reqs.filter(r => r.requestedById === currentUser?.userId);
  
  // Pending = assigned to me AND status is Pending
  const pendingAssigned = assignedToMe.filter(r => r.status === "Pending");

  const getActiveList = () => {
    if (subTab === "assigned") return assignedToMe;
    if (subTab === "pending")  return pendingAssigned;
    return raisedByMe;
  };
  const activeList = getActiveList();

  const assignedPend = assignedToMe.filter(r => !DONE.includes(r.status)).length;
  const raisedPend   = raisedByMe.filter(r => !DONE.includes(r.status)).length;

  const subTabs = [
    { id: "assigned", label: "Request Assigned", icon: HelpCircle, count: assignedToMe.length, activeCount: assignedPend },
    { id: "pending",  label: "Request Pending",  icon: AlertCircle, count: pendingAssigned.length, activeCount: pendingAssigned.length },
    { id: "raised",   label: "Request Raised",   icon: Send,        count: raisedByMe.length, activeCount: raisedPend },
  ];

  return (
    <div className="mt-[0.5vw]">
      {/* Sub-tab bar — 3 tabs */}
      <div className="flex gap-[0.3vw] mb-[0.8vw] bg-white border border-gray-200 rounded-[0.5vw] p-[0.25vw]">
        {subTabs.map(({ id, label, icon: Icon, count, activeCount }) => {
          const isActive = subTab === id;
          const dotColor = id === "pending" ? "bg-gray-700" : id === "raised" ? "bg-blue-600" : "bg-gray-900";
          return (
            <button key={id} onClick={() => setSubTab(id)}
              className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${isActive ? (id === "pending" ? "bg-gray-700" : id === "raised" ? "bg-blue-600" : "bg-gray-900") + " text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
              <Icon className="w-[0.85vw] h-[0.85vw]" />
              {label}
              {count > 0 && (
                <span className={`text-[0.62vw] px-[0.4vw] rounded-full font-bold ${isActive ? "bg-white " + (id === "pending" ? "text-gray-700" : id === "raised" ? "text-blue-600" : "text-gray-900") : activeCount > 0 ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-500"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeList.length === 0 ? (
        <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
          <HelpCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
          <p className="text-[1vw] text-gray-400 font-medium">
            {subTab === "assigned" ? "No support requests assigned to you"
             : subTab === "pending" ? "No pending requests"
             : "No support requests raised by you"}
          </p>
        </div>
      ) : (
        <div className="space-y-[0.7vw]">
          {activeList.map(req => {
            const isExp  = expanded === req.id;
            const isDone = DONE.includes(req.status);
            const isAssigned = subTab === "assigned" || subTab === "pending";
            return (
              <div key={req.id} className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all ${isDone ? "border-green-300" : isAssigned ? "border-gray-300" : "border-blue-200"}`}>
                <div className="p-[0.9vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : req.id)}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-[0.6vw]">
                      <div className={`w-[1.8vw] h-[1.8vw] rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? "bg-green-500" : isAssigned ? "bg-gray-900" : "bg-blue-600"}`}>
                        {isDone ? <CheckCircle className="w-[1vw] h-[1vw] text-white" /> : <HelpCircle className="w-[1vw] h-[1vw] text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-[0.4vw] flex-wrap">
                          <span className="font-mono text-[0.85vw] font-bold text-gray-800">{req.callNumber}</span>
                          {/* Only show done badge if resolved — skip redundant status badges */}
                          {isDone && <Badge label={req.status} color="green" />}
                          {req.productIdx != null && <Badge label={`P${req.productIdx + 1}`} color="blue" />}
                        </div>
                        <div className="text-[0.72vw] text-gray-500 mt-[0.15vw]">
                          {isAssigned ? <>From: <strong>{req.requestedByName}</strong></> : <>To: <strong>{req.supportPerson?.name}</strong></>}
                          {req.product?.productModel && ` · ${req.product.productModel}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-[0.4vw]">
                      <span className="text-[0.68vw] text-gray-400">{new Date(req.createdAt).toLocaleString()}</span>
                      {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
                    </div>
                  </div>
                </div>
                {isExp && (
                  <div className="border-t border-gray-100 p-[0.9vw] bg-gray-50 space-y-[0.6vw]">
                    {(req.contactPerson || req.contactNumber || req.emailId || req.location) && (
                      <div className="bg-slate-50 border border-slate-200 rounded-[0.4vw] px-[0.7vw] py-[0.4vw] flex flex-wrap gap-[1vw]">
                        <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider">Contact</span>
                        {req.contactPerson && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><User className="w-[0.72vw] h-[0.72vw] text-slate-400"/><strong>{req.contactPerson}</strong></div>}
                        {req.contactNumber && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><Phone className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{req.contactNumber}</div>}
                        {req.emailId && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><Mail className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{req.emailId}</div>}
                        {req.location && <div className="flex items-center gap-[0.25vw] text-[0.72vw] text-slate-700"><MapPin className="w-[0.7vw] h-[0.7vw] text-slate-400"/>{req.location}</div>}
                      </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-[0.4vw] p-[0.6vw] grid grid-cols-2 gap-[0.3vw] text-[0.72vw]">
                      <span className="text-gray-400">Product:</span><span className="font-medium">{req.product?.productModel || "—"}</span>
                      <span className="text-gray-400">Serial:</span><span className="font-mono">{req.product?.serialNumber || "—"}</span>
                      {req.product?.callDescription && <><span className="text-gray-400">Issue:</span><span>{req.product.callDescription}</span></>}
                    </div>
                    <div className={`border rounded-[0.4vw] p-[0.55vw] ${isAssigned ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200"}`}>
                      <p className={`text-[0.72vw] font-bold mb-[0.15vw] ${isAssigned ? "text-gray-700" : "text-blue-700"}`}>
                        Handover Notes {isAssigned ? `(from ${req.requestedByName})` : `(to ${req.supportPerson?.name})`}
                      </p>
                      <p className={`text-[0.72vw] ${isAssigned ? "text-gray-800" : "text-blue-800"}`}>{req.notes}</p>
                    </div>
                    {/* Action panel shown for assigned AND pending sub-tabs */}
                    {(subTab === "assigned" || subTab === "pending")
                      ? <SupportReqActionPanel req={req} currentUser={currentUser} onDone={reload} />
                      : <div className="bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.5vw]">
                          <p className="text-[0.72vw] text-gray-500 italic">{isDone ? `Status: ${req.status}` : `Awaiting action from ${req.supportPerson?.name}`}</p>
                        </div>
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Pending Tab ───────────────────────────────────────────────────────────────
const PendingTab = ({ queue, currentUser, onProductClose, onAssignFieldVisit, onAssignInhouse }) => {
  const uid = currentUser?.userId;
  const [expanded, setExpanded] = useState(null);
  const [supportModals, setSupportModals] = useState({});

  const pendingItems = useMemo(() => {
    if (!uid) return [];
    return queue.filter(e => e.currentEngineerId === uid && e.products?.some(p => p._productClosure?.status === "Pending"));
  }, [queue, uid]);

  const handleSupportRequest = (entry, prod, realIdx, data) => {
    const reqs = load(SUPPORT_REQ_KEY, []);
    reqs.push({
      id: Date.now(), callId: entry.callId, callNumber: entry.callNumber, product: prod, productIdx: realIdx,
      requestedById: currentUser?.userId, requestedByName: currentUser?.name,
      supportPerson: data.supportPerson, notes: data.notes, status: "Pending",
      createdAt: new Date().toISOString(), contactPerson: entry.contactPerson || "",
      contactNumber: entry.contactNumber || "", emailId: entry.emailId || "", location: entry.location || ""
    });
    save(SUPPORT_REQ_KEY, reqs);
    // Mark product as support-requested
    const q = loadQ();
    const upd = q.map(e => {
      if (e.callId !== entry.callId) return e;
      const products = e.products.map((p, i) => {
        if (i !== realIdx) return p;
        return { ...p, _supportRequested: true, _supportPersonId: data.supportPerson.userId, _supportPersonName: data.supportPerson.name };
      });
      return { ...e, products };
    });
    saveQ(upd);
    setSupportModals(p => ({ ...p, [`${entry.callId}-${realIdx}`]: false }));
  };

  if (pendingItems.length === 0) return (
    <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200 mt-[1vw]">
      <CheckCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
      <p className="text-[1vw] text-gray-400 font-medium">No pending items</p>
    </div>
  );

  return (
    <div className="mt-[0.5vw] space-y-[0.7vw]">
      {pendingItems.map(entry => {
        const isExp = expanded === entry.callId;
        const pendingProds = entry.products?.filter(p => p._productClosure?.status === "Pending") || [];
        return (
          <div key={entry.callId} className="bg-white rounded-[0.6vw] border border-gray-300 overflow-hidden hover:shadow-md transition-all">
            <div className="px-[1vw] py-[0.7vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : entry.callId)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-[0.7vw]">
                  <div className="w-[2vw] h-[2vw] rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-[1vw] h-[1vw] text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-[0.4vw] flex-wrap">
                      <span className="font-mono text-[0.88vw] font-bold text-gray-800">{entry.callNumber}</span>
                      {/* Show count but not redundant "Pending" badge since we're already in Pending tab */}
                      <span className="text-[0.63vw] px-[0.4vw] py-[0.08vw] rounded bg-gray-100 text-gray-600 border border-gray-200 font-semibold">
                        {pendingProds.length} product{pendingProds.length > 1 ? "s" : ""} awaiting
                      </span>
                    </div>
                    <div className="text-[0.72vw] text-gray-500 mt-[0.12vw]">{entry.customerName}</div>
                  </div>
                </div>
                {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
              </div>
            </div>
            {isExp && (
              <div className="border-t border-gray-100 bg-gray-50/20 p-[0.9vw] space-y-[0.6vw]">
                <ContactInfoBar entry={entry} />
                {pendingProds.map((prod) => {
                  const realIdx = entry.products.findIndex(p => p === prod);
                  const modalKey = `${entry.callId}-${realIdx}`;
                  return (
                    <div key={realIdx} className="rounded-[0.4vw] border border-gray-200 bg-white p-[0.55vw]">
                      <div className="flex items-center justify-between mb-[0.3vw]">
                        <div className="flex items-center gap-[0.4vw]">
                          <div className="w-[1.3vw] h-[1.3vw] rounded-full bg-gray-700 flex items-center justify-center text-[0.56vw] font-bold text-white flex-shrink-0">{realIdx + 1}</div>
                          <div>
                            <div className="text-[0.78vw] font-bold text-gray-700">{prod.productModel || prod.itemCode}</div>
                            {prod.serialNumber && <div className="text-[0.62vw] text-gray-400 font-mono">SN: {prod.serialNumber}</div>}
                          </div>
                        </div>
                        {/* Request Support button in Pending tab */}
                        <button
                          onClick={() => setSupportModals(p => ({ ...p, [modalKey]: true }))}
                          className="flex items-center gap-[0.3vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-[0.65vw] py-[0.28vw] rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer transition-all">
                          <Share2 className="w-[0.75vw] h-[0.75vw]" />Request Support
                        </button>
                      </div>
                      {prod._productClosure?.remarks && (
                        <div className="text-[0.67vw] text-gray-600 bg-gray-50 border border-gray-100 rounded-[0.3vw] px-[0.45vw] py-[0.18vw] mb-[0.3vw]">
                          <strong>Note:</strong> {prod._productClosure.remarks}
                        </div>
                      )}
                      <ProductClosurePanel prod={prod} prodIdx={realIdx} entry={entry} currentUser={currentUser}
                        hidePending={true}
                        onAssignFieldVisit={(form, idx) => onAssignFieldVisit(entry.callId, form, idx)}
                        onAssignInhouse={(form, idx)    => onAssignInhouse(entry.callId, form, idx)}
                        onProductClose={(idx, data)     => onProductClose(entry.callId, idx, data)}
                      />
                      {/* Support escalation modal per-product */}
                      {supportModals[modalKey] && (
                        <SupportEscalationModal
                          product={prod}
                          entry={{ callId: entry.callId, callNumber: entry.callNumber, customerName: entry.customerName, contactPerson: entry.contactPerson || "", contactNumber: entry.contactNumber || "", emailId: entry.emailId || "", location: entry.location || "", currentDepartment: currentUser?.department || "" }}
                          currentUser={currentUser}
                          showAll={true}
                          onClose={() => setSupportModals(p => ({ ...p, [modalKey]: false }))}
                          onConfirm={(d) => handleSupportRequest(entry, prod, realIdx, d)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Reports Tab ───────────────────────────────────────────────────────────────
const ReportsTab = ({ currentUser }) => {
  const [detailRec, setDetailRec]       = useState(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const allRecords = useMemo(() => {
    const uid = currentUser?.userId;
    if (!uid) return [];
    const q = loadQ(); const suppReqs = load(SUPPORT_REQ_KEY, []); const fvs = load(FIELD_VISIT_KEY, []); const inhouse = load(INHOUSE_REPAIR_KEY, []);
    const seen = new Set(); const result = [];
    q.forEach(e => {
      const wasInvolved = e.currentEngineerId === uid || e.escalationHistory?.some(h => h.engineerId === uid) || fvs.some(f => f.callId === e.callId && (f.assignedTo === uid || f.assignedBy === uid)) || inhouse.some(f => f.callId === e.callId && (f.assignedTo === uid || f.assignedBy === uid)) || suppReqs.some(s => s.callId === e.callId && (s.requestedById === uid || s.supportPerson?.userId === uid));
      if (wasInvolved && !seen.has(e.callId)) {
        seen.add(e.callId);
        result.push({ ...e, _fieldVisits: fvs.filter(f => f.callId === e.callId), _inhouseRepairs: inhouse.filter(f => f.callId === e.callId) });
      }
    });
    return result.sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
  }, [currentUser]);

  const filteredRecords = useMemo(() => allRecords.filter(r => {
    const matchStatus = statusFilter === "All" || r.status === statusFilter || (statusFilter === "Critical" && r.status === "Critical_Unresolved");
    const q = search.toLowerCase();
    return matchStatus && (!q || r.callNumber?.toLowerCase().includes(q) || r.customerName?.toLowerCase().includes(q));
  }), [allRecords, statusFilter, search]);

  const getStatusBadge = (s) => ({
    Resolved:"bg-green-100 text-green-700 border-green-300", Closed:"bg-gray-100 text-gray-600 border-gray-300",
    Pending:"bg-gray-100 text-gray-600 border-gray-300", Escalated:"bg-blue-100 text-blue-700 border-blue-300",
    Assigned:"bg-blue-100 text-blue-700 border-blue-300", Critical_Unresolved:"bg-red-100 text-red-700 border-red-300"
  })[s] || "bg-gray-100 text-gray-600 border-gray-300";

  if (allRecords.length === 0) return (
    <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200 mt-[1vw]">
      <BarChart2 className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
      <p className="text-[1vw] text-gray-400 font-medium">No records found</p>
    </div>
  );

  return (
    <div className="mt-[0.5vw]">
      <div className="flex items-center gap-[0.8vw] mb-[0.8vw]">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer, call no…"
          className="flex-1 border border-gray-300 rounded-[0.4vw] px-[0.8vw] py-[0.45vw] text-[0.8vw] outline-none focus:border-gray-500 bg-white" />
      </div>
      <div className="flex gap-[0.3vw] mb-[0.8vw] flex-wrap">
        {["All","Assigned","Escalated","Resolved","Pending","Closed","Critical"].map(s => {
          const count = s === "All" ? allRecords.length : allRecords.filter(r => r.status === s || (s === "Critical" && r.status === "Critical_Unresolved")).length;
          if (s !== "All" && count === 0) return null;
          const isActive = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-[0.75vw] py-[0.28vw] rounded-full border text-[0.72vw] font-semibold cursor-pointer transition-all ${isActive ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>
              {s} <span className={`text-[0.62vw] font-bold ${isActive ? "text-gray-300" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-[0.5vw] border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["#","Call No","Date","Customer","Contact","Priority","Products","Status",""].map(h => (
                <th key={h} className="px-[0.7vw] py-[0.6vw] text-left text-[0.72vw] font-bold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.map((rec, idx) => {
              const resolvedCount = rec.products?.filter(p => p._resolved).length || 0;
              const totalProducts = rec.products?.length || 0;
              return (
                <tr key={rec.callId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-[0.7vw] py-[0.6vw] text-[0.72vw] text-gray-400">{idx+1}</td>
                  <td className="px-[0.7vw] py-[0.6vw]"><span className="text-[0.78vw] font-bold text-blue-600 font-mono">{rec.callNumber}</span></td>
                  <td className="px-[0.7vw] py-[0.6vw] text-[0.72vw] text-gray-600 whitespace-nowrap">{rec.assignedAt ? new Date(rec.assignedAt).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-[0.7vw] py-[0.6vw] text-[0.75vw] font-semibold text-gray-800">{rec.customerName}</td>
                  <td className="px-[0.7vw] py-[0.6vw] text-[0.7vw] text-gray-600">
                    {rec.contactPerson && <div className="font-medium">{rec.contactPerson}</div>}
                    {rec.contactNumber && <div className="text-gray-400">{rec.contactNumber}</div>}
                  </td>
                  <td className="px-[0.7vw] py-[0.6vw]">
                    {rec.priority && <span className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded-full border font-semibold ${rec.priority==="Critical"?"bg-red-50 text-red-600 border-red-200":rec.priority==="High"?"bg-gray-100 text-gray-700 border-gray-300":rec.priority==="Medium"?"bg-gray-50 text-gray-600 border-gray-200":"bg-green-50 text-green-600 border-green-200"}`}>{rec.priority}</span>}
                  </td>
                  <td className="px-[0.7vw] py-[0.6vw]">
                    <div className="flex items-center gap-[0.2vw]">
                      {rec.products?.map((p, i) => { const cfg = PROD_STATUS_CFG[getProductStatus(p)]; return <div key={i} title={`P${i+1}: ${cfg.label}`} className={`w-[1.3vw] h-[1.3vw] rounded-full flex items-center justify-center text-white text-[0.52vw] font-bold ${cfg.dot}`}>{i+1}</div>; })}
                      <span className="text-[0.62vw] text-gray-400 ml-[0.15vw]">{resolvedCount}/{totalProducts}</span>
                    </div>
                  </td>
                  <td className="px-[0.7vw] py-[0.6vw]">
                    <span className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded border font-semibold ${getStatusBadge(rec.status)}`}>{rec.status === "Critical_Unresolved" ? "CRITICAL" : rec.status}</span>
                  </td>
                  <td className="px-[0.7vw] py-[0.6vw]">
                    <button onClick={() => setDetailRec(rec)} className="flex items-center gap-[0.25vw] bg-gray-900 hover:bg-gray-800 text-white px-[0.6vw] py-[0.3vw] rounded-[0.3vw] text-[0.68vw] font-semibold cursor-pointer">
                      <Eye className="w-[0.7vw] h-[0.7vw]"/>Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRecords.length === 0 && <div className="text-center py-[2vw] text-gray-400 text-[0.8vw]">No records match</div>}
        <div className="bg-gray-50 border-t border-gray-200 px-[0.8vw] py-[0.4vw]">
          <span className="text-[0.7vw] text-gray-500">Showing <strong>{filteredRecords.length}</strong> of <strong>{allRecords.length}</strong></span>
        </div>
      </div>
      {detailRec && <ReportDetailsModal rec={detailRec} onClose={() => setDetailRec(null)} />}
    </div>
  );
};

// ── Main ServiceCallResponse ──────────────────────────────────────────────────
const ServiceCallResponse = () => {
  const { timers, resolveCall } = useEscalationWorker();
  const [queue, setQueue]           = useState([]);
  const [expandedCall, setExpanded] = useState(null);
  const [activeTab, setActiveTab]   = useState("escalation");
  const [loggedInUser, setUser]     = useState(null);
  const notifiedRef = useRef({ critical: new Set(), escalated: new Set() });

  useEffect(() => {
    requestNotifPermission();
    const u = JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
    if (u) setUser(u);
  }, []);

  useEffect(() => {
    const ld = () => setQueue(loadQ());
    ld(); const iv = setInterval(ld, 1000); return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!loggedInUser || Notification.permission !== "granted") return;
    queue.forEach(e => {
      const k = `${e.callId}-${e.currentLevel}`;
      if (e.status === "Critical_Unresolved" && !notifiedRef.current.critical.has(e.callId)) {
        notifiedRef.current.critical.add(e.callId);
        try { new Notification(`🚨 CRITICAL: ${e.callNumber}`, { body: `All levels exhausted! ${e.customerName}`, tag: `crit-${e.callId}`, renotify: true }); } catch {}
      }
      if (e.status === "Escalated" && e.currentEngineerId === loggedInUser.userId && !notifiedRef.current.escalated.has(k)) {
        notifiedRef.current.escalated.add(k);
        try { new Notification(`📢 Escalated: ${e.callNumber}`, { body: `Customer: ${e.customerName}`, tag: `esc-${k}`, renotify: true }); } catch {}
      }
    });
  }, [queue, loggedInUser]);

  const isMovedOut = (e) =>
    e.products?.length > 0 &&
    e.products.every(p => p._resolved || p._productClosure?.status === "Closed" || p._productClosure?.status === "Pending" || p._supportRequested);

  const myEscalations = useMemo(() => {
    const uid = loggedInUser?.userId;
    const isAdmin = loggedInUser?.department === "Admin";
    return queue.filter(e => {
      if (!isAdmin && e.currentEngineerId !== uid) return false;
      if (isMovedOut(e)) return false;
      return true;
    });
  }, [queue, loggedInUser]);

  const liveCounts = useMemo(() => ({
    escalation: myEscalations.filter(e => !["Resolved","Closed"].includes(e.status)).length,
    support:    load(SUPPORT_REQ_KEY, []).filter(r => r.supportPerson?.userId === loggedInUser?.userId && r.status !== "Resolved").length,
    fieldVisit: load(FIELD_VISIT_KEY, []).filter(r => r.assignedTo === loggedInUser?.userId && r.visitStatus !== "Closed").length,
    inhouse:    load(INHOUSE_REPAIR_KEY, []).filter(r => r.assignedTo === loggedInUser?.userId && r.visitStatus !== "Closed").length,
    pending:    queue.filter(e => e.currentEngineerId === loggedInUser?.userId && e.products?.some(p => p._productClosure?.status === "Pending")).length,
  }), [queue, loggedInUser]);

  const updateQueue = (callId, updater) => {
    const upd = loadQ().map(e => e.callId === callId ? updater(e) : e);
    saveQ(upd); setQueue(upd);
  };

  const handleSupportRequest = (callId, pIdx, data) => {
    const q = loadQ(); const entry = q.find(e => e.callId === callId); if (!entry) return;
    const product = entry.products[pIdx];
    const reqs = load(SUPPORT_REQ_KEY, []);
    reqs.push({ id: Date.now(), callId, callNumber: entry.callNumber, product, productIdx: pIdx, requestedById: loggedInUser?.userId, requestedByName: loggedInUser?.name, supportPerson: data.supportPerson, notes: data.notes, status: "Pending", createdAt: new Date().toISOString(), contactPerson: entry.contactPerson || "", contactNumber: entry.contactNumber || "", emailId: entry.emailId || "", location: entry.location || "" });
    save(SUPPORT_REQ_KEY, reqs);
    updateQueue(callId, e => {
      const products = e.products.map((p, i) => {
        if (i !== pIdx) return p;
        const prevHistory = p._escalationHistory || []; const newLevel = prevHistory.length;
        return { ...p, _supportRequested: true, _supportPersonId: data.supportPerson.userId, _supportPersonName: data.supportPerson.name, _currentDepartment: data.supportPerson.department, _escalationLevel: newLevel, _escalationHistory: [...prevHistory, { level: newLevel, department: data.supportPerson.department, engineerId: data.supportPerson.userId, engineerName: data.supportPerson.name, assignedAt: new Date().toISOString(), reason: `Support by ${loggedInUser?.name}: ${data.notes.slice(0,60)}` }] };
      });
      const allReassigned = products.every(p => p._supportRequested || p._resolved || p._productClosure?.closedAt);
      return { ...e, products, ...(allReassigned ? { currentEngineerId: data.supportPerson.userId, currentEngineerName: data.supportPerson.name, currentDepartment: data.supportPerson.department, status: "Escalated", escalationHistory: [...(e.escalationHistory || []), { level: e.currentLevel || 0, department: data.supportPerson.department, engineerId: data.supportPerson.userId, engineerName: data.supportPerson.name, assignedAt: new Date().toISOString(), reason: "All products escalated" }] } : { status: "Escalated" }) };
    });
  };

  const handleAssignVisit = (callId, type, form, productIdx = null) => {
    const key = type === "Field Visit" ? FIELD_VISIT_KEY : INHOUSE_REPAIR_KEY;
    const entry = loadQ().find(e => e.callId === callId); if (!entry) return;
    const linkedProducts = productIdx !== null ? [entry.products[productIdx]].filter(Boolean) : entry.products;
    const records = load(key, []);
    records.push({ id: Date.now(), callId, callNumber: entry.callNumber, customerName: entry.customerName, products: linkedProducts, productIdx, assignedTo: form.assignedTo, assignedToName: form.assignedToName, assignedBy: loggedInUser?.userId, assignedByName: loggedInUser?.name, assignmentDate: form.assignmentDate, visitDate: form.visitDate, diagnosisSummary: form.diagnosisSummary, spareRequired: form.spareRequired, spareUsedDetails: form.spareUsedDetails, visitStatus: "Open", type, createdAt: new Date().toISOString(), contactPerson: entry.contactPerson || "", contactNumber: entry.contactNumber || "", emailId: entry.emailId || "", location: entry.location || "" });
    save(key, records);
  };

  const handleProductClose = (callId, pIdx, closureData) => {
    updateQueue(callId, e => {
      const products = e.products.map((p, i) => i === pIdx ? { ...p, _productClosure: closureData } : p);
      const allDone  = products.every(p => p._resolved || p._productClosure?.closedAt);
      return { ...e, products, status: allDone ? "Resolved" : e.status };
    });
  };

  const tabs = [
    { id: "escalation", label: "Escalation",      icon: Shield,     color: "black",  count: liveCounts.escalation },
    { id: "pending",    label: "Pending",          icon: AlertCircle,color: "dark",   count: liveCounts.pending },
    { id: "support",    label: "Support Requests", icon: HelpCircle, color: "blue",   count: liveCounts.support },
    { id: "fieldvisit", label: "Field Visit",      icon: MapPin,     color: "blue",   count: liveCounts.fieldVisit },
    { id: "inhouse",    label: "In-house Repair",  icon: Wrench,     color: "dark",   count: liveCounts.inhouse },
    { id: "reports",    label: "Reports",          icon: BarChart2,  color: "gray",   count: 0 },
  ];

  const getTabActive = (color) => {
    if (color === "blue") return "bg-blue-600 text-white shadow-sm";
    if (color === "dark") return "bg-gray-700 text-white shadow-sm";
    if (color === "gray") return "bg-gray-500 text-white shadow-sm";
    return "bg-gray-900 text-white shadow-sm"; // black
  };
  const getBadgeActive = (color) => {
    if (color === "blue") return "bg-white text-blue-600";
    if (color === "dark") return "bg-white text-gray-700";
    if (color === "gray") return "bg-white text-gray-500";
    return "bg-white text-gray-900";
  };
  const getBadgeInact = (color) => {
    if (color === "blue") return "bg-blue-100 text-blue-700";
    if (color === "dark") return "bg-gray-200 text-gray-700";
    return "bg-gray-200 text-gray-600";
  };

  return (
    <div className="flex flex-col h-full text-[0.85vw]">
      <div className="flex gap-[0.3vw] mb-[1vw] bg-white border border-gray-200 rounded-[0.6vw] p-[0.3vw] shadow-sm sticky top-0 z-10">
        {tabs.map(({ id, label, icon: Icon, color, count }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-[0.4vw] px-[0.9vw] py-[0.5vw] rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer transition-all flex-1 justify-center ${activeTab === id ? getTabActive(color) : "text-gray-600 hover:bg-gray-100"}`}>
            <Icon className="w-[0.88vw] h-[0.88vw]" />{label}
            {count > 0 && (
              <span className={`text-[0.6vw] px-[0.4vw] py-[0.04vw] rounded-full font-bold ${activeTab === id ? getBadgeActive(color) : getBadgeInact(color)}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 max-h-[82vh] overflow-y-auto pr-[0.3vw]">
        {activeTab === "escalation" && (
          myEscalations.length === 0 ? (
            <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
              <Shield className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
              <p className="text-[1vw] text-gray-400 font-medium">No active escalations</p>
              <p className="text-[0.8vw] text-gray-300 mt-[0.3vw]">Service calls assigned to you will appear here</p>
            </div>
          ) : (
            <div className="space-y-[0.8vw]">
              {myEscalations.map(entry => (
                <EscalationCard key={entry.callId} entry={entry} currentUser={loggedInUser}
                  timer={timers.find(t => t.callId === entry.callId)}
                  isExpanded={expandedCall === entry.callId}
                  onToggle={() => setExpanded(expandedCall === entry.callId ? null : entry.callId)}
                  onSupportRequest={(pIdx, d) => handleSupportRequest(entry.callId, pIdx, d)}
                  onAssignFieldVisit={(form, pIdx) => handleAssignVisit(entry.callId, "Field Visit", form, pIdx)}
                  onAssignInhouse={(form, pIdx)    => handleAssignVisit(entry.callId, "In-house Repair", form, pIdx)}
                  onProductClose={(pIdx, data)     => handleProductClose(entry.callId, pIdx, data)}
                />
              ))}
            </div>
          )
        )}
        {activeTab === "pending" && (
          <PendingTab queue={queue} currentUser={loggedInUser}
            onProductClose={(cId,pIdx,d) => handleProductClose(cId,pIdx,d)}
            onAssignFieldVisit={(cId,f,pIdx) => handleAssignVisit(cId,"Field Visit",f,pIdx)}
            onAssignInhouse={(cId,f,pIdx) => handleAssignVisit(cId,"In-house Repair",f,pIdx)} />
        )}
        {activeTab === "support"    && <SupportRequestsTab currentUser={loggedInUser} />}
        {activeTab === "fieldvisit" && <VisitsTab type="Field Visit" currentUser={loggedInUser} onAssignVisit={(cId,t,f,pIdx) => handleAssignVisit(cId,t,f,pIdx)} />}
        {activeTab === "inhouse"    && <VisitsTab type="In-house Repair" currentUser={loggedInUser} onAssignVisit={(cId,t,f,pIdx) => handleAssignVisit(cId,t,f,pIdx)} />}
        {activeTab === "reports"    && <ReportsTab currentUser={loggedInUser} />}
      </div>
    </div>
  );
};

export default ServiceCallResponse;