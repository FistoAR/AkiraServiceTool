import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package, Clock, User, Shield, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, AlertTriangle, X, Eye,
  History, Send, HelpCircle, RefreshCw, BarChart2,
  FileText, Wrench, CheckSquare, Search, Layers,
  ChevronRight, Phone, Mail, MapPin, Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Storage Keys ───────────────────────────────────────────────────────────────
const INWARD_KEY           = "service_material_inward_v1";
const SMI_QUEUE_KEY        = "smi_escalation_queue_v1";
const SMI_SUPPORT_KEY      = "smi_support_requests_v1";
const EMPLOYEES_KEY        = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";

// ── Helpers ────────────────────────────────────────────────────────────────────
const lsLoad = (key, fb = []) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));

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

// ── Contact Info Bar (mirrors ServiceCallResponse) ────────────────────────────
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

// ── SLA Timer ─────────────────────────────────────────────────────────────────
const SLATimer = ({ deadline }) => {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!deadline) return;
    const calc = () => { const diff = new Date(deadline).getTime() - Date.now(); setRemaining(diff); };
    calc();
    const iv = setInterval(calc, 10000);
    return () => clearInterval(iv);
  }, [deadline]);

  if (remaining === null) return null;
  const mins = Math.ceil(remaining / 60000);
  const color = remaining < 0 ? "bg-red-100 text-red-600" : mins < 30 ? "bg-red-50 text-red-500" : mins < 120 ? "bg-gray-100 text-gray-700" : "bg-blue-50 text-blue-600";
  const label = remaining < 0
    ? `SLA Breached`
    : mins < 60 ? `${mins}m left` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <div className={`flex items-center gap-[0.25vw] px-[0.45vw] py-[0.2vw] rounded-[0.3vw] font-mono text-[0.68vw] font-bold ${color} ${remaining < 0 ? "animate-pulse" : ""}`}>
      <Clock className="w-[0.7vw] h-[0.7vw]" />{label}
    </div>
  );
};

// ── Auto-escalate hook ────────────────────────────────────────────────────────
function useAutoEscalate() {
  useEffect(() => {
    const check = () => {
      const entries = lsLoad(INWARD_KEY, []);
      const flows   = lsLoad(ESCALATION_FLOWS_KEY, {});
      const flow    = flows["Service Material"] || [];
      const emps    = lsLoad(EMPLOYEES_KEY, []);
      const now     = Date.now();
      let changed   = false;

      const updated = entries.map(entry => {
        if (!entry.escalationHistory?.length) return entry;
        const last = entry.escalationHistory[entry.escalationHistory.length - 1];
        if (!last?.deadline) return entry;
        if (new Date(last.deadline).getTime() > now) return entry;
        const nextLevel = (entry.escalationLevel || 0) + 1;
        if (nextLevel >= flow.length) {
          if (entry.status !== "Critical") { changed = true; return { ...entry, status: "Critical" }; }
          return entry;
        }
        const nextStep = flow[nextLevel];
        if (!nextStep) return entry;
        const slaMs = ((nextStep.durationHours || 2) * 3600_000) + ((nextStep.durationMins || 0) * 60_000);
        const deptEngs = emps.filter(e => e.department === nextStep.dept);
        const poolIds  = nextStep.engineerIds?.length ? nextStep.engineerIds : deptEngs.map(e => e.userId);
        const loadMap  = {};
        entries.forEach(e => { const id = e.currentEngineerId || e.assignedTo; if (id) loadMap[id] = (loadMap[id] || 0) + 1; });
        const picked    = poolIds.reduce((a, b) => (loadMap[a] || 0) <= (loadMap[b] || 0) ? a : b, poolIds[0]);
        const pickedEng = emps.find(e => e.userId === picked);
        changed = true;
        return {
          ...entry, status: "Escalated", escalationLevel: nextLevel,
          currentEngineerId: picked || entry.currentEngineerId,
          assignedTo: picked || entry.assignedTo,
          assignedToName: pickedEng?.name || entry.assignedToName,
          assignedDepartment: nextStep.dept,
          escalationHistory: [...entry.escalationHistory, {
            level: nextLevel, department: nextStep.dept,
            engineerId: picked || "", engineerName: pickedEng?.name || "Auto-assigned",
            assignedAt: new Date(now).toISOString(), deadline: new Date(now + slaMs).toISOString(),
            reason: "SLA timeout — auto-escalated",
          }],
        };
      });
      if (changed) lsSave(INWARD_KEY, updated);
    };
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, []);
}

// ── Product status helper (mirrors ServiceCallResponse) ───────────────────────
const getProductStatus = (entry) => {
  if (entry._closure?.status === "Closed")   return "closed";
  if (entry._closure?.status === "Pending")  return "pending";
  if (entry.status === "Rejected")           return "rejected";
  if (entry.status === "Inspected")          return "inspected";
  if (entry.status === "Received")           return "received";
  return "open";
};

const PROD_STATUS_CFG = {
  closed:   { dot: "bg-green-500",  label: "Closed",   cls: "bg-green-50 border-green-300 text-green-700"   },
  pending:  { dot: "bg-gray-500",   label: "Pending",  cls: "bg-gray-50 border-gray-300 text-gray-700"      },
  rejected: { dot: "bg-red-500",    label: "Rejected", cls: "bg-red-50 border-red-300 text-red-700"         },
  inspected:{ dot: "bg-blue-500",   label: "Inspected",cls: "bg-blue-50 border-blue-300 text-blue-700"      },
  received: { dot: "bg-blue-400",   label: "Received", cls: "bg-blue-50 border-blue-300 text-blue-700"      },
  open:     { dot: "bg-gray-400",   label: "Open",     cls: "bg-gray-50 border-gray-300 text-gray-600"      },
};

// ── Report Details Modal ──────────────────────────────────────────────────────
const ReportModal = ({ entry, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
    <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
      className="bg-white w-[56vw] max-h-[88vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col">
      <div className="bg-gray-900 px-[1.5vw] py-[1vw] flex justify-between items-center">
        <div className="flex items-center gap-[0.8vw]">
          <Package className="w-[1.2vw] h-[1.2vw] text-white" />
          <div>
            <h3 className="text-[1vw] font-bold text-white">{entry.refNo}</h3>
            <p className="text-[0.72vw] text-gray-400">{entry.customerName}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
      </div>

      <div className="overflow-y-auto flex-1 p-[1.5vw] space-y-[1vw]">
        <div className="grid grid-cols-2 gap-[0.6vw] bg-gray-50 border border-gray-200 rounded-[0.5vw] p-[0.9vw] text-[0.75vw]">
          <div><span className="text-gray-400">Customer: </span><strong>{entry.customerName}</strong></div>
          <div><span className="text-gray-400">Contact: </span><strong>{entry.contactPerson} {entry.contactNumber && `· ${entry.contactNumber}`}</strong></div>
          <div><span className="text-gray-400">Product: </span><strong>{entry.productDescription}</strong></div>
          <div><span className="text-gray-400">Serial: </span><strong className="font-mono">{entry.serialNumber || "—"}</strong></div>
          <div><span className="text-gray-400">Nature: </span><strong>{entry.natureOfProblem}</strong></div>
          <div><span className="text-gray-400">Warranty: </span>
            <span className={`font-semibold ${entry.warrantyStatus === "In Warranty" ? "text-green-600" : "text-red-600"}`}>{entry.warrantyStatus}</span>
          </div>
          <div><span className="text-gray-400">Qty: </span><strong>{entry.qty}</strong></div>
          <div><span className="text-gray-400">Status: </span><strong>{entry.status}</strong></div>
          {entry.symptomsObserved && <div className="col-span-2"><span className="text-gray-400">Symptoms: </span><span>{entry.symptomsObserved}</span></div>}
          {entry.rootCause && <div className="col-span-2"><span className="text-gray-400">Root Cause: </span><span>{entry.rootCause}</span></div>}
        </div>

        {entry.qcActions?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-[0.5vw] overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
              <CheckSquare className="w-[0.9vw] h-[0.9vw] text-blue-500" />
              <span className="text-[0.8vw] font-bold text-gray-700">QC / Inspection Log</span>
            </div>
            <div className="divide-y divide-gray-100">
              {entry.qcActions.map((a, i) => (
                <div key={i} className="px-[0.8vw] py-[0.6vw] flex items-start gap-[0.6vw]">
                  <div className={`w-[0.6vw] h-[0.6vw] rounded-full flex-shrink-0 mt-[0.3vw] ${a.action === "Received" ? "bg-blue-400" : a.action === "Inspected" ? "bg-blue-600" : a.action === "Rejected" ? "bg-red-400" : "bg-gray-400"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-[0.5vw]">
                      <span className="text-[0.78vw] font-bold text-gray-700">{a.action}</span>
                      {a.result && <span className="text-[0.68vw] bg-blue-50 text-blue-700 border border-blue-200 px-[0.4vw] rounded">{a.result}</span>}
                      <span className="text-[0.65vw] text-gray-400 ml-auto">{a.by} · {new Date(a.at).toLocaleString()}</span>
                    </div>
                    {a.remarks && <p className="text-[0.7vw] text-gray-600 mt-[0.15vw]">{a.remarks}</p>}
                    {a.components && <p className="text-[0.68vw] text-blue-700 font-medium mt-[0.1vw]">Components: {a.components}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.escalationHistory?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-[0.5vw] overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
              <History className="w-[0.9vw] h-[0.9vw] text-gray-500" />
              <span className="text-[0.8vw] font-bold text-gray-700">Escalation Flow</span>
            </div>
            <div className="p-[0.8vw] space-y-[0.5vw]">
              {entry.escalationHistory.map((h, i) => (
                <div key={i} className="flex gap-[0.6vw]">
                  <div className="flex flex-col items-center">
                    <div className={`w-[1.6vw] h-[1.6vw] rounded-full flex items-center justify-center text-white text-[0.6vw] font-bold flex-shrink-0 ${h.level === 0 ? "bg-blue-500" : h.level === 1 ? "bg-gray-500" : "bg-gray-800"}`}>L{h.level + 1}</div>
                    {i < entry.escalationHistory.length - 1 && <div className="w-[0.1vw] flex-1 bg-gray-200 my-[0.2vw]" />}
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-100 rounded-[0.4vw] p-[0.5vw] mb-[0.2vw]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[0.8vw] font-bold text-gray-700">{h.department}</span>
                        <span className="text-[0.72vw] text-gray-500 ml-[0.4vw]">→ {h.engineerName || "TBD"}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.68vw] text-gray-400">{new Date(h.assignedAt).toLocaleString()}</div>
                        {h.reason && <div className="text-[0.62vw] text-gray-500">{h.reason}</div>}
                      </div>
                    </div>
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
    </motion.div>
  </div>
);

// ── Product Closure Panel (mirrors ServiceCallResponse's ProductClosurePanel) ──
const ProductClosurePanel = ({ entry, onUpdate, hidePending = false }) => {
  const existing = entry._closure || {};
  const saved    = existing.status;
  const [selected, setSelected]           = useState(saved || "");
  const [resolutionType, setResolutionType] = useState(existing.resolutionType || "Fixed");
  const [remarks, setRemarks]             = useState(existing.remarks || "");

  const resetPanel = () => { setSelected(""); setResolutionType("Fixed"); setRemarks(""); };

  if (saved === "Closed")
    return (
      <div className="mt-[0.4vw] bg-green-50 border border-green-200 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] flex items-center gap-[0.4vw]">
        <CheckCircle className="w-[0.8vw] h-[0.8vw] text-green-500 flex-shrink-0" />
        <span className="text-[0.7vw] font-bold text-green-700">
          Closed · {existing.resolutionType || "Resolved"}
        </span>
        {existing.remarks && <span className="text-[0.65vw] text-green-500 truncate ml-[0.2vw]">— {existing.remarks}</span>}
      </div>
    );

  const actionTabs = [
    { key: "Closed",  label: "Close",   icon: CheckCircle },
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

      {/* Close sub-panel */}
      {selected === "Closed" && (
        <div className="mt-[0.4vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.55vw] space-y-[0.4vw]">
          <div className="flex items-center justify-between">
            <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider">Resolution Type</div>
            <button type="button" onClick={resetPanel} className="flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X className="w-[0.7vw] h-[0.7vw]" />
            </button>
          </div>
          <div className="flex flex-wrap gap-[0.25vw]">
            {["Fixed", "Replaced", "No Fault Found", "Partially Fixed", "Rejected"].map(t => (
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
            <button onClick={resetPanel} className="px-[0.7vw] py-[0.35vw] bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">Cancel</button>
            <button onClick={() => {
              if (!remarks.trim()) { alert("Please enter closure remarks."); return; }
              onUpdate({ _closure: { status: "Closed", resolutionType, remarks, closedAt: new Date().toISOString() } });
            }} className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.35vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">
              <CheckCircle className="w-[0.72vw] h-[0.72vw]" />Confirm Close
            </button>
          </div>
        </div>
      )}

      {/* Pending sub-panel */}
      {selected === "Pending" && !hidePending && (
        <div className="mt-[0.4vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.55vw] space-y-[0.35vw]">
          <div className="flex items-center justify-between">
            <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider">Pending Reason</div>
            <button type="button" onClick={resetPanel} className="flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X className="w-[0.7vw] h-[0.7vw]" />
            </button>
          </div>
          <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Reason for pending / awaiting parts…"
            className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.68vw] outline-none resize-none focus:border-gray-400 bg-white" />
          <div className="flex justify-end gap-[0.3vw]">
            <button onClick={resetPanel} className="px-[0.7vw] py-[0.35vw] bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">Cancel</button>
            <button onClick={() => {
              onUpdate({ _closure: { status: "Pending", remarks, pendingAt: new Date().toISOString() } });
            }} className="flex items-center gap-[0.3vw] px-[0.8vw] py-[0.35vw] bg-gray-700 hover:bg-gray-800 text-white rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer">
              <AlertCircle className="w-[0.72vw] h-[0.72vw]" />Mark Pending
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ── QC Action Panel ───────────────────────────────────────────────────────────
const INSPECTION_RESULTS = ["Pass", "Fail - Minor", "Fail - Major", "Conditional Pass"];

const QCActionPanel = ({ entry, currentUser, onUpdate }) => {
  const [action,       setAction]       = useState("");
  const [remarks,      setRemarks]      = useState("");
  const [result,       setResult]       = useState("Pass");
  const [components,   setComponents]   = useState("");
  const [supportSearch, setSupportSearch] = useState("");
  const [supportPerson, setSupportPerson] = useState(null);
  const [supportNotes,  setSupportNotes]  = useState("");

  const employees = lsLoad(EMPLOYEES_KEY, []);
  const isClosed  = entry._closure?.status === "Closed" || entry.status === "Rejected";

  const addQCAction = (actionName, extra = {}) => {
    const newAction = { action: actionName, by: currentUser?.name || "Unknown", byId: currentUser?.userId, at: new Date().toISOString(), remarks, ...extra };
    return [...(entry.qcActions || []), newAction];
  };

  const handleReceived = () => {
    if (!remarks.trim()) { alert("Please enter remarks."); return; }
    onUpdate({ status: "Received", qcActions: addQCAction("Received") });
    setAction(""); setRemarks("");
  };

  const handleInspected = () => {
    if (!remarks.trim()) { alert("Please enter inspection remarks."); return; }
    onUpdate({ status: "Inspected", qcActions: addQCAction("Inspected", { result, components }) });
    setAction(""); setRemarks(""); setComponents("");
  };

  const handleRejected = () => {
    if (!remarks.trim()) { alert("Please enter rejection reason."); return; }
    onUpdate({ status: "Rejected", qcActions: addQCAction("Rejected", { result }), closedAt: new Date().toISOString() });
    setAction(""); setRemarks("");
  };

  const handleSupport = () => {
    if (!supportPerson) { alert("Select a person."); return; }
    if (!supportNotes.trim()) { alert("Add handover notes."); return; }
    const reqs = lsLoad(SMI_SUPPORT_KEY, []);
    reqs.push({ id: `sr-${Date.now()}`, inwardId: entry.id, refNo: entry.refNo, product: entry.productDescription, requestedById: currentUser?.userId, requestedByName: currentUser?.name, supportPerson, notes: supportNotes, status: "Pending", createdAt: new Date().toISOString() });
    lsSave(SMI_SUPPORT_KEY, reqs);
    onUpdate({ status: "In Progress", qcActions: addQCAction("Support Requested", { supportPerson: supportPerson?.name, notes: supportNotes }) });
    setAction(""); setSupportPerson(null); setSupportNotes(""); setSupportSearch("");
  };

  const supportCandidates = employees.filter(e =>
    e.userId !== currentUser?.userId &&
    (e.name.toLowerCase().includes(supportSearch.toLowerCase()) || e.department?.toLowerCase().includes(supportSearch.toLowerCase()))
  );

  const ACTIONS = [
    { key: "Received",  label: "Mark Received", activeCls: "bg-blue-600 text-white"  },
    { key: "Inspected", label: "Inspected",      activeCls: "bg-gray-900 text-white"  },
    { key: "Rejected",  label: "Reject",         activeCls: "bg-red-600 text-white"   },
    { key: "Support",   label: "Ask Support",    activeCls: "bg-blue-800 text-white"  },
  ];

  if (isClosed) {
    const last = entry.qcActions?.[entry.qcActions.length - 1];
    return (
      <div className={`rounded-[0.4vw] p-[0.6vw] flex items-center gap-[0.5vw] border ${entry.status === "Rejected" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
        {entry.status === "Rejected"
          ? <AlertCircle className="w-[0.9vw] h-[0.9vw] text-red-600" />
          : <CheckCircle className="w-[0.9vw] h-[0.9vw] text-green-600" />}
        <div>
          <div className={`text-[0.75vw] font-bold ${entry.status === "Rejected" ? "text-red-700" : "text-green-700"}`}>{entry.status}{last?.result && ` — ${last.result}`}</div>
          {last?.remarks && <div className="text-[0.68vw] text-gray-500">{last.remarks}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[0.5vw]">
      {/* QC action buttons row */}
      <div className="flex gap-[0.3vw]">
        {ACTIONS.map(({ key, label, activeCls }) => (
          <button key={key} type="button" onClick={() => setAction(action === key ? "" : key)}
            className={`flex-1 py-[0.45vw] text-[0.7vw] font-semibold cursor-pointer rounded-[0.35vw] border transition-all ${action === key ? `${activeCls} border-transparent` : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-400"}`}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {action === "Received" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-blue-200 rounded-[0.4vw] bg-blue-50/40 p-[0.65vw] space-y-[0.4vw]">
            <div className="text-[0.65vw] font-bold text-gray-400 uppercase">Receiving Remarks</div>
            <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Condition on receipt, packaging notes, etc."
              className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.7vw] outline-none resize-none bg-white" />
            <button onClick={handleReceived} className="w-full py-[0.42vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.3vw] text-[0.7vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.3vw]">
              <CheckCircle className="w-[0.75vw] h-[0.75vw]" />Confirm Received
            </button>
          </motion.div>
        )}

        {action === "Inspected" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-gray-200 rounded-[0.4vw] bg-gray-50 p-[0.65vw] space-y-[0.4vw]">
            <div className="text-[0.65vw] font-bold text-gray-400 uppercase">Inspection Result</div>
            <div className="grid grid-cols-2 gap-[0.3vw]">
              {INSPECTION_RESULTS.map(r => (
                <button key={r} type="button" onClick={() => setResult(r)}
                  className={`py-[0.35vw] rounded-[0.3vw] border text-[0.68vw] font-medium cursor-pointer ${result === r ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>{r}</button>
              ))}
            </div>
            <div>
              <div className="text-[0.65vw] font-bold text-gray-400 uppercase mb-[0.25vw]">Components (Comp1 | Comp2)</div>
              <textarea rows="1" value={components} onChange={e => setComponents(e.target.value)} placeholder="e.g. Capacitor | Diode | Sensor"
                className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.7vw] outline-none resize-none bg-white" />
            </div>
            <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Inspection findings, defects observed…"
              className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.7vw] outline-none resize-none bg-white" />
            <button onClick={handleInspected} className="w-full py-[0.42vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.3vw] text-[0.7vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.3vw]">
              <CheckSquare className="w-[0.75vw] h-[0.75vw]" />Submit Inspection
            </button>
          </motion.div>
        )}

        {action === "Rejected" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-red-200 rounded-[0.4vw] bg-red-50/40 p-[0.65vw] space-y-[0.4vw]">
            <div className="text-[0.65vw] font-bold text-gray-400 uppercase">Rejection Reason</div>
            <div className="grid grid-cols-2 gap-[0.3vw]">
              {["Damaged on arrival", "Wrong item received", "Quality not acceptable", "Out of spec"].map(r => (
                <button key={r} type="button" onClick={() => setResult(r)}
                  className={`py-[0.35vw] rounded-[0.3vw] border text-[0.68vw] font-medium cursor-pointer ${result === r ? "bg-red-600 text-white border-red-600" : "bg-white border-gray-200 text-gray-600 hover:border-red-300"}`}>{r}</button>
              ))}
            </div>
            <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Detailed rejection reason…"
              className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.7vw] outline-none resize-none bg-white" />
            <button onClick={handleRejected} className="w-full py-[0.42vw] bg-red-600 hover:bg-red-700 text-white rounded-[0.3vw] text-[0.7vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.3vw]">
              <X className="w-[0.75vw] h-[0.75vw]" />Confirm Rejection
            </button>
          </motion.div>
        )}

        {action === "Support" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-gray-200 rounded-[0.4vw] bg-gray-50 p-[0.65vw] space-y-[0.4vw]">
            <div className="text-[0.65vw] font-bold text-gray-400 uppercase">Select Support Person</div>
            <input value={supportSearch} onChange={e => setSupportSearch(e.target.value)}
              placeholder="Search person / department…"
              className="w-full border border-gray-300 rounded-[0.3vw] px-[0.6vw] py-[0.4vw] text-[0.78vw] outline-none focus:border-gray-500" />
            <div className="border border-gray-200 rounded-[0.3vw] max-h-[8vw] overflow-y-auto divide-y divide-gray-50 bg-white">
              {supportCandidates.map(emp => (
                <div key={emp.userId} onClick={() => setSupportPerson(emp)}
                  className={`flex items-center gap-[0.6vw] px-[0.6vw] py-[0.5vw] cursor-pointer transition-all ${supportPerson?.userId === emp.userId ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-gray-50 border-l-2 border-transparent"}`}>
                  <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-900 flex items-center justify-center text-white text-[0.55vw] font-bold flex-shrink-0">
                    {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-[0.78vw] font-semibold text-gray-800">{emp.name}</div>
                    <div className="text-[0.68vw] text-gray-400">{emp.department}</div>
                  </div>
                  {supportPerson?.userId === emp.userId && <CheckCircle className="w-[0.9vw] h-[0.9vw] text-blue-500 ml-auto" />}
                </div>
              ))}
            </div>
            <textarea rows="2" value={supportNotes} onChange={e => setSupportNotes(e.target.value)} placeholder="Handover notes / what you need help with…"
              className="w-full border border-gray-300 rounded-[0.3vw] p-[0.4vw] text-[0.7vw] outline-none resize-none focus:border-gray-500 bg-white" />
            <button onClick={handleSupport} className="w-full py-[0.42vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.3vw] text-[0.7vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.3vw]">
              <Send className="w-[0.75vw] h-[0.75vw]" />Send Support Request
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Inward Card — Company card with products inside (mirrors ServiceCallResponse) ──
const InwardCard = ({ entry, currentUser, isExpanded, onToggle, onUpdate }) => {
  const [showReport,    setShowReport]    = useState(false);
  const [supportModal,  setSupportModal]  = useState(false);

  const isCritical  = entry.status === "Critical";
  const isEscalated = entry.status === "Escalated";
  const lastHistory = entry.escalationHistory?.[entry.escalationHistory.length - 1];
  const qcCount     = entry.qcActions?.length || 0;
  const prodStatus  = getProductStatus(entry);
  const prodCfg     = PROD_STATUS_CFG[prodStatus];
  const isClosed    = entry._closure?.status === "Closed" || entry.status === "Rejected";

  // Build a fake "products" array from the single inward entry for the product list
  // (In future if multiple products per inward, this maps naturally)
  const products = entry.products?.length
    ? entry.products
    : [{ productDescription: entry.productDescription, serialNumber: entry.serialNumber, qty: entry.qty, warrantyStatus: entry.warrantyStatus, natureOfProblem: entry.natureOfProblem, symptomsObserved: entry.symptomsObserved }];

  return (
    <>
      <div className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all ${
        isCritical   ? "border-red-300 shadow-sm shadow-red-100"
        : isEscalated ? "border-gray-400"
        : isClosed   ? "border-green-300"
        : "border-gray-200"}`}>

        {/* ── Header: Company level ── */}
        <div className="px-[0.9vw] pt-[0.8vw] pb-[0.6vw] cursor-pointer select-none" onClick={onToggle}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-[0.8vw]">
              <div>
                {/* Ref No + priority/status chips */}
                <div className="flex items-center gap-[0.4vw] flex-wrap">
                  <span className="font-mono text-[0.88vw] font-bold text-gray-800">{entry.refNo}</span>
                  {isCritical && (
                    <span className="text-[0.62vw] px-[0.4vw] py-[0.1vw] rounded font-semibold bg-red-50 text-red-600 border border-red-200">CRITICAL</span>
                  )}
                  {isEscalated && !isCritical && (
                    <span className="text-[0.62vw] px-[0.4vw] py-[0.1vw] rounded font-semibold bg-gray-100 text-gray-700 border border-gray-300">Escalated</span>
                  )}
                  {entry.warrantyStatus && (
                    <span className={`text-[0.62vw] px-[0.4vw] py-[0.08vw] rounded font-semibold border ${entry.warrantyStatus === "In Warranty" ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                      {entry.warrantyStatus}
                    </span>
                  )}
                </div>
                {/* Customer / company name */}
                <div className="text-[0.72vw] text-gray-600 mt-[0.15vw] font-medium flex items-center gap-[0.4vw]">
                  <User className="w-[0.72vw] h-[0.72vw] inline text-gray-400" />
                  {entry.customerName}
                  {entry.assignedDepartment && (
                    <span className="text-gray-400">· {entry.assignedDepartment} → {entry.assignedToName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: SLA + expand */}
            <div className="flex items-center gap-[0.5vw] flex-shrink-0">
              {lastHistory?.deadline && <SLATimer deadline={lastHistory.deadline} />}
              {isExpanded ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
            </div>
          </div>
        </div>

        {/* ── Contact info bar (mirrors ServiceCallResponse ContactInfoBar) ── */}
        {isExpanded && (
          <ContactInfoBar entry={entry} />
        )}

        {/* ── Expanded body ── */}
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/60">

            {/* ── Product card(s) inside the company card ── */}
            <div className="p-[0.8vw] space-y-[0.5vw]">
              {products.map((prod, pIdx) => {
                const pStatus = pIdx === 0 ? prodCfg : PROD_STATUS_CFG["open"];
                return (
                  <div key={pIdx} className="rounded-[0.5vw] border p-[0.7vw] bg-white border-gray-200">
                    {/* Product header row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-[0.5vw]">
                        <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-900 flex items-center justify-center text-[0.58vw] font-bold text-white flex-shrink-0">
                          {pIdx + 1}
                        </div>
                        <div>
                          <div className="text-[0.82vw] font-bold text-gray-800">
                            {prod.productDescription || `Product ${pIdx + 1}`}
                          </div>
                          <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                            {prod.serialNumber && <span className="text-[0.63vw] text-gray-400 font-mono">SN: {prod.serialNumber}</span>}
                            {prod.qty && <span className="text-[0.63vw] text-gray-400">Qty: {prod.qty}</span>}
                            {prod.natureOfProblem && <span className="text-[0.63vw] text-gray-500">{prod.natureOfProblem}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-[0.5vw]">
                        {/* Request support per product */}
                        <button onClick={() => setSupportModal(true)}
                          className="flex items-center gap-[0.3vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-[0.65vw] py-[0.28vw] rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer transition-all">
                          <Share2 className="w-[0.75vw] h-[0.75vw]" />Request Support
                        </button>
                        {/* Product status dot */}
                        <span className={`text-[0.62vw] px-[0.4vw] py-[0.1vw] rounded-full border font-bold ${pStatus.cls}`}>
                          {pStatus.label}
                        </span>
                      </div>
                    </div>

                    {/* Symptoms / details */}
                    {(prod.symptomsObserved || entry.symptomsObserved) && (
                      <div className="mt-[0.4vw] bg-slate-50 border border-slate-200 rounded-[0.35vw] p-[0.5vw]">
                        <div className="text-[0.65vw] font-semibold text-gray-500">Symptoms Observed</div>
                        <div className="text-[0.7vw] text-gray-700 mt-[0.1vw]">{prod.symptomsObserved || entry.symptomsObserved}</div>
                      </div>
                    )}

                    {/* QC log strip per product */}
                    {qcCount > 0 && pIdx === 0 && (
                      <div className="mt-[0.4vw] pt-[0.3vw] border-t border-gray-100">
                        <div className="text-[0.6vw] font-bold text-gray-400 uppercase tracking-wider mb-[0.2vw]">QC Log</div>
                        <div className="flex items-center gap-[0.3vw] flex-wrap">
                          {entry.qcActions.map((a, i) => (
                            <span key={i} className={`text-[0.63vw] flex items-center gap-[0.2vw] px-[0.4vw] py-[0.12vw] rounded border font-medium
                              ${a.action === "Received" ? "bg-blue-50 text-blue-700 border-blue-200"
                              : a.action === "Inspected" ? "bg-gray-100 text-gray-700 border-gray-200"
                              : a.action === "Rejected" ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                              {a.action}{a.result && ` · ${a.result}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Escalation trail */}
                    {entry.escalationHistory?.length > 0 && pIdx === 0 && (
                      <div className="mt-[0.45vw] pt-[0.35vw] border-t border-gray-100">
                        <div className="text-[0.6vw] font-bold text-gray-400 uppercase tracking-wider mb-[0.2vw]">Escalation Trail</div>
                        {entry.escalationHistory.map((h, hi) => (
                          <div key={hi} className="flex items-center gap-[0.4vw] text-[0.65vw] py-[0.08vw]">
                            <span className={`px-[0.3vw] rounded text-[0.55vw] font-bold text-white ${hi === 0 ? "bg-blue-500" : hi === 1 ? "bg-gray-500" : "bg-gray-800"}`}>L{hi + 1}</span>
                            <span className="text-gray-600 font-medium">{h.department}</span>
                            <span className="text-gray-400">→ {h.engineerName}</span>
                            <span className="text-gray-300 ml-auto text-[0.6vw]">{new Date(h.assignedAt).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Closure Panel (mirrors ServiceCallResponse's ProductClosurePanel) ── */}
                    {pIdx === 0 && (
                      <ProductClosurePanel entry={entry} onUpdate={onUpdate} hidePending={false} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* View full report button */}
            <div className="px-[0.8vw] pb-[0.8vw]">
              <button onClick={() => setShowReport(true)}
                className="w-full py-[0.5vw] bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-[0.4vw] text-[0.75vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.4vw] transition-all">
                <Eye className="w-[0.85vw] h-[0.85vw]" />View Full Report
              </button>
            </div>
          </div>
        )}
      </div>

      {showReport && <ReportModal entry={entry} onClose={() => setShowReport(false)} />}

      {/* Support request modal (inline in card area) */}
      {supportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[32vw] rounded-[0.8vw] shadow-2xl overflow-hidden">
            <div className="bg-gray-900 px-[1.2vw] py-[0.8vw] flex justify-between items-center">
              <div className="flex items-center gap-[0.6vw]">
                <Share2 className="w-[1.1vw] h-[1.1vw] text-white/80" />
                <h3 className="text-[0.95vw] font-bold text-white">Request Support</h3>
              </div>
              <button onClick={() => setSupportModal(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
            </div>
            <div className="p-[1.2vw]">
              <SupportRequestForm entry={entry} currentUser={currentUser}
                onSubmit={(person, notes) => {
                  const reqs = lsLoad(SMI_SUPPORT_KEY, []);
                  reqs.push({ id: `sr-${Date.now()}`, inwardId: entry.id, refNo: entry.refNo, product: entry.productDescription, requestedById: currentUser?.userId, requestedByName: currentUser?.name, supportPerson: person, notes, status: "Pending", createdAt: new Date().toISOString() });
                  lsSave(SMI_SUPPORT_KEY, reqs);
                  setSupportModal(false);
                }}
                onCancel={() => setSupportModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Pending Tab ───────────────────────────────────────────────────────────────
const PendingTab = ({ entries, currentUser, onUpdate }) => {
  const [expanded, setExpanded] = useState(null);
  const [supportModals, setSupportModals] = useState({});

  const pending = entries.filter(e =>
    (e.assignedTo === currentUser?.userId || e.currentEngineerId === currentUser?.userId) &&
    (e.status === "Pending" || e._closure?.status === "Pending")
  );

  if (pending.length === 0) return (
    <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
      <AlertCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
      <p className="text-[1vw] text-gray-400">No pending entries</p>
    </div>
  );

  return (
    <div className="space-y-[0.8vw]">
      {pending.map(entry => {
        const isExp = expanded === entry.id;
        return (
          <div key={entry.id} className="bg-white rounded-[0.6vw] border border-gray-300 overflow-hidden hover:shadow-md transition-all">
            {/* Header */}
            <div className="px-[0.9vw] pt-[0.8vw] pb-[0.6vw] cursor-pointer" onClick={() => setExpanded(isExp ? null : entry.id)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[2vw] h-[2vw] rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-[1vw] h-[1vw] text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-[0.4vw] flex-wrap">
                      <span className="font-mono text-[0.88vw] font-bold text-gray-800">{entry.refNo}</span>
                      {/* Count label instead of redundant "Pending" badge */}
                      <span className="text-[0.63vw] px-[0.4vw] py-[0.08vw] rounded bg-gray-100 text-gray-600 border border-gray-200 font-semibold">
                        {entry.productDescription || "—"}
                      </span>
                      {entry._closure?.remarks && (
                        <span className="text-[0.62vw] text-gray-400 italic">Note: {entry._closure.remarks.slice(0, 40)}</span>
                      )}
                    </div>
                    <div className="text-[0.72vw] text-gray-500 mt-[0.12vw]">{entry.customerName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  {/* Request Support button in pending list */}
                  <button onClick={e => { e.stopPropagation(); setSupportModals(p => ({ ...p, [entry.id]: true })); }}
                    className="flex items-center gap-[0.3vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-[0.65vw] py-[0.28vw] rounded-[0.35vw] text-[0.7vw] font-semibold cursor-pointer transition-all">
                    <Share2 className="w-[0.75vw] h-[0.75vw]" />Request Support
                  </button>
                  {isExp ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
                </div>
              </div>
            </div>

            {isExp && (
              <div className="border-t border-gray-100 bg-gray-50/20 p-[0.9vw] space-y-[0.5vw]">
                <ContactInfoBar entry={entry} />
                <div className="rounded-[0.4vw] border border-gray-200 bg-white p-[0.55vw]">
                  <div className="text-[0.75vw] font-bold text-gray-700 mb-[0.1vw]">{entry.productDescription}</div>
                  {entry.serialNumber && <div className="text-[0.65vw] text-gray-400 font-mono">SN: {entry.serialNumber}</div>}
                  {entry._closure?.remarks && (
                    <div className="mt-[0.3vw] text-[0.67vw] text-gray-600 bg-gray-50 border border-gray-100 rounded-[0.3vw] px-[0.45vw] py-[0.18vw]">
                      <strong>Note:</strong> {entry._closure.remarks}
                    </div>
                  )}
                  {/* Closure panel with hidePending=true so only Close action shows */}
                  <ProductClosurePanel entry={entry} onUpdate={u => onUpdate(entry.id, u)} hidePending={true} />
                </div>
              </div>
            )}

            {/* Support modal for pending item */}
            {supportModals[entry.id] && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white w-[34vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                  <div className="bg-gray-900 px-[1.2vw] py-[0.8vw] flex justify-between items-center">
                    <h3 className="text-[0.95vw] font-bold text-white">Request Support — {entry.refNo}</h3>
                    <button onClick={() => setSupportModals(p => ({ ...p, [entry.id]: false }))} className="text-white/60 hover:text-white cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
                  </div>
                  <div className="p-[1.2vw] overflow-y-auto flex-1">
                    <SupportRequestForm entry={entry} currentUser={currentUser}
                      onSubmit={(person, notes) => {
                        const reqs = lsLoad(SMI_SUPPORT_KEY, []);
                        reqs.push({ id: `sr-${Date.now()}`, inwardId: entry.id, refNo: entry.refNo, product: entry.productDescription, requestedById: currentUser?.userId, requestedByName: currentUser?.name, supportPerson: person, notes, status: "Pending", createdAt: new Date().toISOString() });
                        lsSave(SMI_SUPPORT_KEY, reqs);
                        setSupportModals(p => ({ ...p, [entry.id]: false }));
                      }}
                      onCancel={() => setSupportModals(p => ({ ...p, [entry.id]: false }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Standalone Support Request Form ───────────────────────────────────────────
const SupportRequestForm = ({ entry, currentUser, onSubmit, onCancel }) => {
  const [search, setSearch]   = useState("");
  const [person, setPerson]   = useState(null);
  const [notes,  setNotes]    = useState("");
  const employees = lsLoad(EMPLOYEES_KEY, []);
  const candidates = employees.filter(e =>
    e.userId !== currentUser?.userId &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.department?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-[0.8vw]">
      <div className="bg-gray-50 border border-gray-200 rounded-[0.5vw] p-[0.6vw] text-[0.75vw]">
        <div className="font-bold text-gray-700">{entry.productDescription}</div>
        {entry.serialNumber && <div className="text-gray-400 font-mono text-[0.68vw]">SN: {entry.serialNumber}</div>}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search person / department…"
        className="w-full border border-gray-300 rounded-[0.4vw] px-[0.8vw] py-[0.45vw] text-[0.8vw] outline-none focus:border-gray-500" />
      <div className="border border-gray-200 rounded-[0.4vw] max-h-[10vw] overflow-y-auto divide-y divide-gray-50 bg-white">
        {candidates.map(emp => (
          <div key={emp.userId} onClick={() => setPerson(emp)}
            className={`flex items-center gap-[0.6vw] px-[0.8vw] py-[0.5vw] cursor-pointer transition-all ${person?.userId === emp.userId ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-gray-50 border-l-2 border-transparent"}`}>
            <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-900 flex items-center justify-center text-white text-[0.55vw] font-bold flex-shrink-0">
              {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[0.78vw] font-semibold text-gray-800">{emp.name}</div>
              <div className="text-[0.68vw] text-gray-400">{emp.department}</div>
            </div>
            {person?.userId === emp.userId && <CheckCircle className="w-[0.9vw] h-[0.9vw] text-blue-500 ml-auto" />}
          </div>
        ))}
      </div>
      <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Handover notes / what you need help with…"
        className="w-full border border-gray-300 rounded-[0.4vw] p-[0.6vw] text-[0.8vw] outline-none resize-none focus:border-gray-500" />
      <div className="flex justify-end gap-[0.5vw]">
        <button onClick={onCancel} className="px-[1vw] py-[0.45vw] border border-gray-300 bg-white rounded-[0.4vw] text-[0.8vw] font-medium cursor-pointer hover:bg-gray-50 text-gray-600">Cancel</button>
        <button onClick={() => {
          if (!person) { alert("Select a person."); return; }
          if (!notes.trim()) { alert("Add handover notes."); return; }
          onSubmit(person, notes);
        }} className="px-[1vw] py-[0.45vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.4vw] text-[0.8vw] font-semibold cursor-pointer flex items-center gap-[0.35vw]">
          <Send className="w-[0.85vw] h-[0.85vw]" />Send Request
        </button>
      </div>
    </div>
  );
};

// ── Support Requests Tab ──────────────────────────────────────────────────────
const SupportTab = ({ currentUser }) => {
  const [reqs, setReqs]   = useState([]);
  const [subTab, setSubTab] = useState("assigned");
  const reload = () => setReqs(lsLoad(SMI_SUPPORT_KEY, []));
  useEffect(() => { reload(); const iv = setInterval(reload, 2000); return () => clearInterval(iv); }, []);

  const assignedToMe = reqs.filter(r => r.supportPerson?.userId === currentUser?.userId);
  const pendingMe    = assignedToMe.filter(r => r.status === "Pending");
  const raisedByMe   = reqs.filter(r => r.requestedById === currentUser?.userId);

  const resolveReq = (id) => {
    const updated = reqs.map(r => r.id === id ? { ...r, status: "Resolved", resolvedAt: new Date().toISOString() } : r);
    lsSave(SMI_SUPPORT_KEY, updated); setReqs(updated);
  };

  const subTabs = [
    { id: "assigned", label: "Request Assigned", icon: HelpCircle, count: assignedToMe.length, activeCount: pendingMe.length },
    { id: "pending",  label: "Request Pending",  icon: AlertCircle, count: pendingMe.length,    activeCount: pendingMe.length },
    { id: "raised",   label: "Request Raised",   icon: Send,         count: raisedByMe.length,   activeCount: raisedByMe.filter(r => r.status === "Pending").length },
  ];

  const getList = () => {
    if (subTab === "assigned") return assignedToMe;
    if (subTab === "pending")  return pendingMe;
    return raisedByMe;
  };
  const list = getList();
  const isAssigned = subTab === "assigned" || subTab === "pending";

  return (
    <div className="mt-[0.5vw]">
      <div className="flex gap-[0.3vw] mb-[0.8vw] bg-white border border-gray-200 rounded-[0.5vw] p-[0.25vw]">
        {subTabs.map(({ id, label, icon: Icon, count, activeCount }) => {
          const isAct = subTab === id;
          const activeBg = id === "raised" ? "bg-blue-600" : id === "pending" ? "bg-gray-700" : "bg-gray-900";
          const badgeCls = isAct
            ? `bg-white ${id === "raised" ? "text-blue-600" : id === "pending" ? "text-gray-700" : "text-gray-900"}`
            : activeCount > 0 ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-500";
          return (
            <button key={id} onClick={() => setSubTab(id)}
              className={`flex-1 flex items-center justify-center gap-[0.35vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${isAct ? `${activeBg} text-white shadow-sm` : "text-gray-500 hover:bg-gray-50"}`}>
              <Icon className="w-[0.85vw] h-[0.85vw]" />{label}
              {count > 0 && <span className={`text-[0.62vw] px-[0.4vw] rounded-full font-bold ${badgeCls}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
          <HelpCircle className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
          <p className="text-[1vw] text-gray-400">{isAssigned ? "No support requests assigned to you" : "No requests raised"}</p>
        </div>
      ) : (
        <div className="space-y-[0.7vw]">
          {list.map(req => {
            const isDone = req.status === "Resolved";
            return (
              <div key={req.id} className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-sm transition-all ${isDone ? "border-green-300" : isAssigned ? "border-gray-300" : "border-blue-200"}`}>
                <div className="p-[0.9vw]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[0.6vw]">
                      <div className={`w-[1.8vw] h-[1.8vw] rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? "bg-green-500" : isAssigned ? "bg-gray-900" : "bg-blue-600"}`}>
                        {isDone ? <CheckCircle className="w-[1vw] h-[1vw] text-white" /> : <HelpCircle className="w-[1vw] h-[1vw] text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-[0.4vw] flex-wrap">
                          <span className="font-mono text-[0.85vw] font-bold text-gray-800">{req.refNo}</span>
                          {isDone && <Badge label="Resolved" color="green" />}
                        </div>
                        <div className="text-[0.72vw] text-gray-500 mt-[0.1vw]">
                          {isAssigned
                            ? <>From: <strong>{req.requestedByName}</strong></>
                            : <>To: <strong>{req.supportPerson?.name}</strong></>}
                          {req.product && ` · ${req.product}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-[0.5vw]">
                      <span className="text-[0.68vw] text-gray-400">{new Date(req.createdAt).toLocaleString()}</span>
                      {isAssigned && !isDone && (
                        <button onClick={() => resolveReq(req.id)}
                          className="px-[0.8vw] py-[0.35vw] bg-green-600 hover:bg-green-700 text-white rounded-[0.3vw] text-[0.7vw] font-semibold cursor-pointer flex items-center gap-[0.28vw]">
                          <CheckCircle className="w-[0.72vw] h-[0.72vw]" />Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                  {req.notes && (
                    <div className={`mt-[0.5vw] text-[0.72vw] rounded-[0.35vw] p-[0.5vw] border ${isAssigned ? "bg-gray-50 border-gray-200 text-gray-700" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
                      <span className="font-semibold">Notes: </span>{req.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Reports Tab ───────────────────────────────────────────────────────────────
const ReportsTab = ({ entries, currentUser }) => {
  const [detailRec, setDetailRec] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const myRecords = useMemo(() => {
    const uid = currentUser?.userId;
    return entries.filter(e =>
      e.assignedTo === uid || e.currentEngineerId === uid ||
      e.escalationHistory?.some(h => h.engineerId === uid) ||
      e.qcActions?.some(a => a.byId === uid)
    );
  }, [entries, currentUser]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return myRecords.filter(e => {
      const matchSearch = !s || e.refNo?.toLowerCase().includes(s) || e.customerName?.toLowerCase().includes(s) || e.productDescription?.toLowerCase().includes(s);
      const matchStatus = statusFilter === "All" || e.status === statusFilter || (statusFilter === "Closed" && e._closure?.status === "Closed");
      return matchSearch && matchStatus;
    });
  }, [myRecords, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = {};
    myRecords.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [myRecords]);

  if (myRecords.length === 0) return (
    <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200 mt-[1vw]">
      <BarChart2 className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
      <p className="text-[1vw] text-gray-400">No records found</p>
    </div>
  );

  return (
    <div className="space-y-[0.8vw] mt-[0.5vw]">
      <div className="relative">
        <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by ref, customer, product…"
          className="w-full pl-[2.5vw] pr-[1vw] py-[0.55vw] border border-gray-300 rounded-[0.5vw] text-[0.78vw] outline-none focus:border-gray-500 bg-white" />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-[0.3vw] flex-wrap">
        {["All", ...Object.keys(statusCounts)].map(s => {
          const count = s === "All" ? myRecords.length : statusCounts[s] || 0;
          const isAct = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-[0.75vw] py-[0.28vw] rounded-full border text-[0.72vw] font-semibold cursor-pointer transition-all ${isAct ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>
              {s} <span className={`text-[0.62vw] font-bold ${isAct ? "text-gray-300" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[0.5vw] border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-[0.75vw]">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {["Ref No", "Date", "Customer", "Product", "Nature", "Warranty", "Status", "QC", ""].map(h => (
                <th key={h} className="p-[0.6vw] font-semibold text-gray-700 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-[3vw] text-center text-gray-400">No records match</td></tr>
            ) : filtered.map(e => {
              const clsCfg = PROD_STATUS_CFG[getProductStatus(e)];
              return (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-[0.6vw] border-r border-gray-200 font-mono text-blue-600 font-bold">{e.refNo}</td>
                  <td className="p-[0.6vw] border-r border-gray-200 text-gray-500 whitespace-nowrap">{e.timestamp ? new Date(e.timestamp).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="p-[0.6vw] border-r border-gray-200 font-medium text-gray-800 max-w-[8vw] truncate">{e.customerName}</td>
                  <td className="p-[0.6vw] border-r border-gray-200 text-gray-600 max-w-[10vw] truncate">{e.productDescription || "—"}</td>
                  <td className="p-[0.6vw] border-r border-gray-200 text-gray-600">{e.natureOfProblem || "—"}</td>
                  <td className="p-[0.6vw] border-r border-gray-200">
                    <span className={`text-[0.65vw] px-[0.35vw] py-[0.08vw] rounded font-semibold ${e.warrantyStatus === "In Warranty" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{e.warrantyStatus}</span>
                  </td>
                  <td className="p-[0.6vw] border-r border-gray-200">
                    <span className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded-full border font-semibold ${clsCfg.cls}`}>{clsCfg.label}</span>
                  </td>
                  <td className="p-[0.6vw] border-r border-gray-200 text-center text-gray-500">{e.qcActions?.length || 0}</td>
                  <td className="p-[0.6vw] text-center">
                    <button onClick={() => setDetailRec(e)}
                      className="p-[0.3vw] text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-[0.3vw] cursor-pointer transition-colors">
                      <Eye className="w-[0.9vw] h-[0.9vw]" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="bg-gray-50 border-t border-gray-200 px-[0.8vw] py-[0.4vw]">
          <span className="text-[0.7vw] text-gray-500">Showing <strong>{filtered.length}</strong> of <strong>{myRecords.length}</strong></span>
        </div>
      </div>

      {detailRec && <ReportModal entry={detailRec} onClose={() => setDetailRec(null)} />}
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────
export default function ServiceMaterialInwardResponse({ currentUser: propUser }) {
  const [entries,     setEntries]    = useState([]);
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [activeTab,   setActiveTab]   = useState("assigned");
  const [expanded,    setExpanded]    = useState(null);

  useAutoEscalate();

  useEffect(() => { if (propUser) setCurrentUser(propUser); }, [propUser]);

  useEffect(() => {
    if (propUser) return;
    const KEYS = ["loggedInUser", "currentUser", "user", "akira_user", "auth_user"];
    for (const k of KEYS) {
      const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.userId || parsed?.id) { setCurrentUser(parsed); return; }
        } catch {}
      }
    }
  }, [propUser]);

  const reload = () => setEntries(lsLoad(INWARD_KEY, []));
  useEffect(() => { reload(); const iv = setInterval(reload, 2000); return () => clearInterval(iv); }, []);

  const uid = currentUser?.userId || currentUser?.id;

  const matchesMe = (e) => {
    if (!currentUser) return false;
    const ids   = [uid, currentUser?.id, currentUser?.employeeId].filter(Boolean);
    const names = [currentUser?.name, currentUser?.displayName, currentUser?.fullName].filter(Boolean);
    return ids.some(i => e.assignedTo === i || e.currentEngineerId === i) || names.some(n => e.assignedToName === n);
  };

  const myEntries = useMemo(() =>
    entries.filter(e => matchesMe(e) && e._closure?.status !== "Pending" && e.status !== "Pending"),
    [entries, currentUser]
  );

  const pendingEntries = useMemo(() =>
    entries.filter(e => matchesMe(e) && (e.status === "Pending" || e._closure?.status === "Pending")),
    [entries, currentUser]
  );

  const supportAssigned = useMemo(() =>
    lsLoad(SMI_SUPPORT_KEY, []).filter(r => r.supportPerson?.userId === uid && r.status === "Pending"),
    [entries]
  );

  const updateEntry = (id, updates) => {
    const all     = lsLoad(INWARD_KEY, []);
    const updated = all.map(e => e.id === id ? { ...e, ...updates } : e);
    lsSave(INWARD_KEY, updated);
    setEntries(updated);
  };

  const TABS = [
    { id: "assigned", label: "My Inwards",      icon: Package,     color: "black", count: myEntries.length      },
    { id: "pending",  label: "Pending",          icon: AlertCircle, color: "dark",  count: pendingEntries.length },
    { id: "support",  label: "Support Requests", icon: HelpCircle,  color: "blue",  count: supportAssigned.length },
    { id: "reports",  label: "Reports",          icon: BarChart2,   color: "gray",  count: 0                     },
  ];

  const getTabActive = (color) => {
    if (color === "blue") return "bg-blue-600 text-white shadow-sm";
    if (color === "dark") return "bg-gray-700 text-white shadow-sm";
    if (color === "gray") return "bg-gray-500 text-white shadow-sm";
    return "bg-gray-900 text-white shadow-sm";
  };
  const getBadgeActive = (color) => {
    if (color === "blue") return "bg-white text-blue-600";
    if (color === "dark") return "bg-white text-gray-700";
    if (color === "gray") return "bg-white text-gray-500";
    return "bg-white text-gray-900";
  };

  return (
    <div className="w-full font-sans text-[0.85vw]">
      {/* Tab bar — same pattern as ServiceCallResponse */}
      <div className="flex gap-[0.3vw] mb-[0.9vw] bg-white border border-gray-200 rounded-[0.6vw] p-[0.3vw] shadow-sm sticky top-0 z-10">
        {TABS.map(({ id, label, icon: Icon, color, count }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-[0.4vw] px-[0.9vw] py-[0.5vw] rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer transition-all ${activeTab === id ? getTabActive(color) : "text-gray-600 hover:bg-gray-100"}`}>
            <Icon className="w-[0.88vw] h-[0.88vw]" />{label}
            {count > 0 && (
              <span className={`text-[0.6vw] px-[0.4vw] py-[0.04vw] rounded-full font-bold ${activeTab === id ? getBadgeActive(color) : "bg-gray-200 text-gray-600"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-h-[82vh] overflow-y-auto pr-[0.3vw]">
        <AnimatePresence mode="wait">
          {activeTab === "assigned" && (
            <motion.div key="assigned" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {myEntries.length === 0 ? (
                <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
                  <Package className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
                  <p className="text-[1vw] text-gray-400 font-medium">No inward entries assigned to you</p>
                  <p className="text-[0.8vw] text-gray-300 mt-[0.3vw]">Inward entries assigned to you will appear here</p>
                </div>
              ) : (
                <div className="space-y-[0.8vw]">
                  {myEntries.map(e => (
                    <InwardCard key={e.id} entry={e} currentUser={currentUser}
                      isExpanded={expanded === e.id}
                      onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                      onUpdate={updates => updateEntry(e.id, updates)} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PendingTab entries={entries} currentUser={currentUser} onUpdate={updateEntry} />
            </motion.div>
          )}

          {activeTab === "support" && (
            <motion.div key="support" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <SupportTab currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === "reports" && (
            <motion.div key="reports" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ReportsTab entries={entries} currentUser={currentUser} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}