import React, { useState, useEffect, useMemo } from "react";
import {
  Package, User, CheckCircle, AlertCircle, Eye, X,
  ChevronDown, ChevronUp, BarChart2, Phone, Mail,
  MapPin, ClipboardList, History, Search, Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Storage ───────────────────────────────────────────────────────────────────
const PMI_KEY = "production_material_inward_v1";

// ── Helpers ───────────────────────────────────────────────────────────────────
const lsLoad = (key, fb = []) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));

const getCurrentUser = () => {
  for (const k of ["loggedInUser", "currentUser", "user", "akira_user"]) {
    for (const s of [sessionStorage, localStorage]) {
      try { const v = s.getItem(k); if (v) { const p = JSON.parse(v); if (p?.userId || p?.id || p?.name) return p; } } catch {}
    }
  }
  return null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Open:             "bg-blue-100 text-blue-700 border-blue-300",
  Assigned:         "bg-blue-100 text-blue-700 border-blue-300",
  "In Progress":    "bg-blue-100 text-blue-700 border-blue-300",
  Pending:          "bg-gray-100 text-gray-600 border-gray-300",
  "Rework Ongoing": "bg-gray-100 text-gray-700 border-gray-300",
  Closed:           "bg-green-100 text-green-700 border-green-300",
};

const DEFECT_OPTIONS  = ["Dimensional Non-conformance", "Surface Defect", "Functional Failure", "Material Defect", "Assembly Error", "Other"];
const RESOLUTION_OPTS = ["Fixed", "Reworked", "Replaced", "No Fault Found", "Scrapped", "Returned to Supplier"];

// ── Avatar ────────────────────────────────────────────────────────────────────
const inits = (n = "") => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
const MiniAvatar = ({ name }) => (
  <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-gray-800 flex items-center justify-center text-white text-[0.52vw] font-bold flex-shrink-0">
    {inits(name)}
  </div>
);

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`text-[0.65vw] px-[0.45vw] py-[0.1vw] rounded-full border font-semibold whitespace-nowrap ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
    {status}
  </span>
);

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
  const mins  = Math.ceil(remaining / 60000);
  const cls   = remaining < 0 ? "bg-red-100 text-red-600 animate-pulse" : mins < 120 ? "bg-gray-100 text-gray-700" : "bg-blue-50 text-blue-600";
  const label = remaining < 0 ? "SLA Breached" : mins < 60 ? `${mins}m left` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return (
    <div className={`flex items-center gap-[0.25vw] px-[0.45vw] py-[0.18vw] rounded-[0.3vw] font-mono text-[0.65vw] font-bold ${cls}`}>
      <Clock className="w-[0.65vw] h-[0.65vw]" />{label}
    </div>
  );
};

// ── Contact Info Bar ──────────────────────────────────────────────────────────
const ContactInfoBar = ({ entry }) => {
  const hasAny = entry?.contactPerson || entry?.contactNumber || entry?.emailId || entry?.location;
  if (!hasAny) return null;
  return (
    <div className="mx-[0.9vw] mb-[0.6vw] bg-slate-50 border border-slate-200 rounded-[0.4vw] px-[0.8vw] py-[0.45vw] flex items-center gap-[1.2vw] flex-wrap">
      <span className="text-[0.6vw] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Contact</span>
      {entry.contactPerson && (
        <div className="flex items-center gap-[0.3vw] text-[0.72vw] text-slate-700">
          <User className="w-[0.72vw] h-[0.72vw] text-slate-400" /><span className="font-semibold">{entry.contactPerson}</span>
        </div>
      )}
      {entry.contactNumber && (
        <div className="flex items-center gap-[0.3vw] text-[0.72vw] text-slate-700">
          <Phone className="w-[0.7vw] h-[0.7vw] text-slate-400" /><span>{entry.contactNumber}</span>
        </div>
      )}
      {entry.emailId && (
        <div className="flex items-center gap-[0.3vw] text-[0.72vw] text-slate-700">
          <Mail className="w-[0.7vw] h-[0.7vw] text-slate-400" /><span>{entry.emailId}</span>
        </div>
      )}
      {entry.location && (
        <div className="flex items-center gap-[0.3vw] text-[0.72vw] text-slate-700">
          <MapPin className="w-[0.7vw] h-[0.7vw] text-slate-400" /><span>{entry.location}</span>
        </div>
      )}
    </div>
  );
};

// ── Report Modal ──────────────────────────────────────────────────────────────
const ReportModal = ({ entry, onClose }) => {
  const dispStatus = entry._closure?.status === "Closed" ? "Closed"
    : (entry._closure?.status === "Pending" || entry.status === "Pending" || entry.status === "Rework Ongoing") ? "Pending"
    : entry.status;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        className="bg-white w-[56vw] max-h-[88vh] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gray-900 px-[1.5vw] py-[1vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <ClipboardList className="w-[1.2vw] h-[1.2vw] text-white" />
            <div>
              <h3 className="text-[1vw] font-bold text-white">{entry.refNo}</h3>
              <p className="text-[0.72vw] text-gray-400">{entry.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-[0.7vw]">
            <StatusBadge status={dispStatus} />
            <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer"><X className="w-[1.1vw] h-[1.1vw]" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-[1.5vw] space-y-[0.9vw]">
          <div className="grid grid-cols-2 gap-[0.6vw] bg-gray-50 border border-gray-200 rounded-[0.5vw] p-[0.9vw] text-[0.75vw]">
            <div><span className="text-gray-400">Customer: </span><strong>{entry.customerName}</strong></div>
            <div><span className="text-gray-400">Code: </span><span className="font-mono">{entry.customerCode}</span></div>
            <div><span className="text-gray-400">Product: </span><strong>{entry.productDescription}</strong></div>
            <div><span className="text-gray-400">Product Code: </span><span className="font-mono">{entry.productCode}</span></div>
            <div><span className="text-gray-400">Batch No: </span><strong>{entry.batchNo || "—"}</strong></div>
            <div><span className="text-gray-400">Quantity: </span><strong>{entry.quantity} {entry.unit}</strong></div>
            <div><span className="text-gray-400">Assigned To: </span><strong>{entry.assignedTo || "—"} {entry.assignedDept ? `(${entry.assignedDept})` : ""}</strong></div>
            <div><span className="text-gray-400">Registered: </span><strong>{entry.dateTime}</strong></div>
          </div>
          {(entry.defectNature || entry.symptoms || entry.rootCause || entry.batchDetails) && (
            <div className="bg-gray-50 border border-gray-200 rounded-[0.5vw] p-[0.9vw] text-[0.75vw] space-y-[0.4vw]">
              <div className="text-[0.68vw] font-bold text-gray-500 uppercase mb-[0.3vw]">Defect Details</div>
              {entry.defectNature  && <div><span className="text-gray-400">Nature: </span><strong>{entry.defectNature}</strong></div>}
              {entry.batchDetails  && <div><span className="text-gray-400">Batch Details: </span>{entry.batchDetails}</div>}
              {entry.symptoms      && <div><span className="text-gray-400">Symptoms: </span>{entry.symptoms}</div>}
              {entry.rootCause     && <div><span className="text-gray-400">Root Cause: </span>{entry.rootCause}</div>}
            </div>
          )}
          {(entry.inspectionFindings || entry.actionsTaken || entry.correctiveActions || entry.preventiveMeasures) && (
            <div className="bg-blue-50 border border-blue-200 rounded-[0.5vw] p-[0.9vw] text-[0.75vw] space-y-[0.4vw]">
              <div className="text-[0.68vw] font-bold text-blue-600 uppercase mb-[0.3vw]">Inspection & Rectification</div>
              {entry.inspectionFindings  && <div><span className="text-gray-400">Findings: </span>{entry.inspectionFindings}</div>}
              {entry.actionsTaken        && <div><span className="text-gray-400">Actions: </span>{entry.actionsTaken}</div>}
              {entry.correctiveActions   && <div><span className="text-gray-400">Corrective: </span>{entry.correctiveActions}</div>}
              {entry.preventiveMeasures  && <div><span className="text-gray-400">Preventive: </span>{entry.preventiveMeasures}</div>}
            </div>
          )}
          {dispStatus === "Closed" && (
            <div className="bg-green-50 border border-green-200 rounded-[0.5vw] p-[0.9vw] text-[0.75vw] space-y-[0.3vw]">
              <div className="text-[0.68vw] font-bold text-green-600 uppercase mb-[0.3vw]">Closure</div>
              {entry._closure?.resolutionType && <div><span className="text-gray-400">Resolution: </span><strong>{entry._closure.resolutionType}</strong></div>}
              {entry.finalOutcome             && <div><span className="text-gray-400">Outcome: </span>{entry.finalOutcome}</div>}
              {entry._closure?.remarks        && <div><span className="text-gray-400">Remarks: </span>{entry._closure.remarks}</div>}
              {entry._closure?.closedAt       && <div><span className="text-gray-400">Closed: </span>{new Date(entry._closure.closedAt).toLocaleString()}</div>}
            </div>
          )}
          {entry.history?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-[0.5vw] overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-[0.8vw] py-[0.5vw] flex items-center gap-[0.4vw]">
                <History className="w-[0.9vw] h-[0.9vw] text-gray-500" />
                <span className="text-[0.78vw] font-bold text-gray-700">History</span>
              </div>
              <div className="divide-y divide-gray-100 max-h-[15vw] overflow-y-auto">
                {[...entry.history].reverse().map((h, i) => (
                  <div key={i} className="flex items-start gap-[0.5vw] px-[0.8vw] py-[0.5vw]">
                    <MiniAvatar name={h.by} />
                    <div className="flex-1">
                      <div className="flex items-center gap-[0.4vw]">
                        <StatusBadge status={h.status} />
                        <span className="text-[0.63vw] text-gray-400">{new Date(h.at).toLocaleString()} · {h.by}</span>
                      </div>
                      {h.note && <p className="text-[0.7vw] text-gray-600 mt-[0.1vw]">{h.note}</p>}
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
};

// ── Product Closure Panel ─────────────────────────────────────────────────────
// Pending → just remarks → moves to Pending tab
// Close   → inspection fields + resolution → saves to Closed
const ProductClosurePanel = ({ entry, currentUser, onUpdate, hidePending = false }) => {
  const existing = entry._closure || {};
  const saved    = existing.status;

  const [selected,       setSelected]       = useState(saved || "");
  const [pendingRemarks, setPendingRemarks] = useState(existing.pendingRemarks || "");

  // Close fields
  const [defectNature,       setDefectNature]       = useState(entry.defectNature       || "");
  const [rootCause,          setRootCause]          = useState(entry.rootCause          || "");
  const [inspectionFindings, setInspectionFindings] = useState(entry.inspectionFindings || "");
  const [actionsTaken,       setActionsTaken]       = useState(entry.actionsTaken       || "");
  const [correctiveActions,  setCorrectiveActions]  = useState(entry.correctiveActions  || "");
  const [preventiveMeasures, setPreventiveMeasures] = useState(entry.preventiveMeasures || "");
  const [resolutionType,     setResolutionType]     = useState(existing.resolutionType  || "Fixed");
  const [finalOutcome,       setFinalOutcome]       = useState(entry.finalOutcome       || "");
  const [closureRemarks,     setClosureRemarks]     = useState(existing.remarks         || "");

  const resetPanel = () => setSelected("");

  // Already closed
  if (saved === "Closed")
    return (
      <div className="mt-[0.45vw] bg-green-50 border border-green-200 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] flex items-center gap-[0.4vw]">
        <CheckCircle className="w-[0.8vw] h-[0.8vw] text-green-500 flex-shrink-0" />
        <span className="text-[0.7vw] font-bold text-green-700">Closed · {existing.resolutionType || "Resolved"}</span>
        {existing.remarks && <span className="text-[0.63vw] text-green-500 truncate">— {existing.remarks}</span>}
      </div>
    );

  // Already pending — show pill + allow closing
  if (saved === "Pending" && !hidePending)
    return (
      <>
        <div className="mt-[0.45vw] bg-gray-50 border border-gray-200 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] flex items-center gap-[0.4vw]">
          <AlertCircle className="w-[0.8vw] h-[0.8vw] text-gray-500 flex-shrink-0" />
          <span className="text-[0.7vw] font-bold text-gray-600">Pending</span>
          {existing.pendingRemarks && <span className="text-[0.63vw] text-gray-400 truncate">— {existing.pendingRemarks}</span>}
          <button onClick={() => setSelected(selected === "Closed" ? "" : "Closed")}
            className="ml-auto flex items-center gap-[0.25vw] px-[0.55vw] py-[0.2vw] bg-gray-900 text-white rounded-[0.3vw] text-[0.65vw] font-semibold cursor-pointer hover:bg-gray-800">
            <CheckCircle className="w-[0.65vw] h-[0.65vw]" />Close
          </button>
        </div>
        {/* Close panel rendered below the pill */}
        {selected === "Closed" && <ClosureSubPanel {...{ defectNature, setDefectNature, rootCause, setRootCause, inspectionFindings, setInspectionFindings, actionsTaken, setActionsTaken, correctiveActions, setCorrectiveActions, preventiveMeasures, setPreventiveMeasures, resolutionType, setResolutionType, finalOutcome, setFinalOutcome, closureRemarks, setClosureRemarks, resetPanel, entry, currentUser, onUpdate }} />}
      </>
    );

  // Normal action buttons
  const actionTabs = [
    { key: "Closed",  label: "Close",   icon: CheckCircle },
    ...(!hidePending ? [{ key: "Pending", label: "Pending", icon: AlertCircle }] : []),
  ];

  return (
    <>
      <div className="mt-[0.5vw] flex items-center gap-[0.35vw]">
        <span className="text-[0.6vw] text-gray-400 font-semibold uppercase tracking-wider mr-[0.1vw]">Action:</span>
        {actionTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setSelected(selected === key ? "" : key)}
            className={`flex items-center gap-[0.25vw] px-[0.65vw] py-[0.3vw] rounded-[0.35vw] border text-[0.7vw] font-semibold cursor-pointer transition-all
              ${selected === key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-400"}`}>
            <Icon className="w-[0.72vw] h-[0.72vw]" />{label}
          </button>
        ))}
      </div>

      {/* Pending sub-panel */}
      {selected === "Pending" && !hidePending && (
        <div className="mt-[0.4vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.55vw] space-y-[0.35vw]">
          <div className="flex items-center justify-between">
            <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider">Pending Reason</div>
            <button onClick={resetPanel} className="flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-full hover:bg-gray-200 text-gray-400 cursor-pointer"><X className="w-[0.7vw] h-[0.7vw]" /></button>
          </div>
          <textarea rows={2} value={pendingRemarks} onChange={e => setPendingRemarks(e.target.value)}
            placeholder="Reason for pending / awaiting parts or information…"
            className="w-full border border-gray-200 rounded-[0.3vw] p-[0.4vw] text-[0.68vw] outline-none resize-none focus:border-gray-400 bg-white" />
          <div className="flex justify-end gap-[0.3vw]">
            <button onClick={resetPanel} className="px-[0.7vw] py-[0.32vw] bg-white border border-gray-200 text-gray-600 rounded-[0.35vw] text-[0.68vw] font-semibold cursor-pointer hover:bg-gray-50">Cancel</button>
            <button onClick={() => {
              const now = new Date().toISOString();
              onUpdate({
                status: "Pending",
                _closure: { status: "Pending", pendingRemarks, pendingAt: now },
                history: [...(entry.history || []), { status: "Pending", note: pendingRemarks || "Marked pending", by: currentUser?.name || "Unknown", at: now }],
                updatedAt: now,
              });
            }} className="flex items-center gap-[0.25vw] px-[0.8vw] py-[0.32vw] bg-gray-700 hover:bg-gray-800 text-white rounded-[0.35vw] text-[0.68vw] font-semibold cursor-pointer">
              <AlertCircle className="w-[0.65vw] h-[0.65vw]" />Mark Pending
            </button>
          </div>
        </div>
      )}

      {/* Close sub-panel */}
      {selected === "Closed" && (
        <ClosureSubPanel {...{ defectNature, setDefectNature, rootCause, setRootCause, inspectionFindings, setInspectionFindings, actionsTaken, setActionsTaken, correctiveActions, setCorrectiveActions, preventiveMeasures, setPreventiveMeasures, resolutionType, setResolutionType, finalOutcome, setFinalOutcome, closureRemarks, setClosureRemarks, resetPanel, entry, currentUser, onUpdate }} />
      )}
    </>
  );
};

// ── Closure Sub-panel (extracted to avoid repetition) ────────────────────────
const ClosureSubPanel = ({
  defectNature, setDefectNature, rootCause, setRootCause,
  inspectionFindings, setInspectionFindings, actionsTaken, setActionsTaken,
  correctiveActions, setCorrectiveActions, preventiveMeasures, setPreventiveMeasures,
  resolutionType, setResolutionType, finalOutcome, setFinalOutcome,
  closureRemarks, setClosureRemarks, resetPanel, entry, currentUser, onUpdate,
}) => (
  <div className="mt-[0.4vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] p-[0.6vw] space-y-[0.45vw]">
    <div className="flex items-center justify-between">
      <div className="text-[0.62vw] font-bold text-gray-400 uppercase tracking-wider">Inspection Details & Closure</div>
      <button onClick={resetPanel} className="flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-full hover:bg-gray-200 text-gray-400 cursor-pointer"><X className="w-[0.7vw] h-[0.7vw]" /></button>
    </div>

    {/* Defect Nature */}
    <div>
      <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.22vw]">Nature of Defect</div>
      <div className="grid grid-cols-3 gap-[0.25vw]">
        {DEFECT_OPTIONS.map(d => (
          <button key={d} type="button" onClick={() => setDefectNature(d)}
            className={`py-[0.28vw] px-[0.35vw] rounded-[0.28vw] border text-[0.62vw] font-medium cursor-pointer text-left transition-all
              ${defectNature === d ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>{d}</button>
        ))}
      </div>
    </div>

    {/* Root Cause */}
    <div>
      <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.2vw]">Root Cause</div>
      <textarea rows={2} value={rootCause} onChange={e => setRootCause(e.target.value)} placeholder="Root cause of the defect…"
        className="w-full border border-gray-200 rounded-[0.3vw] p-[0.38vw] text-[0.68vw] outline-none resize-none bg-white focus:border-gray-400" />
    </div>

    {/* Inspection Findings */}
    <div>
      <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.2vw]">Inspection Findings <span className="text-red-400">*</span></div>
      <textarea rows={2} value={inspectionFindings} onChange={e => setInspectionFindings(e.target.value)} placeholder="Detailed inspection observations…"
        className="w-full border border-gray-200 rounded-[0.3vw] p-[0.38vw] text-[0.68vw] outline-none resize-none bg-white focus:border-gray-400" />
    </div>

    {/* Actions Taken */}
    <div>
      <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.2vw]">Actions Taken</div>
      <textarea rows={2} value={actionsTaken} onChange={e => setActionsTaken(e.target.value)} placeholder="Rework, correction, or replacement actions…"
        className="w-full border border-gray-200 rounded-[0.3vw] p-[0.38vw] text-[0.68vw] outline-none resize-none bg-white focus:border-gray-400" />
    </div>

    {/* Corrective + Preventive */}
    <div className="grid grid-cols-2 gap-[0.4vw]">
      <div>
        <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.2vw]">Corrective Actions</div>
        <textarea rows={2} value={correctiveActions} onChange={e => setCorrectiveActions(e.target.value)} placeholder="Corrective measures…"
          className="w-full border border-gray-200 rounded-[0.3vw] p-[0.38vw] text-[0.68vw] outline-none resize-none bg-white focus:border-gray-400" />
      </div>
      <div>
        <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.2vw]">Preventive Measures</div>
        <textarea rows={2} value={preventiveMeasures} onChange={e => setPreventiveMeasures(e.target.value)} placeholder="Future prevention…"
          className="w-full border border-gray-200 rounded-[0.3vw] p-[0.38vw] text-[0.68vw] outline-none resize-none bg-white focus:border-gray-400" />
      </div>
    </div>

    {/* Closure divider */}
    <div className="border-t border-gray-200 pt-[0.35vw]">
      <div className="text-[0.6vw] font-bold text-gray-500 uppercase mb-[0.3vw]">Closure</div>
    </div>

    {/* Resolution type */}
    <div>
      <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.22vw]">Resolution Type</div>
      <div className="flex flex-wrap gap-[0.25vw]">
        {RESOLUTION_OPTS.map(r => (
          <button key={r} type="button" onClick={() => setResolutionType(r)}
            className={`px-[0.55vw] py-[0.25vw] rounded-[0.28vw] border text-[0.62vw] font-medium cursor-pointer transition-all
              ${resolutionType === r ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>{r}</button>
        ))}
      </div>
    </div>

    {/* Final Outcome */}
    <div>
      <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.2vw]">Final Outcome</div>
      <input value={finalOutcome} onChange={e => setFinalOutcome(e.target.value)} placeholder="e.g. Reworked and passed QC…"
        className="w-full border border-gray-200 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.68vw] outline-none bg-white focus:border-gray-400" />
    </div>

    {/* Closure Remarks */}
    <div>
      <div className="text-[0.6vw] font-bold text-gray-400 uppercase mb-[0.2vw]">Closure Remarks <span className="text-red-400">*</span></div>
      <textarea rows={2} value={closureRemarks} onChange={e => setClosureRemarks(e.target.value)} placeholder="Overall closure summary…"
        className="w-full border border-gray-200 rounded-[0.3vw] p-[0.38vw] text-[0.68vw] outline-none resize-none bg-white focus:border-gray-400" />
    </div>

    <div className="flex justify-end gap-[0.3vw] pt-[0.1vw]">
      <button onClick={resetPanel} className="px-[0.7vw] py-[0.35vw] bg-white border border-gray-200 text-gray-600 rounded-[0.35vw] text-[0.68vw] font-semibold cursor-pointer hover:bg-gray-50">Cancel</button>
      <button onClick={() => {
        if (!inspectionFindings.trim()) { alert("Inspection Findings are required."); return; }
        if (!closureRemarks.trim())     { alert("Closure Remarks are required."); return; }
        const now = new Date().toISOString();
        onUpdate({
          status: "Closed",
          defectNature, rootCause, inspectionFindings, actionsTaken, correctiveActions, preventiveMeasures, finalOutcome,
          _closure: { status: "Closed", resolutionType, remarks: closureRemarks, closedAt: now },
          closedAt: now,
          history: [...(entry.history || []), { status: "Closed", note: closureRemarks.slice(0, 80), by: currentUser?.name || "Unknown", at: now }],
          updatedAt: now,
        });
      }} className="flex items-center gap-[0.28vw] px-[0.9vw] py-[0.35vw] bg-gray-900 hover:bg-gray-800 text-white rounded-[0.35vw] text-[0.68vw] font-semibold cursor-pointer">
        <CheckCircle className="w-[0.72vw] h-[0.72vw]" />Confirm & Close
      </button>
    </div>
  </div>
);

// ── Inward Card ───────────────────────────────────────────────────────────────
const InwardCard = ({ entry, currentUser, isExpanded, onToggle, onUpdate }) => {
  const [showReport,  setShowReport]  = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isClosed  = entry._closure?.status === "Closed"  || entry.status === "Closed";
  const isPending = (entry._closure?.status === "Pending" || entry.status === "Pending" || entry.status === "Rework Ongoing") && !isClosed;
  const histCount = entry.history?.length || 0;
  const dispStatus = isClosed ? "Closed" : isPending ? "Pending" : entry.status;

  const handleUpdate = (updates) => {
    const all     = lsLoad(PMI_KEY, []);
    const updated = all.map(e => e.id === entry.id ? { ...e, ...updates } : e);
    lsSave(PMI_KEY, updated);
    onUpdate({ ...entry, ...updates });
  };

  return (
    <>
      <div className={`bg-white rounded-[0.6vw] border overflow-hidden hover:shadow-md transition-all
        ${isClosed ? "border-green-300" : isPending ? "border-gray-300" : "border-gray-200"}`}>

        {/* ── Header ── */}
        <div className="px-[0.9vw] pt-[0.75vw] pb-[0.6vw] cursor-pointer select-none" onClick={onToggle}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-[0.4vw] flex-wrap">
                <span className="font-mono text-[0.88vw] font-bold text-gray-800">{entry.refNo}</span>
                <StatusBadge status={dispStatus} />
                {entry.customerType && (
                  <span className="text-[0.62vw] bg-gray-100 text-gray-600 border border-gray-200 px-[0.4vw] py-[0.08vw] rounded font-medium">{entry.customerType}</span>
                )}
                {histCount > 0 && (
                  <span className="text-[0.6vw] bg-gray-100 text-gray-500 border border-gray-200 px-[0.4vw] rounded-full">{histCount} update{histCount > 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="text-[0.72vw] text-gray-500 mt-[0.15vw] flex items-center gap-[0.35vw]">
                <User className="w-[0.7vw] h-[0.7vw] text-gray-400" />
                <span className="font-medium">{entry.customerName}</span>
                {entry.customerCode && <span className="text-gray-400 font-mono">{entry.customerCode}</span>}
                {entry.assignedDept && <span className="text-gray-400">· {entry.assignedDept}</span>}
              </div>
            </div>
            <div className="flex items-center gap-[0.5vw] flex-shrink-0">
              {entry.slaDeadline && !isClosed && <SLATimer deadline={entry.slaDeadline} />}
              <span className="text-[0.65vw] text-gray-400">{entry.dateTime}</span>
              {isExpanded ? <ChevronUp className="w-[1vw] h-[1vw] text-gray-400" /> : <ChevronDown className="w-[1vw] h-[1vw] text-gray-400" />}
            </div>
          </div>
        </div>

        {/* ── Contact Bar ── */}
        {isExpanded && <ContactInfoBar entry={entry} />}

        {/* ── Expanded body ── */}
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <div className="p-[0.8vw]">

              {/* Product card */}
              <div className="rounded-[0.5vw] border border-gray-200 bg-white p-[0.7vw]">

                {/* Product header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-[0.5vw]">
                    <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-gray-900 flex items-center justify-center text-[0.58vw] font-bold text-white flex-shrink-0">1</div>
                    <div>
                      <div className="text-[0.82vw] font-bold text-gray-800">{entry.productDescription || "—"}</div>
                      <div className="flex items-center gap-[0.4vw] mt-[0.1vw] flex-wrap">
                        {entry.productCode && <span className="text-[0.62vw] text-gray-400 font-mono">{entry.productCode}</span>}
                        {entry.batchNo     && <span className="text-[0.62vw] text-gray-400">Batch: {entry.batchNo}</span>}
                        {entry.quantity    && <span className="text-[0.62vw] text-gray-400">Qty: {entry.quantity} {entry.unit}</span>}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={dispStatus} />
                </div>

                {/* Defect + Symptoms */}
                {(entry.defectNature || entry.symptoms) && (
                  <div className="mt-[0.4vw] bg-slate-50 border border-slate-200 rounded-[0.35vw] p-[0.45vw] space-y-[0.15vw]">
                    {entry.defectNature && (
                      <div className="flex items-center gap-[0.3vw]">
                        <span className="text-[0.6vw] font-semibold text-gray-400">Defect:</span>
                        <span className="text-[0.68vw] text-gray-700 font-medium">{entry.defectNature}</span>
                      </div>
                    )}
                    {entry.symptoms && (
                      <div>
                        <div className="text-[0.6vw] font-semibold text-gray-400 mb-[0.08vw]">Symptoms</div>
                        <div className="text-[0.68vw] text-gray-700">{entry.symptoms}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Saved inspection notes (before closure) */}
                {(entry.rootCause || entry.inspectionFindings) && !isClosed && (
                  <div className="mt-[0.4vw] pt-[0.35vw] border-t border-gray-100 space-y-[0.12vw]">
                    <div className="text-[0.6vw] font-bold text-gray-400 uppercase">Inspection Notes</div>
                    {entry.rootCause          && <div className="text-[0.68vw] text-gray-600"><span className="font-medium text-gray-400">Root Cause: </span>{entry.rootCause}</div>}
                    {entry.inspectionFindings && <div className="text-[0.68vw] text-gray-600"><span className="font-medium text-gray-400">Findings: </span>{entry.inspectionFindings}</div>}
                  </div>
                )}

                {/* Closed summary */}
                {isClosed && (
                  <div className="mt-[0.45vw] bg-green-50 border border-green-200 rounded-[0.35vw] px-[0.5vw] py-[0.38vw] space-y-[0.15vw]">
                    <div className="flex items-center gap-[0.3vw]">
                      <CheckCircle className="w-[0.75vw] h-[0.75vw] text-green-500" />
                      <span className="text-[0.72vw] font-bold text-green-700">Closed · {entry._closure?.resolutionType || "Resolved"}</span>
                      {entry._closure?.closedAt && <span className="text-[0.62vw] text-green-400 ml-auto">{new Date(entry._closure.closedAt).toLocaleDateString("en-GB")}</span>}
                    </div>
                    {entry.finalOutcome      && <div className="text-[0.68vw] text-gray-600"><span className="font-medium text-gray-400">Outcome: </span>{entry.finalOutcome}</div>}
                    {entry._closure?.remarks && <div className="text-[0.68vw] text-gray-600"><span className="font-medium text-gray-400">Remarks: </span>{entry._closure.remarks}</div>}
                  </div>
                )}

                {/* Action panel */}
                <ProductClosurePanel
                  entry={entry}
                  currentUser={currentUser}
                  onUpdate={handleUpdate}
                  hidePending={isPending}
                />
              </div>

              {/* History */}
              {histCount > 0 && (
                <div className="mt-[0.5vw]">
                  <button onClick={() => setShowHistory(h => !h)}
                    className="w-full flex items-center justify-between px-[0.7vw] py-[0.42vw] bg-white hover:bg-gray-50 border border-gray-200 rounded-[0.4vw] text-[0.7vw] font-medium text-gray-600 cursor-pointer">
                    <span className="flex items-center gap-[0.3vw]"><History className="w-[0.75vw] h-[0.75vw] text-gray-400" />History ({histCount})</span>
                    {showHistory ? <ChevronUp className="w-[0.75vw] h-[0.75vw] text-gray-400" /> : <ChevronDown className="w-[0.75vw] h-[0.75vw] text-gray-400" />}
                  </button>
                  {showHistory && (
                    <div className="mt-[0.3vw] border border-gray-200 rounded-[0.4vw] bg-white divide-y divide-gray-100 max-h-[12vw] overflow-y-auto">
                      {[...entry.history].reverse().map((h, i) => (
                        <div key={i} className="flex items-start gap-[0.5vw] px-[0.7vw] py-[0.45vw]">
                          <MiniAvatar name={h.by} />
                          <div className="flex-1">
                            <div className="flex items-center gap-[0.4vw]">
                              <StatusBadge status={h.status} />
                              <span className="text-[0.6vw] text-gray-400">{new Date(h.at).toLocaleString()} · {h.by}</span>
                            </div>
                            {h.note && <p className="text-[0.68vw] text-gray-600 mt-[0.1vw]">{h.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* View Report */}
              <button onClick={() => setShowReport(true)}
                className="mt-[0.5vw] w-full py-[0.5vw] bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-[0.4vw] text-[0.72vw] font-semibold cursor-pointer flex items-center justify-center gap-[0.4vw] transition-all">
                <Eye className="w-[0.8vw] h-[0.8vw]" />View Full Report
              </button>
            </div>
          </div>
        )}
      </div>

      {showReport && <ReportModal entry={entry} onClose={() => setShowReport(false)} />}
    </>
  );
};

// ── Reports Tab ───────────────────────────────────────────────────────────────
const ReportsTab = ({ entries, currentUser }) => {
  const [search,   setSearch]   = useState("");
  const [showRec,  setShowRec]  = useState(null);
  const [filterSt, setFilterSt] = useState("All");

  const uid  = currentUser?.userId || currentUser?.id;
  const name = currentUser?.name;

  const mine = useMemo(() => entries.filter(e =>
    e.assignedTo === name || e.assignedToId === uid || e.history?.some(h => h.by === name)
  ), [entries, name, uid]);

  const getDispStatus = (e) => {
    if (e._closure?.status === "Closed" || e.status === "Closed") return "Closed";
    if (e._closure?.status === "Pending" || e.status === "Pending" || e.status === "Rework Ongoing") return "Pending";
    return e.status;
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return mine.filter(e => {
      const ds  = getDispStatus(e);
      const mst = filterSt === "All" || ds === filterSt;
      const mq  = !s || [e.refNo, e.customerName, e.productDescription, e.defectNature].some(v => (v || "").toLowerCase().includes(s));
      return mst && mq;
    });
  }, [mine, search, filterSt]);

  const closedCount  = mine.filter(e => getDispStatus(e) === "Closed").length;
  const pendingCount = mine.filter(e => getDispStatus(e) === "Pending").length;

  return (
    <div className="space-y-[0.8vw] mt-[0.5vw]">
      <div className="grid grid-cols-3 gap-[0.6vw]">
        {[
          { label: "Total Assigned",   value: mine.length,    cls: "bg-blue-50 border-blue-200 text-blue-700"   },
          { label: "Closed",           value: closedCount,    cls: "bg-green-50 border-green-200 text-green-700" },
          { label: "Pending / Rework", value: pendingCount,   cls: "bg-gray-50 border-gray-200 text-gray-700"   },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`rounded-[0.5vw] border p-[0.7vw] ${cls}`}>
            <div className="text-[1.4vw] font-bold">{value}</div>
            <div className="text-[0.72vw] font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-[0.6vw] items-center">
        <div className="relative flex-1">
          <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ref, customer, product…"
            className="w-full pl-[2.2vw] pr-[1vw] py-[0.5vw] border border-gray-300 rounded-[0.5vw] text-[0.78vw] outline-none focus:border-gray-500 bg-white" />
        </div>
        <select value={filterSt} onChange={e => setFilterSt(e.target.value)}
          className="border border-gray-300 rounded-[0.4vw] h-[2.4vw] px-[0.5vw] text-[0.78vw] outline-none bg-white">
          <option value="All">All Status</option>
          {["Assigned", "In Progress", "Pending", "Closed"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[0.5vw] border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-[0.75vw]">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {["Ref No", "Date", "Customer", "Product", "Defect", "Batch", "Qty", "Status", "Updates", ""].map(h => (
                <th key={h} className="p-[0.6vw] font-semibold text-gray-700 border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="py-[3vw] text-center text-gray-400">No records found</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-[0.6vw] border-r border-gray-200 font-mono text-blue-600 font-bold">{e.refNo}</td>
                <td className="p-[0.6vw] border-r border-gray-200 text-gray-500 whitespace-nowrap">{new Date(e.timestamp).toLocaleDateString("en-GB")}</td>
                <td className="p-[0.6vw] border-r border-gray-200 font-medium max-w-[8vw] truncate">{e.customerName}</td>
                <td className="p-[0.6vw] border-r border-gray-200 text-gray-600 max-w-[10vw] truncate">{e.productDescription || "—"}</td>
                <td className="p-[0.6vw] border-r border-gray-200 text-gray-600">{e.defectNature || "—"}</td>
                <td className="p-[0.6vw] border-r border-gray-200 text-gray-500 font-mono">{e.batchNo || "—"}</td>
                <td className="p-[0.6vw] border-r border-gray-200">{e.quantity ? `${e.quantity} ${e.unit || ""}` : "—"}</td>
                <td className="p-[0.6vw] border-r border-gray-200"><StatusBadge status={getDispStatus(e)} /></td>
                <td className="p-[0.6vw] border-r border-gray-200 text-center text-gray-500">{e.history?.length || 0}</td>
                <td className="p-[0.6vw] text-center">
                  <button onClick={() => setShowRec(e)} className="p-[0.3vw] text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-[0.3vw] cursor-pointer transition-colors">
                    <Eye className="w-[0.9vw] h-[0.9vw]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-gray-50 border-t border-gray-200 px-[0.8vw] py-[0.4vw]">
          <span className="text-[0.7vw] text-gray-500">Showing <strong>{filtered.length}</strong> of <strong>{mine.length}</strong></span>
        </div>
      </div>

      {showRec && <ReportModal entry={showRec} onClose={() => setShowRec(null)} />}
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────
export default function ProductionMaterialInwardResponse({ currentUser: propUser }) {
  const [entries,     setEntries]     = useState([]);
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [activeTab,   setActiveTab]   = useState("assigned");
  const [expanded,    setExpanded]    = useState(null);

  useEffect(() => { if (propUser) setCurrentUser(propUser); }, [propUser]);
  useEffect(() => { if (!propUser) setCurrentUser(getCurrentUser()); }, [propUser]);

  const reload = () => setEntries(lsLoad(PMI_KEY, []));
  useEffect(() => { reload(); const iv = setInterval(reload, 2000); return () => clearInterval(iv); }, []);

  const uid  = currentUser?.userId || currentUser?.id;
  const name = currentUser?.name;
  const matchesMe = (e) => e.assignedTo === name || e.assignedToId === uid;

  const myEntries = useMemo(() => entries.filter(e =>
    matchesMe(e) &&
    e._closure?.status !== "Closed"  && e.status !== "Closed" &&
    e._closure?.status !== "Pending" && e.status !== "Pending" && e.status !== "Rework Ongoing"
  ), [entries, currentUser]);

  const pendingEntries = useMemo(() => entries.filter(e =>
    matchesMe(e) &&
    (e._closure?.status === "Pending" || e.status === "Pending" || e.status === "Rework Ongoing") &&
    e._closure?.status !== "Closed" && e.status !== "Closed"
  ), [entries, currentUser]);

  const closedEntries = useMemo(() => entries.filter(e =>
    matchesMe(e) && (e._closure?.status === "Closed" || e.status === "Closed")
  ), [entries, currentUser]);

  const handleUpdate = (updated) => {
    setEntries(p => p.map(e => e.id === updated.id ? updated : e));
  };

  const TABS = [
    { id: "assigned", label: "Active",  icon: Package,     count: myEntries.length      },
    { id: "pending",  label: "Pending", icon: AlertCircle, count: pendingEntries.length },
    { id: "closed",   label: "Closed",  icon: CheckCircle, count: closedEntries.length  },
    { id: "reports",  label: "Reports", icon: BarChart2,   count: 0                     },
  ];

  const listMap     = { assigned: myEntries, pending: pendingEntries, closed: closedEntries };
  const currentList = listMap[activeTab];
  const emptyMsg    = { assigned: "No active entries assigned to you", pending: "No pending entries", closed: "No closed entries yet" };

  return (
    <div className="w-full font-sans text-[0.85vw]">
      {/* Tab bar */}
      <div className="flex gap-[0.3vw] mb-[0.9vw] bg-white border border-gray-200 rounded-[0.6vw] p-[0.3vw] shadow-sm sticky top-0 z-10">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-[0.4vw] px-[0.9vw] py-[0.5vw] rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer transition-all
              ${activeTab === id ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
            <Icon className="w-[0.88vw] h-[0.88vw]" />{label}
            {count > 0 && (
              <span className={`text-[0.6vw] px-[0.4vw] py-[0.04vw] rounded-full font-bold ${activeTab === id ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600"}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-[82vh] overflow-y-auto pr-[0.3vw]">
        <AnimatePresence mode="wait">
          {activeTab === "reports" ? (
            <motion.div key="reports" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ReportsTab entries={entries} currentUser={currentUser} />
            </motion.div>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {currentList?.length === 0 ? (
                <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
                  <Package className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[0.8vw]" />
                  <p className="text-[1vw] text-gray-400 font-medium">{emptyMsg[activeTab]}</p>
                </div>
              ) : (
                <div className="space-y-[0.8vw]">
                  {currentList.map(e => (
                    <InwardCard key={e.id} entry={e} currentUser={currentUser}
                      isExpanded={expanded === e.id}
                      onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                      onUpdate={handleUpdate} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}