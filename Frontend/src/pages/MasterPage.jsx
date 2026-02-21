import React, { useState, useEffect, useRef } from "react";
import {
  Settings, Plus, X, ChevronUp, ChevronDown, ArrowRight,
  AlertTriangle, Save, RotateCcw, Shield, Users, GripVertical,
  Info, CheckCircle, PhoneCall, UserCheck, Search,
  Tag, Edit2, Trash2, Check, Tags, HelpCircle,
} from "lucide-react";

// ── Storage Keys ──────────────────────────────────────────────────────────────
const PARTY_TYPES_KEY      = "party_types_v3";
const EMPLOYEES_KEY        = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const CUSTOMER_DB_KEY      = "customer_db_grouped_v5";

// ── Default dept flow ─────────────────────────────────────────────────────────
const DEFAULT_DEPTS = ["Support Engineer", "Service Engineer", "R&D"];

const TYPE_BADGE_COLORS = [
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-blue-100   text-blue-700   border-blue-200",
  "bg-green-100  text-green-700  border-green-200",
  "bg-pink-100   text-pink-700   border-pink-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

const TYPE_COLORS = [
  { bg: "bg-purple-50", border: "border-purple-200 ", badge: "bg-purple-600 text-white",  accent: "text-purple-600", headerBg: "bg-gradient-to-r from-purple-50 to-slate-50" },
  { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-600 text-white",  accent: "text-orange-600", headerBg: "bg-gradient-to-r from-orange-50 to-slate-50" },
  { bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-600 text-white",    accent: "text-blue-600",   headerBg: "bg-gradient-to-r from-blue-50 to-slate-50"   },
  { bg: "bg-green-50",  border: "border-green-200",  badge: "bg-green-600 text-white",   accent: "text-green-600",  headerBg: "bg-gradient-to-r from-green-50 to-slate-50"  },
  { bg: "bg-pink-50",   border: "border-pink-200",   badge: "bg-pink-600 text-white",    accent: "text-pink-600",   headerBg: "bg-gradient-to-r from-pink-50 to-slate-50"   },
  { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-600 text-white",  accent: "text-indigo-600", headerBg: "bg-gradient-to-r from-indigo-50 to-slate-50" },
];

const LEVEL_COLORS = [
  "bg-blue-500", "bg-blue-600", "bg-blue-700",
  "bg-blue-800", "bg-blue-900", "bg-slate-700",
];

const LEVEL_BG_LIGHT = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-blue-100/70 border-blue-200 text-blue-800",
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-blue-200/60 border-blue-300 text-blue-900",
  "bg-blue-200 border-blue-400 text-blue-900",
  "bg-slate-100 border-slate-300 text-slate-800",
];

function loadEmployees() {
  try { return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || "[]"); }
  catch { return []; }
}

function loadCustomerDb() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_DB_KEY) || "[]"); }
  catch { return []; }
}

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// HelpTooltip — hover icon that shows info in a floating tooltip
// ─────────────────────────────────────────────────────────────────────────────
const HelpTooltip = ({ content, position = "right", width = "16vw" }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Position classes
  const posMap = {
    right:  "left-full top-1/2 -translate-y-1/2 ml-[0.6vw]",
    left:   "right-full top-1/2 -translate-y-1/2 mr-[0.6vw]",
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-[0.6vw]",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-[0.6vw]",
  };

  // Arrow classes
  const arrowMap = {
    right:  "right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-t-transparent border-b-transparent border-l-transparent",
    left:   "left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-t-transparent border-b-transparent border-r-transparent",
    top:    "top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-l-transparent border-r-transparent border-t-transparent",
  };

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors duration-150 cursor-help"
      >
        <HelpCircle className="w-[1vw] h-[1vw]" />
      </button>

      {visible && (
        <div
          className={`absolute z-50 ${posMap[position]}`}
          style={{ width }}
        >
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-[0.35vw] ${arrowMap[position]}`} />
          {/* Box */}
          <div className="bg-slate-700 text-white rounded-[0.4vw] shadow-xl px-[0.8vw] py-[0.6vw]">
            {typeof content === "string" ? (
              <p className="text-[0.7vw] leading-relaxed">{content}</p>
            ) : (
              content
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PartyTypesSection — full category management
// ─────────────────────────────────────────────────────────────────────────────
const PartyTypesSection = ({ partyTypes, setPartyTypes }) => {
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const savePartyTypes = (types) => {
    setPartyTypes(types);
    localStorage.setItem(PARTY_TYPES_KEY, JSON.stringify(types));
  };

  const handleAdd = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    if (partyTypes.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("This category already exists!");
      return;
    }
    savePartyTypes([...partyTypes, { id: Date.now(), name: trimmed }]);
    setNewTypeName("");
  };

  const handleUpdate = () => {
    if (!editingType?.name?.trim()) return;
    const trimmed = editingType.name.trim();
    if (partyTypes.some((t) => t.id !== editingType.id && t.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("This category already exists!");
      return;
    }
    const oldName = partyTypes.find((t) => t.id === editingType.id)?.name;
    const updated = partyTypes.map((t) => t.id === editingType.id ? { ...t, name: trimmed } : t);
    savePartyTypes(updated);
    if (oldName && oldName !== trimmed) {
      const db = loadCustomerDb();
      const updatedDb = db.map((row) => row.partyType === oldName ? { ...row, partyType: trimmed } : row);
      localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updatedDb));
    }
    setEditingType(null);
  };

  const handleDelete = (typeId) => {
    if (partyTypes.length === 1) { alert("Cannot delete the last category!"); return; }
    const typeToDelete = partyTypes.find((t) => t.id === typeId);
    const db = loadCustomerDb();
    const usageCount = db.filter((row) => row.partyType === typeToDelete.name).length;
    setConfirmDelete({ type: typeToDelete, usageCount });
  };

  const confirmAndDelete = () => {
    if (!confirmDelete) return;
    const remaining = partyTypes.filter((t) => t.id !== confirmDelete.type.id);
    savePartyTypes(remaining);
    if (confirmDelete.usageCount > 0) {
      const db = loadCustomerDb();
      const updatedDb = db.map((row) =>
        row.partyType === confirmDelete.type.name ? { ...row, partyType: remaining[0]?.name || "" } : row
      );
      localStorage.setItem(CUSTOMER_DB_KEY, JSON.stringify(updatedDb));
    }
    setConfirmDelete(null);
  };

  const categoryTooltipContent = (
    <div className="flex flex-col gap-[0.4vw]">
      <p className="text-[0.72vw] font-bold text-white border-b border-slate-500 pb-[0.3vw] mb-[0.1vw]">About Categories</p>
      <p className="text-[0.68vw] text-slate-300 leading-relaxed">Categories classify customers and control which escalation flow their tickets follow.</p>
      <ul className="text-[0.65vw] text-slate-300 flex flex-col gap-[0.25vw] mt-[0.1vw]">
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Appear in Customer Database & Service Call forms</li>
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Renaming updates all existing records automatically</li>
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Deleting reassigns records to the first remaining category</li>
      </ul>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-[0.6vw] shadow-sm ">
      {/* Section header */}
      <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.9vw] border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="w-[2vw] h-[2vw] rounded-[0.4vw] bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
          <Tags className="w-[1vw] h-[1vw] text-white" />
        </div>
        <div>
          <h2 className="text-[0.95vw] font-bold text-slate-900">Party Type Categories</h2>
          <p className="text-[0.72vw] text-slate-500 mt-[0.05vw]">
            Manage customer categories used across the system
          </p>
        </div>
        <div className="ml-auto flex items-center gap-[0.6vw]">
          <HelpTooltip content={categoryTooltipContent} position="left" width="18vw" />
          <div className="text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full">
            {partyTypes.length} categories
          </div>
        </div>
      </div>

      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-slate-500 uppercase tracking-wide mb-[0.6vw]">
            Existing Categories
          </p>
          <div className="border border-slate-200 rounded-[0.5vw] max-h-[16vh] overflow-auto">
            {partyTypes.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">No categories yet</div>
            ) : (
              partyTypes.map((type, idx) => {
                const badgeClass = TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                const db = loadCustomerDb();
                const usageCount = db.filter((r) => r.partyType === type.name).length;

                return (
                  <div key={type.id} className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-100 last:border-0 group transition-colors ">
                    {editingType?.id === type.id ? (
                      <div className="flex flex-1 items-center gap-[0.5vw]">
                        <input
                          autoFocus
                          type="text"
                          value={editingType.name}
                          onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") setEditingType(null); }}
                          className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none ring-2 ring-blue-100 focus:ring-blue-200 transition-all"
                        />
                        <button type="button" onClick={handleUpdate} className="p-[0.4vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[0.3vw] cursor-pointer transition-colors">
                          <Check className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                        <button type="button" onClick={() => setEditingType(null)} className="p-[0.4vw] bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-[0.3vw] cursor-pointer transition-colors">
                          <X className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`text-[0.75vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${badgeClass}`}>
                          {type.name}
                        </span>
                        <span className="text-[0.68vw] text-slate-400 flex-1">
                          {usageCount} customer record{usageCount !== 1 ? "s" : ""}
                        </span>
                        <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setEditingType({ id: type.id, name: type.name })}
                            className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(type.id)}
                            className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer transition-colors"
                            title="Delete"
                            disabled={partyTypes.length === 1}
                          >
                            <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Add new + color preview ───────────────────────── */}
        <div className="flex flex-col gap-[0.8vw]">
          <div>
            <p className="text-[0.75vw] font-semibold text-slate-500 uppercase tracking-wide mb-[0.6vw]">
              Add New Category
            </p>
            <div className="flex gap-[0.5vw]">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Distributor, Reseller…"
                className="flex-1 border border-slate-200 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newTypeName.trim()}
                className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-[0.9vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-semibold transition-all"
              >
                <Plus className="w-[0.85vw] h-[0.85vw]" /> Add
              </button>
            </div>
          </div>

          {/* Color preview */}
          {partyTypes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-[0.4vw] p-[0.7vw]">
              <p className="text-[0.68vw] font-semibold text-slate-500 mb-[0.5vw]">Category Preview</p>
              <div className="flex flex-wrap gap-[0.4vw]">
                {partyTypes.map((type, idx) => (
                  <span key={type.id} className={`text-[0.72vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length]}`}>
                    {type.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation inline banner */}
      {confirmDelete && (
        <div className="mx-[1.2vw] mb-[1.2vw] bg-red-50 border border-red-200 rounded-[0.4vw] p-[0.8vw] flex items-center justify-between gap-[1vw]">
          <div>
            <p className="text-[0.82vw] font-bold text-red-700">
              Delete "{confirmDelete.type.name}"?
            </p>
            {confirmDelete.usageCount > 0 && (
              <p className="text-[0.72vw] text-red-600 mt-[0.1vw]">
                ⚠ This type is used by {confirmDelete.usageCount} customer record{confirmDelete.usageCount > 1 ? "s" : ""} — they will be reassigned to the first remaining category.
              </p>
            )}
          </div>
          <div className="flex gap-[0.5vw] flex-shrink-0">
            <button type="button" onClick={() => setConfirmDelete(null)} className="px-[0.8vw] py-[0.4vw] border border-slate-300 bg-white rounded-[0.3vw] text-[0.78vw] cursor-pointer hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={confirmAndDelete} className="px-[0.8vw] py-[0.4vw] bg-red-600 hover:bg-red-700 text-white rounded-[0.3vw] text-[0.78vw] font-semibold cursor-pointer transition-colors">
              Yes, Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EngineerPicker — multi-select dropdown
// ─────────────────────────────────────────────────────────────────────────────
const EngineerPicker = ({ dept, selectedIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allEmps = loadEmployees();
  const deptEngs = allEmps.filter((e) => e.department === dept);
  const filtered = deptEngs.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.userId || "").toLowerCase().includes(search.toLowerCase())
  );
  const selectedEngs = deptEngs.filter((e) => selectedIds.includes(e.userId));

  const toggle    = (id) => onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const selectAll = () => onChange(deptEngs.map((e) => e.userId));
  const clearAll  = () => onChange([]);

  return (
    <div className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`min-h-[2.2vw] border rounded-[0.4vw] px-[0.6vw] py-[0.35vw] bg-white cursor-pointer flex items-center gap-[0.35vw] flex-wrap transition-all duration-200 ${
          open ? "border-blue-400 ring-2 ring-blue-100 shadow-sm" : "border-slate-200 hover:border-blue-300"
        }`}
      >
        {selectedEngs.length === 0 ? (
          <span className="text-slate-400 text-[0.72vw] italic select-none flex-1">
            {deptEngs.length === 0 ? "⚠ No engineers in this department" : "Auto-assign (least busy)"}
          </span>
        ) : (
          selectedEngs.map((eng) => (
            <span key={eng.userId} className="flex items-center gap-[0.25vw] bg-blue-50 text-blue-700 border border-blue-200 rounded-full pl-[0.25vw] pr-[0.45vw] py-[0.1vw] text-[0.68vw] font-semibold">
              <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.5vw] font-bold flex-shrink-0">{initials(eng.name)}</span>
              {eng.name}
              <button type="button" onClick={(ev) => { ev.stopPropagation(); toggle(eng.userId); }} className="hover:text-red-400 cursor-pointer ml-[0.05vw] transition-colors">
                <X className="w-[0.7vw] h-[0.7vw]" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className={`w-[0.85vw] h-[0.85vw] text-slate-400 ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute top-full left-0 w-full mt-[0.3vw] bg-white border border-slate-200 rounded-[0.4vw] shadow-lg z-40 overflow-hidden">
          {deptEngs.length > 3 && (
            <div className="p-[0.5vw] border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-[0.5vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-slate-400" />
                <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search engineer..." className="w-full pl-[1.8vw] pr-[0.5vw] py-[0.4vw] text-[0.78vw] border border-slate-200 rounded-[0.3vw] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all" />
              </div>
            </div>
          )}

          {deptEngs.length > 0 && (
            <div className="flex gap-[0.5vw] px-[0.7vw] py-[0.4vw] border-b border-slate-100 bg-slate-50/50">
              <button type="button" onClick={selectAll} className="text-[0.7vw] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold transition-colors">Select all</button>
              <span className="text-slate-300 text-[0.7vw]">|</span>
              <button type="button" onClick={clearAll}  className="text-[0.7vw] text-slate-500 hover:text-slate-700 hover:underline cursor-pointer transition-colors">Clear (auto)</button>
            </div>
          )}

          <div className="max-h-[13vw] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-[1vw] text-center text-slate-400 text-[0.75vw]">
                {deptEngs.length === 0 ? `No engineers in "${dept}"` : "No results"}
              </div>
            ) : (
              filtered.map((eng) => {
                const selected = selectedIds.includes(eng.userId);
                return (
                  <div key={eng.userId} onClick={() => toggle(eng.userId)} className={`flex items-center gap-[0.6vw] px-[0.7vw] py-[0.55vw] cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${selected ? "bg-blue-50/70" : "hover:bg-slate-50"}`}>
                    <div className={`w-[1vw] h-[1vw] rounded-[0.2vw] border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${selected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                      {selected && <CheckCircle className="w-[0.65vw] h-[0.65vw] text-white" />}
                    </div>
                    <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[0.6vw] font-bold">{initials(eng.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8vw] font-semibold text-slate-700 truncate">{eng.name}</div>
                      <div className="text-[0.67vw] text-slate-400 font-mono">{eng.userId}</div>
                    </div>
                    {selected && <CheckCircle className="w-[0.9vw] h-[0.9vw] text-blue-500 flex-shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-[0.7vw] py-[0.5vw] border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-[0.68vw] text-slate-400">
              {selectedIds.length === 0 ? "Auto-assign (load balanced)" : `${selectedIds.length} selected`}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="text-[0.7vw] bg-blue-600 text-white px-[0.7vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer font-semibold hover:bg-blue-700 transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StepCard
// ─────────────────────────────────────────────────────────────────────────────
const StepCard = ({ step, index, total, availableToSwitch, onUpdate, onRemove, onMoveUp, onMoveDown, onDragStart, onDragEnter, onDragEnd, isDragOver }) => {
  const deptEngs = loadEmployees().filter((e) => e.department === step.dept);
  const hasWarning = deptEngs.length === 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`border rounded-[0.5vw] bg-white overflow-visible transition-all duration-200 ${isDragOver ? "border-blue-400 shadow-md ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200 shadow-sm"}`}
    >
      <div className="flex items-center gap-[0.5vw] px-[0.7vw] py-[0.45vw] bg-slate-50/70 border-b border-slate-100">
        <GripVertical className="w-[1vw] h-[1vw] text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0 hover:text-slate-400 transition-colors" />
        <div className={`w-[1.6vw] h-[1.6vw] rounded-full ${LEVEL_COLORS[index] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <span className="text-white text-[0.58vw] font-bold">L{index + 1}</span>
        </div>
        <select
          value={step.dept}
          onChange={(e) => onUpdate({ ...step, dept: e.target.value, engineerIds: [] })}
          className="flex-1 border border-slate-200 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.8vw] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer transition-all"
        >
          <option value={step.dept}>{step.dept}</option>
          {availableToSwitch.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {hasWarning && (
          <span className="text-[0.62vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.4vw] py-[0.1vw] rounded-full flex items-center gap-[0.2vw] whitespace-nowrap">
            <AlertTriangle className="w-[0.65vw] h-[0.65vw]" /> 0 engineers
          </span>
        )}
        <div className="flex flex-col gap-[0.05vw] flex-shrink-0">
          <button type="button" onClick={onMoveUp}   disabled={index === 0}          className="text-slate-300 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"><ChevronUp   className="w-[0.85vw] h-[0.85vw]" /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}  className="text-slate-300 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"><ChevronDown className="w-[0.85vw] h-[0.85vw]" /></button>
        </div>
        <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-400 cursor-pointer transition-colors flex-shrink-0">
          <X className="w-[1vw] h-[1vw]" />
        </button>
      </div>

      <div className="px-[0.8vw] py-[0.55vw] flex items-start gap-[0.5vw]">
        <div className="text-[0.7vw] text-slate-500 font-semibold whitespace-nowrap mt-[0.55vw] flex-shrink-0 flex items-center gap-[0.25vw] w-[4.5vw]">
          <Users className="w-[0.8vw] h-[0.8vw]" /> Engineers
        </div>
        <div className="flex-1">
          <EngineerPicker dept={step.dept} selectedIds={step.engineerIds || []} onChange={(ids) => onUpdate({ ...step, engineerIds: ids })} />
          {step.engineerIds?.length === 0 && deptEngs.length > 0 && (
            <p className="text-[0.64vw] text-slate-400 mt-[0.2vw] flex items-center gap-[0.25vw]">
              <Info className="w-[0.65vw] h-[0.65vw]" />
              Leave empty to auto-assign (least-busy from {deptEngs.length} engineer{deptEngs.length > 1 ? "s" : ""})
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FlowEditor
// ─────────────────────────────────────────────────────────────────────────────
const FlowEditor = ({ steps, departments, onChange }) => {
  const [dragIdx,    setDragIdx]    = useState(null);
  const [dragOver,   setDragOver]   = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const usedDepts      = steps.map((s) => s.dept);
  const availableToAdd = departments.filter((d) => !usedDepts.includes(d));
  const availableToSwitch = (currentDept) => departments.filter((d) => d === currentDept || !usedDepts.includes(d));

  const updateStep = (i, u) => onChange(steps.map((s, idx) => (idx === i ? u : s)));
  const removeStep = (i)    => onChange(steps.filter((_, idx) => idx !== i));
  const moveStep   = (i, dir) => {
    const f = [...steps], j = i + dir;
    if (j < 0 || j >= f.length) return;
    [f[i], f[j]] = [f[j], f[i]];
    onChange(f);
  };
  const addStep = (dept) => { onChange([...steps, { dept, engineerIds: [] }]); setShowPicker(false); };

  const handleDragEnd = () => {
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      const f = [...steps];
      const [removed] = f.splice(dragIdx, 1);
      f.splice(dragOver, 0, removed);
      onChange(f);
    }
    setDragIdx(null); setDragOver(null);
  };

  return (
    <div className="flex flex-col gap-[0.5vw]">
      {steps.length === 0 ? (
        <div className="text-center py-[1.5vw] text-slate-400 text-[0.78vw] border-2 border-dashed border-slate-200 rounded-[0.4vw] bg-slate-50/50">
          No levels yet — add at least one escalation level
        </div>
      ) : (
        steps.map((step, i) => (
          <StepCard
            key={`${step.dept}-${i}`}
            step={step} index={i} total={steps.length}
            availableToSwitch={availableToSwitch(step.dept)}
            onUpdate={(u) => updateStep(i, u)}
            onRemove={() => removeStep(i)}
            onMoveUp={() => moveStep(i, -1)}
            onMoveDown={() => moveStep(i, 1)}
            onDragStart={() => setDragIdx(i)}
            onDragEnter={() => setDragOver(i)}
            onDragEnd={handleDragEnd}
            isDragOver={dragOver === i && dragIdx !== i}
          />
        ))
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          disabled={availableToAdd.length === 0}
          className="w-full flex items-center justify-center gap-[0.4vw] border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:border-blue-300 rounded-[0.4vw] py-[0.6vw] text-[0.78vw] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Escalation Level
        </button>
        {showPicker && (
          <div className="absolute top-full left-0 w-full mt-[0.3vw] bg-white border border-slate-200 shadow-lg rounded-[0.4vw] z-20 overflow-hidden">
            {availableToAdd.map((dept) => {
              const cnt = loadEmployees().filter((e) => e.department === dept).length;
              return (
                <div key={dept} onClick={() => addStep(dept)} className="flex items-center justify-between px-[0.8vw] py-[0.65vw] hover:bg-blue-50/60 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                  <span className="text-[0.82vw] font-semibold text-slate-700">{dept}</span>
                  <span className={`text-[0.62vw] px-[0.45vw] py-[0.12vw] rounded-full font-semibold ${cnt === 0 ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-500"}`}>
                    {cnt} eng
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Chain Preview
// ─────────────────────────────────────────────────────────────────────────────
const ChainPreview = ({ steps }) => {
  const employees = loadEmployees();
  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-[0.5vw] p-[0.8vw]">
      <h4 className="text-[0.78vw] font-bold text-slate-700 mb-[0.6vw] flex items-center gap-[0.3vw]">
        <ArrowRight className="w-[0.85vw] h-[0.85vw] text-blue-500" /> Escalation Chain Preview
      </h4>
      {steps.length === 0 ? (
        <span className="text-[0.72vw] text-slate-400 italic">No levels configured</span>
      ) : (
        <div className="flex flex-col gap-[0.5vw]">
          {steps.map((step, i) => {
            const deptEngs = employees.filter((e) => e.department === step.dept);
            const selEngs  = deptEngs.filter((e) => step.engineerIds?.includes(e.userId));
            return (
              <div key={i} className="flex items-start gap-[0.5vw]">
                <div className="flex flex-col items-center">
                  <div className={`w-[1.5vw] h-[1.5vw] rounded-full ${LEVEL_COLORS[i] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <span className="text-white text-[0.52vw] font-bold">L{i + 1}</span>
                  </div>
                  {i < steps.length - 1 && <div className="w-[0.12vw] h-[0.6vw] bg-blue-200 my-[0.1vw]" />}
                </div>
                <div className="flex-1 bg-white rounded-[0.3vw] border border-slate-200 px-[0.55vw] py-[0.3vw]">
                  <div className="text-[0.75vw] font-bold text-slate-700">{step.dept}</div>
                  {selEngs.length > 0 ? (
                    <div className="flex gap-[0.25vw] flex-wrap mt-[0.2vw]">
                      {selEngs.map((eng) => (
                        <span key={eng.userId} className="flex items-center gap-[0.2vw] text-[0.62vw] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-[0.4vw] py-[0.05vw]">
                          <span className="w-[1vw] h-[1vw] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.45vw] font-bold">{initials(eng.name)}</span>
                          {eng.name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[0.62vw] text-slate-400 italic">
                      {deptEngs.length === 0 ? "⚠ No engineers in dept" : `Auto from ${deptEngs.length} engineer${deptEngs.length > 1 ? "s" : ""}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-[0.5vw]">
            <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-[0.85vw] h-[0.85vw] text-blue-500" />
            </div>
            <span className="text-[0.67vw] text-slate-400 italic">Resolved / Closed</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SystemSettingsPage
// ─────────────────────────────────────────────────────────────────────────────
const SystemSettingsPage = () => {
  const [partyTypes,   setPartyTypes]   = useState([]);
  const [flows,        setFlows]        = useState({});
  const [departments,  setDepartments]  = useState([]);
  const [expandedType, setExpandedType] = useState(null);
  const [saved,        setSaved]        = useState(false);
  const [hasChanges,   setHasChanges]   = useState(false);
  const [origFlows,    setOrigFlows]    = useState({});

  useEffect(() => {
    try {
      const pt = JSON.parse(localStorage.getItem(PARTY_TYPES_KEY) || "[]");
      setPartyTypes(pt.length ? pt : [{ id: 1, name: "OEM" }, { id: 2, name: "End Customer" }]);
    } catch {
      setPartyTypes([{ id: 1, name: "OEM" }, { id: 2, name: "End Customer" }]);
    }

    try {
      const emps  = JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || "[]");
      const depts = [...new Set(emps.map((e) => e.department).filter(Boolean))];
      setDepartments([...new Set([...DEFAULT_DEPTS, ...depts])]);
    } catch { setDepartments([...DEFAULT_DEPTS]); }

    try {
      const s = JSON.parse(localStorage.getItem(ESCALATION_FLOWS_KEY) || "{}");
      setFlows(s);
      setOrigFlows(JSON.parse(JSON.stringify(s)));
    } catch { setFlows({}); setOrigFlows({}); }
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(flows) !== JSON.stringify(origFlows));
  }, [flows, origFlows]);

  const getFlow    = (typeName) => flows[typeName] ?? DEFAULT_DEPTS.map((dept) => ({ dept, engineerIds: [] }));
  const updateFlow = (typeName, steps) => setFlows((prev) => ({ ...prev, [typeName]: steps }));
  const resetType  = (typeName) => setFlows((prev) => ({ ...prev, [typeName]: DEFAULT_DEPTS.map((dept) => ({ dept, engineerIds: [] })) }));

  const handleSave = () => {
    localStorage.setItem(ESCALATION_FLOWS_KEY, JSON.stringify(flows));
    setOrigFlows(JSON.parse(JSON.stringify(flows)));
    setHasChanges(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleResetAll = () => {
    if (!confirm("Reset all escalation flows to defaults?")) return;
    const reset = {};
    partyTypes.forEach((t) => { reset[t.name] = DEFAULT_DEPTS.map((dept) => ({ dept, engineerIds: [] })); });
    setFlows(reset);
  };

  const getStats = (typeName) => {
    const steps = getFlow(typeName);
    const emps  = loadEmployees();
    const warnings = steps.filter((s) => emps.filter((e) => e.department === s.dept).length === 0).length;
    const assigned  = steps.reduce((sum, s) => sum + (s.engineerIds?.length || 0), 0);
    return { count: steps.length, warnings, assigned };
  };

  // Tooltip content for escalation flows section
  const escalationTooltipContent = (
    <div className="flex flex-col gap-[0.4vw]">
      <p className="text-[0.72vw] font-bold text-white border-b border-slate-500 pb-[0.3vw] mb-[0.1vw]">How Escalation Works</p>
      <ul className="text-[0.65vw] text-slate-300 flex flex-col gap-[0.3vw]">
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Each customer type has its own escalation path</li>
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Tickets are assigned to L1 first, then L2, L3…</li>
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Pinning engineers: only those engineers are tried (round-robin)</li>
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Empty = auto-assign to least-busy in that department</li>
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Changes apply to new tickets only — existing tickets are unaffected</li>
        <li className="flex gap-[0.3vw]"><span className="text-blue-400 flex-shrink-0">•</span> Drag the grip handle to reorder levels</li>
      </ul>
    </div>
  );

  return (
    <div className="w-full max-h-[90vh] font-sans text-[0.85vw] overflow-y-auto pr-[0.4vw] ">

      {/* ── 1. Party Type Categories Section ─────────────────────────────────── */}
      <PartyTypesSection partyTypes={partyTypes} setPartyTypes={setPartyTypes} />

      {/* ── 2. Escalation Settings Section ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[0.6vw] shadow-sm mt-[1vw]">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-[1.2vw] py-[0.9vw] border-b border-slate-200 bg-gradient-to-r from-blue-50/60 to-white">
          <div className="flex items-center gap-[0.8vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
              <PhoneCall className="w-[1vw] h-[1vw] text-white" />
            </div>
            <div>
              <h2 className="text-[0.95vw] font-bold text-slate-900">Call Escalation Flows</h2>
              <p className="text-[0.72vw] text-slate-500 mt-[0.05vw]">
                Define per-level escalation paths and assign engineers for each customer type
              </p>
            </div>
            <HelpTooltip content={escalationTooltipContent} position="right" width="19vw" />
          </div>
          <div className="flex items-center gap-[0.8vw]">
            {hasChanges && (
              <span className="text-[0.72vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.6vw] py-[0.3vw] rounded-[0.3vw] font-medium flex items-center gap-[0.3vw]">
                <AlertTriangle className="w-[0.85vw] h-[0.85vw]" /> Unsaved
              </span>
            )}
            <button onClick={handleResetAll} className="flex items-center gap-[0.4vw] border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.78vw] font-medium transition-all duration-200">
              <RotateCcw className="w-[0.85vw] h-[0.85vw]" /> Reset All
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-[0.4vw] px-[1.2vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.82vw] font-semibold transition-all duration-200 shadow-sm ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            >
              {saved ? <CheckCircle className="w-[0.9vw] h-[0.9vw]" /> : <Save className="w-[0.9vw] h-[0.9vw]" />}
              {saved ? "Saved!" : "Save Flows"}
            </button>
          </div>
        </div>

        {/* Party type escalation cards */}
        <div className="p-[1.2vw] flex flex-col gap-[1vw]">
          {partyTypes.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-[0.6vw] p-[3vw] text-center">
              <Shield className="w-[3vw] h-[3vw] text-slate-300 mx-auto mb-[1vw]" />
              <p className="text-slate-400 text-[1vw]">No party types configured</p>
              <p className="text-slate-300 text-[0.8vw] mt-[0.3vw]">Add categories in the section above first</p>
            </div>
          ) : (
            partyTypes.map((type, tIdx) => {
              const color      = TYPE_COLORS[tIdx % TYPE_COLORS.length];
              const steps      = getFlow(type.name);
              const isExpanded = expandedType === type.id;
              const { count, warnings, assigned } = getStats(type.name);

              return (
                <div key={type.id} className={`bg-white border ${color.border} rounded-[0.6vw] shadow-sm overflow-visible transition-all duration-200 hover:shadow-md`}>
                  {/* Card header */}
                  <div
                    className={`flex items-center justify-between p-[1vw] cursor-pointer select-none ${color.headerBg} ${isExpanded ? `border-b ${color.border}` : ""} rounded-t-[0.6vw]`}
                    onClick={() => setExpandedType(isExpanded ? null : type.id)}
                  >
                    <div className="flex items-center gap-[0.8vw] flex-1 min-w-0">
                      <Shield className={`w-[1.2vw] h-[1.2vw] flex-shrink-0 ${color.accent}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[0.5vw] flex-wrap">
                          <span className={`text-[0.75vw] font-bold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] ${color.badge} shadow-sm`}>{type.name}</span>
                          <span className="text-[0.72vw] text-slate-500">{count} level{count !== 1 ? "s" : ""}</span>
                          {assigned > 0 && (
                            <span className="text-[0.62vw] text-blue-600 bg-blue-50 border border-blue-100 px-[0.4vw] py-[0.1vw] rounded-full flex items-center gap-[0.2vw]">
                              <UserCheck className="w-[0.65vw] h-[0.65vw]" /> {assigned} assigned
                            </span>
                          )}
                          {warnings > 0 && (
                            <span className="text-[0.62vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.4vw] py-[0.1vw] rounded-full flex items-center gap-[0.2vw]">
                              <AlertTriangle className="w-[0.62vw] h-[0.62vw]" /> {warnings} empty dept
                            </span>
                          )}
                        </div>
                        {!isExpanded && steps.length > 0 && (
                          <div className="flex items-center gap-[0.35vw] mt-[0.35vw] flex-wrap">
                            {steps.map((s, i) => (
                              <React.Fragment key={i}>
                                <span className={`text-[0.65vw] font-semibold border px-[0.4vw] py-[0.15vw] rounded-[0.25vw] ${LEVEL_BG_LIGHT[i] || "bg-slate-100 border-slate-200  text-slate-700"}`}>
                                  L{i + 1}: {s.dept}{s.engineerIds?.length > 0 && ` (${s.engineerIds.length})`}
                                </span>
                                {i < steps.length - 1 && <ArrowRight className="w-[0.75vw] h-[0.75vw] text-blue-300" />}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-[0.6vw] flex-shrink-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); resetType(type.name); }}
                        className="text-[0.68vw] text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-300 bg-white px-[0.5vw] py-[0.25vw] rounded-[0.3vw] cursor-pointer flex items-center gap-[0.25vw] transition-all duration-200">
                        <RotateCcw className="w-[0.65vw] h-[0.65vw]" /> Reset
                      </button>
                      {isExpanded ? <ChevronUp className="w-[1.1vw] h-[1.1vw] text-slate-400" /> : <ChevronDown className="w-[1.1vw] h-[1.1vw] text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="p-[1.2vw]">
                      <div className="grid grid-cols-5 gap-[1.5vw]">
                        <div className="col-span-3">
                          <p className="text-[0.72vw] text-slate-400 mb-[0.7vw] flex items-center gap-[0.3vw]">
                            <Settings className="w-[0.8vw] h-[0.8vw]" />
                            Drag to reorder · Select engineers per level · Leave empty for auto-assign
                          </p>
                          <FlowEditor steps={steps} departments={departments} onChange={(newSteps) => updateFlow(type.name, newSteps)} />
                        </div>
                        <div className="col-span-2 flex flex-col gap-[0.8vw]">
                          <ChainPreview steps={steps} />
                          {/* Legend with help tooltip */}
                          <div className="bg-slate-50/80 border border-slate-200 rounded-[0.5vw] p-[0.7vw]">
                            <div className="flex items-center justify-between mb-[0.4vw]">
                              <h4 className="text-[0.72vw] font-bold text-slate-600">Legend</h4>
                              <HelpTooltip
                                position="left"
                                width="16vw"
                                content={
                                  <div className="flex flex-col gap-[0.35vw]">
                                    <p className="text-[0.7vw] font-bold text-white border-b border-slate-500 pb-[0.25vw]">Assignment Logic</p>
                                    <p className="text-[0.65vw] text-slate-300 leading-relaxed">When a ticket is created, the system picks the first available engineer in L1. If none respond within the SLA window, it escalates to L2, and so on.</p>
                                    <p className="text-[0.65vw] text-slate-300 leading-relaxed mt-[0.2vw]">Pinned engineers are tried in round-robin order before the system falls back to auto-selection.</p>
                                  </div>
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-[0.3vw] text-[0.68vw] text-slate-500">
                              <div className="flex items-center gap-[0.35vw]"><UserCheck className="w-[0.75vw] h-[0.75vw] text-blue-500" /> Selected engineers tried first (round-robin)</div>
                              <div className="flex items-center gap-[0.35vw]"><Users       className="w-[0.75vw] h-[0.75vw] text-slate-400" /> Empty = auto (least busy in dept)</div>
                              <div className="flex items-center gap-[0.35vw]"><AlertTriangle className="w-[0.75vw] h-[0.75vw] text-amber-400" /> Warning = no engineers in that dept</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sticky save footer */}
        {hasChanges && (
          <div className="sticky bottom-0 bg-white border-t border-amber-200 p-[0.8vw] flex items-center justify-between shadow-lg">
            <span className="text-[0.78vw] text-amber-700 flex items-center gap-[0.4vw]">
              <AlertTriangle className="w-[0.9vw] h-[0.9vw]" />
              Unsaved — new tickets will use old escalation config until saved
            </span>
            <button onClick={handleSave} className="flex items-center gap-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white px-[1.5vw] py-[0.6vw] rounded-[0.4vw] font-semibold cursor-pointer text-[0.85vw] transition-all duration-200 shadow-sm">
              <Save className="w-[1vw] h-[1vw]" /> Save Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsPage;