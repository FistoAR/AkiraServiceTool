import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  AlertTriangle,
  Save,
  RotateCcw,
  Shield,
  Users,
  GripVertical,
  Info,
  CheckCircle,
  PhoneCall,
  UserCheck,
  Search,
  Tag,
  Edit2,
  Trash2,
  Check,
  Tags,
  HelpCircle,
  Columns,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";

// ── Storage Keys ──────────────────────────────────────────────────────────────
const PARTY_TYPES_KEY = "party_types_v3";
const EMPLOYEES_KEY = "employees";
const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
const CUSTOMER_DB_KEY = "customer_db_grouped_v5";
export const COLUMN_VIS_KEY = "customer_db_col_visibility_v1";

// ── Default dept flow ─────────────────────────────────────────────────────────
const DEFAULT_DEPTS = ["Support Engineer", "Service Engineer", "R&D"];

// ── Column definitions (shared with CustomerDatabase) ─────────────────────────
export const CUSTOMER_DB_COLUMNS = [
  {
    key: "partyType",
    label: "Party Type",
    required: false,
    description: "Customer category badge",
  },
  {
    key: "productSegment",
    label: "Product Segment",
    required: false,
    description: "Product line / segment",
  },
  {
    key: "partyCode",
    label: "Party Code",
    required: true,
    description: "Unique party identifier (always visible)",
  },
  {
    key: "partyDescription",
    label: "Party Description",
    required: true,
    description: "Company / party name (always visible)",
  },
  {
    key: "itemCode",
    label: "Item Code",
    required: true,
    description: "Unique item code (always visible)",
  },
  {
    key: "itemDescription",
    label: "Item Description",
    required: false,
    description: "Description of the product",
  },
  {
    key: "warrantyPeriodDays",
    label: "Warranty (days)",
    required: false,
    description: "Warranty duration in days",
  },
  {
    key: "state",
    label: "State",
    required: false,
    description: "State / province",
  },
  {
    key: "districtCity",
    label: "District / City",
    required: false,
    description: "District or city",
  },
];

export const DEFAULT_COL_VIS = Object.fromEntries(
  CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]),
);

export function loadColVisibility() {
  try {
    const s = JSON.parse(localStorage.getItem(COLUMN_VIS_KEY) || "{}");
    return { ...DEFAULT_COL_VIS, ...s };
  } catch {
    return { ...DEFAULT_COL_VIS };
  }
}

// ── Colors ────────────────────────────────────────────────────────────────────
const TYPE_BADGE_COLORS = [
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];
const TYPE_COLORS = [
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-600 text-white",
    accent: "text-purple-600",
    headerBg: "bg-gradient-to-r from-purple-50 to-slate-50",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-600 text-white",
    accent: "text-orange-600",
    headerBg: "bg-gradient-to-r from-orange-50 to-slate-50",
  },
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-600 text-white",
    accent: "text-blue-600",
    headerBg: "bg-gradient-to-r from-blue-50 to-slate-50",
  },
  {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-600 text-white",
    accent: "text-green-600",
    headerBg: "bg-gradient-to-r from-green-50 to-slate-50",
  },
  {
    bg: "bg-pink-50",
    border: "border-pink-200",
    badge: "bg-pink-600 text-white",
    accent: "text-pink-600",
    headerBg: "bg-gradient-to-r from-pink-50 to-slate-50",
  },
  {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-600 text-white",
    accent: "text-indigo-600",
    headerBg: "bg-gradient-to-r from-indigo-50 to-slate-50",
  },
];
const LEVEL_COLORS = [
  "bg-blue-500",
  "bg-blue-600",
  "bg-blue-700",
  "bg-blue-800",
  "bg-blue-900",
  "bg-slate-700",
];
const LEVEL_BG_LIGHT = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-blue-100/70 border-blue-200 text-blue-800",
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-blue-200/60 border-blue-300 text-blue-900",
  "bg-blue-200 border-blue-400 text-blue-900",
  "bg-slate-100 border-slate-300 text-slate-800",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadEmployees() {
  try {
    return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || "[]");
  } catch {
    return [];
  }
}
function loadCustomerDb() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_DB_KEY) || "[]");
  } catch {
    return [];
  }
}
function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// HelpTooltip
// ─────────────────────────────────────────────────────────────────────────────
const HelpTooltip = ({ content, position = "right", width = "16vw" }) => {
  const [visible, setVisible] = useState(false);
  const posMap = {
    right: "left-full top-1/2 -translate-y-1/2 ml-[0.6vw]",
    left: "right-full top-1/2 -translate-y-1/2 mr-[0.6vw]",
    top: "bottom-full left-1/2 -translate-x-1/2 mb-[0.6vw]",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-[0.6vw]",
  };
  const arrowMap = {
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-t-transparent border-b-transparent border-l-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-t-transparent border-b-transparent border-r-transparent",
    top: "top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-l-transparent border-r-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-l-transparent border-r-transparent border-t-transparent",
  };
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors duration-150 cursor-help"
      >
        <HelpCircle className="w-[1vw] h-[1vw]" />
      </button>
      {visible && (
        <div className={`absolute z-50 ${posMap[position]}`} style={{ width }}>
          <div
            className={`absolute w-0 h-0 border-[0.35vw] ${arrowMap[position]}`}
          />
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
// TAB BAR — wraps the three settings sections
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "categories", label: "Party Type Categories", icon: Tags },
  { id: "escalation", label: "Call Escalation Flows", icon: PhoneCall },
  { id: "columns", label: "Database Columns", icon: Columns },
];

// ─────────────────────────────────────────────────────────────────────────────
// PartyTypesSection
// ─────────────────────────────────────────────────────────────────────────────
const PartyTypesSection = ({ partyTypes, setPartyTypes }) => {
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const save = (types) => {
    setPartyTypes(types);
    localStorage.setItem(PARTY_TYPES_KEY, JSON.stringify(types));
  };

  const handleAdd = () => {
    const t = newTypeName.trim();
    if (!t) return;
    if (partyTypes.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      alert("Already exists!");
      return;
    }
    save([...partyTypes, { id: Date.now(), name: t }]);
    setNewTypeName("");
  };
  const handleUpdate = () => {
    if (!editingType?.name?.trim()) return;
    const t = editingType.name.trim();
    if (
      partyTypes.some(
        (x) =>
          x.id !== editingType.id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      alert("Already exists!");
      return;
    }
    const old = partyTypes.find((x) => x.id === editingType.id)?.name;
    save(
      partyTypes.map((x) => (x.id === editingType.id ? { ...x, name: t } : x)),
    );
    if (old && old !== t) {
      const db = loadCustomerDb();
      localStorage.setItem(
        CUSTOMER_DB_KEY,
        JSON.stringify(
          db.map((r) => (r.partyType === old ? { ...r, partyType: t } : r)),
        ),
      );
    }
    setEditingType(null);
  };
  const handleDelete = (id) => {
    if (partyTypes.length === 1) {
      alert("Cannot delete last!");
      return;
    }
    const type = partyTypes.find((t) => t.id === id);
    setConfirmDelete({
      type,
      usageCount: loadCustomerDb().filter((r) => r.partyType === type.name)
        .length,
    });
  };
  const confirmAndDelete = () => {
    const remaining = partyTypes.filter((t) => t.id !== confirmDelete.type.id);
    save(remaining);
    if (confirmDelete.usageCount > 0) {
      const db = loadCustomerDb();
      localStorage.setItem(
        CUSTOMER_DB_KEY,
        JSON.stringify(
          db.map((r) =>
            r.partyType === confirmDelete.type.name
              ? { ...r, partyType: remaining[0]?.name || "" }
              : r,
          ),
        ),
      );
    }
    setConfirmDelete(null);
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-slate-500 uppercase tracking-wide mb-[0.6vw]">
            Existing Categories
          </p>
          <div className="border border-slate-200 rounded-[0.5vw] max-h-[20vh] overflow-auto">
            {partyTypes.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No categories yet
              </div>
            ) : (
              partyTypes.map((type, idx) => {
                const badgeClass =
                  TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                const usageCount = loadCustomerDb().filter(
                  (r) => r.partyType === type.name,
                ).length;
                return (
                  <div
                    key={type.id}
                    className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-100 last:border-0 group transition-colors"
                  >
                    {editingType?.id === type.id ? (
                      <div className="flex flex-1 items-center gap-[0.5vw]">
                        <input
                          autoFocus
                          type="text"
                          value={editingType.name}
                          onChange={(e) =>
                            setEditingType({
                              ...editingType,
                              name: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate();
                            if (e.key === "Escape") setEditingType(null);
                          }}
                          className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none ring-2 ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={handleUpdate}
                          className="p-[0.4vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[0.3vw] cursor-pointer"
                        >
                          <Check className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingType(null)}
                          className="p-[0.4vw] bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-[0.3vw] cursor-pointer"
                        >
                          <X className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`text-[0.75vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${badgeClass}`}
                        >
                          {type.name}
                        </span>
                        <span className="text-[0.68vw] text-slate-400 flex-1">
                          {usageCount} record{usageCount !== 1 ? "s" : ""}
                        </span>
                        <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingType({ id: type.id, name: type.name })
                            }
                            className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(type.id)}
                            className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"
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
          {partyTypes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-[0.4vw] p-[0.7vw]">
              <p className="text-[0.68vw] font-semibold text-slate-500 mb-[0.5vw]">
                Preview
              </p>
              <div className="flex flex-wrap gap-[0.4vw]">
                {partyTypes.map((type, idx) => (
                  <span
                    key={type.id}
                    className={`text-[0.72vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length]}`}
                  >
                    {type.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmDelete && (
        <div className="mx-[1.2vw] mb-[1.2vw] bg-red-50 border border-red-200 rounded-[0.4vw] p-[0.8vw] flex items-center justify-between gap-[1vw]">
          <div>
            <p className="text-[0.82vw] font-bold text-red-700">
              Delete "{confirmDelete.type.name}"?
            </p>
            {confirmDelete.usageCount > 0 && (
              <p className="text-[0.72vw] text-red-600 mt-[0.1vw]">
                ⚠ {confirmDelete.usageCount} records will be reassigned.
              </p>
            )}
          </div>
          <div className="flex gap-[0.5vw] flex-shrink-0">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="px-[0.8vw] py-[0.4vw] border border-slate-300 bg-white rounded-[0.3vw] text-[0.78vw] cursor-pointer hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAndDelete}
              className="px-[0.8vw] py-[0.4vw] bg-red-600 hover:bg-red-700 text-white rounded-[0.3vw] text-[0.78vw] font-semibold cursor-pointer"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ColumnVisibilitySection
// ─────────────────────────────────────────────────────────────────────────────
const ColumnVisibilitySection = ({ colVis, setColVis }) => {
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    const col = CUSTOMER_DB_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    setColVis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const enableAll = () => {
    const all = Object.fromEntries(
      CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]),
    );
    setColVis(all);
  };

  const handleSave = () => {
    localStorage.setItem(COLUMN_VIS_KEY, JSON.stringify(colVis));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const visibleCount = Object.values(colVis).filter(Boolean).length;
  const totalCount = CUSTOMER_DB_COLUMNS.length;

  return (
    <div className="p-[1.2vw]">
      <div className="flex items-center justify-between mb-[1vw]">
        <div>
          <p className="text-[0.78vw] text-slate-500">
            Toggle which columns appear in the Customer Database table. Required
            columns cannot be hidden.
          </p>
          <p className="text-[0.72vw] text-blue-600 mt-[0.2vw] font-medium">
            {visibleCount} of {totalCount} columns visible
          </p>
        </div>
        <div className="flex items-center gap-[0.6vw]">
          <button
            type="button"
            onClick={enableAll}
            className="flex items-center gap-[0.35vw] border border-slate-200 text-slate-600 hover:bg-slate-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.78vw] transition-all"
          >
            <Eye className="w-[0.85vw] h-[0.85vw]" /> Show All
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-[0.4vw] px-[1.2vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.82vw] font-semibold transition-all shadow-sm ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {saved ? (
              <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
            ) : (
              <Save className="w-[0.9vw] h-[0.9vw]" />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[0.7vw]">
        {CUSTOMER_DB_COLUMNS.map((col) => {
          const isOn = colVis[col.key] ?? true;
          const isRequired = col.required;
          return (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              className={`flex items-center justify-between px-[0.9vw] py-[0.7vw] rounded-[0.5vw] border transition-all cursor-pointer select-none
                ${
                  isRequired
                    ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200"
                    : isOn
                      ? "bg-blue-50 border-blue-200 hover:border-blue-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                }`}
            >
              <div className="flex flex-col gap-[0.1vw] flex-1 min-w-0">
                <div className="flex items-center gap-[0.35vw]">
                  <span
                    className={`text-[0.8vw] font-semibold truncate ${isOn ? "text-slate-800" : "text-slate-400"}`}
                  >
                    {col.label}
                  </span>
                  {isRequired && (
                    <span className="text-[0.58vw] bg-slate-200 text-slate-500 px-[0.35vw] py-[0.05vw] rounded font-semibold flex-shrink-0">
                      required
                    </span>
                  )}
                </div>
                <span className="text-[0.65vw] text-slate-400 truncate">
                  {col.description}
                </span>
              </div>
              <div className="flex-shrink-0 ml-[0.6vw]">
                {isRequired ? (
                  <div className="w-[2.2vw] h-[1.2vw] rounded-full bg-slate-300 flex items-center justify-end px-[0.15vw]">
                    <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-white shadow-sm" />
                  </div>
                ) : isOn ? (
                  <div className="w-[2.2vw] h-[1.2vw] rounded-full bg-blue-500 flex items-center justify-end px-[0.15vw] transition-all">
                    <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-white shadow-sm" />
                  </div>
                ) : (
                  <div className="w-[2.2vw] h-[1.2vw] rounded-full bg-slate-200 flex items-center justify-start px-[0.15vw] transition-all">
                    <div className="w-[0.9vw] h-[0.9vw] rounded-full bg-white shadow-sm" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live preview strip */}
      <div className="mt-[1vw] bg-slate-50 border border-slate-200 rounded-[0.4vw] p-[0.7vw]">
        <p className="text-[0.68vw] font-semibold text-slate-500 mb-[0.4vw]">
          Table Header Preview
        </p>
        <div className="flex items-center gap-[0.4vw] flex-wrap">
          <span className="text-[0.65vw] bg-slate-200 text-slate-600 px-[0.5vw] py-[0.2vw] rounded font-mono">
            ☑
          </span>
          <span className="text-[0.65vw] bg-slate-200 text-slate-600 px-[0.5vw] py-[0.2vw] rounded font-mono">
            S.No
          </span>
          {CUSTOMER_DB_COLUMNS.filter((c) => colVis[c.key] ?? true).map((c) => (
            <span
              key={c.key}
              className="text-[0.65vw] bg-blue-100 text-blue-700 border border-blue-200 px-[0.5vw] py-[0.2vw] rounded font-semibold"
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EngineerPicker
// ─────────────────────────────────────────────────────────────────────────────
const EngineerPicker = ({ dept, selectedIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allEmps = loadEmployees();
  const deptEngs = allEmps.filter((e) => e.department === dept);
  const filtered = deptEngs.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.userId || "").toLowerCase().includes(search.toLowerCase()),
  );
  const selectedEngs = deptEngs.filter((e) => selectedIds.includes(e.userId));
  const toggle = (id) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  return (
    <div className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`min-h-[2.2vw] border rounded-[0.4vw] px-[0.6vw] py-[0.35vw] bg-white cursor-pointer flex items-center gap-[0.35vw] flex-wrap transition-all duration-200 ${open ? "border-blue-400 ring-2 ring-blue-100 shadow-sm" : "border-slate-200 hover:border-blue-300"}`}
      >
        {selectedEngs.length === 0 ? (
          <span className="text-slate-400 text-[0.72vw] italic select-none flex-1">
            {deptEngs.length === 0
              ? "⚠ No engineers in this department"
              : "Auto-assign (least busy)"}
          </span>
        ) : (
          selectedEngs.map((eng) => (
            <span
              key={eng.userId}
              className="flex items-center gap-[0.25vw] bg-blue-50 text-blue-700 border border-blue-200 rounded-full pl-[0.25vw] pr-[0.45vw] py-[0.1vw] text-[0.68vw] font-semibold"
            >
              <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.5vw] font-bold flex-shrink-0">
                {initials(eng.name)}
              </span>
              {eng.name}
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggle(eng.userId);
                }}
                className="hover:text-red-400 cursor-pointer ml-[0.05vw]"
              >
                <X className="w-[0.7vw] h-[0.7vw]" />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={`w-[0.85vw] h-[0.85vw] text-slate-400 ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 w-full mt-[0.3vw] bg-white border border-slate-200 rounded-[0.4vw] shadow-lg z-40 overflow-hidden">
          {deptEngs.length > 3 && (
            <div className="p-[0.5vw] border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-[0.5vw] top-1/2 -translate-y-1/2 w-[0.85vw] h-[0.85vw] text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search engineer..."
                  className="w-full pl-[1.8vw] pr-[0.5vw] py-[0.4vw] text-[0.78vw] border border-slate-200 rounded-[0.3vw] outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}
          {deptEngs.length > 0 && (
            <div className="flex gap-[0.5vw] px-[0.7vw] py-[0.4vw] border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => onChange(deptEngs.map((e) => e.userId))}
                className="text-[0.7vw] text-blue-600 hover:underline cursor-pointer font-semibold"
              >
                Select all
              </button>
              <span className="text-slate-300 text-[0.7vw]">|</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[0.7vw] text-slate-500 hover:underline cursor-pointer"
              >
                Clear (auto)
              </button>
            </div>
          )}
          <div className="max-h-[13vw] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-[1vw] text-center text-slate-400 text-[0.75vw]">
                {deptEngs.length === 0
                  ? `No engineers in "${dept}"`
                  : "No results"}
              </div>
            ) : (
              filtered.map((eng) => {
                const selected = selectedIds.includes(eng.userId);
                return (
                  <div
                    key={eng.userId}
                    onClick={() => toggle(eng.userId)}
                    className={`flex items-center gap-[0.6vw] px-[0.7vw] py-[0.55vw] cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${selected ? "bg-blue-50/70" : "hover:bg-slate-50"}`}
                  >
                    <div
                      className={`w-[1vw] h-[1vw] rounded-[0.2vw] border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}
                    >
                      {selected && (
                        <CheckCircle className="w-[0.65vw] h-[0.65vw] text-white" />
                      )}
                    </div>
                    <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[0.6vw] font-bold">
                        {initials(eng.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8vw] font-semibold text-slate-700 truncate">
                        {eng.name}
                      </div>
                      <div className="text-[0.67vw] text-slate-400 font-mono">
                        {eng.userId}
                      </div>
                    </div>
                    {selected && (
                      <CheckCircle className="w-[0.9vw] h-[0.9vw] text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="px-[0.7vw] py-[0.5vw] border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-[0.68vw] text-slate-400">
              {selectedIds.length === 0
                ? "Auto-assign (load balanced)"
                : `${selectedIds.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[0.7vw] bg-blue-600 text-white px-[0.7vw] py-[0.3vw] rounded-[0.3vw] cursor-pointer font-semibold hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DurationPicker — hours + minutes selector for escalation SLA
// ─────────────────────────────────────────────────────────────────────────────
const DURATION_PRESETS = [
  { label: "30 min", hours: 0, mins: 30 },
  { label: "1 hr", hours: 1, mins: 0 },
  { label: "2 hr", hours: 2, mins: 0 },
  { label: "4 hr", hours: 4, mins: 0 },
  { label: "8 hr", hours: 8, mins: 0 },
  { label: "1 day", hours: 24, mins: 0 },
];

const DurationPicker = ({ hours = 0, mins = 0, onChange }) => {
  const total = hours * 60 + mins;
  const fmt = () => {
    if (hours === 0 && mins === 0) return "No limit";
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return hours === 24 ? "1 day" : `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  return (
    <div className="flex items-center gap-[0.5vw]">
      <Clock className="w-[0.85vw] h-[0.85vw] text-slate-400 flex-shrink-0" />
      <div className="flex items-center gap-[0.3vw]">
        <span className="text-[0.7vw] text-slate-500">Escalate after:</span>
        <select
          value={hours}
          onChange={(e) => onChange(Number(e.target.value), mins)}
          className="border border-slate-200 rounded-[0.3vw] px-[0.4vw] py-[0.25vw] text-[0.75vw] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-pointer"
        >
          {[0, 1, 2, 3, 4, 6, 8, 12, 24, 48].map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </select>
        <select
          value={mins}
          onChange={(e) => onChange(hours, Number(e.target.value))}
          className="border border-slate-200 rounded-[0.3vw] px-[0.4vw] py-[0.25vw] text-[0.75vw] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-pointer"
        >
          {[0, 15, 30, 45].map((m) => (
            <option key={m} value={m}>
              {m}m
            </option>
          ))}
        </select>
      </div>
      {/* Quick presets */}
      <div className="flex gap-[0.25vw]">
        {DURATION_PRESETS.map((p) => {
          const isActive = p.hours === hours && p.mins === mins;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.hours, p.mins)}
              className={`text-[0.62vw] px-[0.45vw] py-[0.18vw] rounded-[0.25vw] border cursor-pointer transition-all ${isActive ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {total > 0 && (
        <button
          type="button"
          onClick={() => onChange(0, 0)}
          className="text-[0.62vw] text-slate-400 hover:text-red-400 cursor-pointer"
          title="Clear (no limit)"
        >
          <X className="w-[0.7vw] h-[0.7vw]" />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StepCard — now with duration
// ─────────────────────────────────────────────────────────────────────────────
const StepCard = ({
  step,
  index,
  total,
  availableToSwitch,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragOver,
}) => {
  const deptEngs = loadEmployees().filter((e) => e.department === step.dept);
  const hasWarning = deptEngs.length === 0;
  const durHours = step.durationHours ?? 2;
  const durMins = step.durationMins ?? 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`border rounded-[0.5vw] bg-white overflow-visible transition-all duration-200 ${isDragOver ? "border-blue-400 shadow-md ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200 shadow-sm"}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-[0.5vw] px-[0.7vw] py-[0.45vw] bg-slate-50/70 border-b border-slate-100">
        <GripVertical className="w-[1vw] h-[1vw] text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0 hover:text-slate-400" />
        <div
          className={`w-[1.6vw] h-[1.6vw] rounded-full ${LEVEL_COLORS[index] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}
        >
          <span className="text-white text-[0.58vw] font-bold">
            L{index + 1}
          </span>
        </div>
        <select
          value={step.dept}
          onChange={(e) =>
            onUpdate({ ...step, dept: e.target.value, engineerIds: [] })
          }
          className="flex-1 border border-slate-200 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.8vw] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-pointer"
        >
          <option value={step.dept}>{step.dept}</option>
          {availableToSwitch.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {hasWarning && (
          <span className="text-[0.62vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.4vw] py-[0.1vw] rounded-full flex items-center gap-[0.2vw] whitespace-nowrap">
            <AlertTriangle className="w-[0.65vw] h-[0.65vw]" /> 0 engineers
          </span>
        )}
        <div className="flex flex-col gap-[0.05vw] flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-slate-300 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-[0.85vw] h-[0.85vw]" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-slate-300 hover:text-blue-500 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-[0.85vw] h-[0.85vw]" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-300 hover:text-red-400 cursor-pointer flex-shrink-0"
        >
          <X className="w-[1vw] h-[1vw]" />
        </button>
      </div>

      {/* Engineers row */}
      <div className="px-[0.8vw] py-[0.5vw] flex items-start gap-[0.5vw] border-b border-slate-100">
        <div className="text-[0.7vw] text-slate-500 font-semibold whitespace-nowrap mt-[0.55vw] flex-shrink-0 flex items-center gap-[0.25vw] w-[4.5vw]">
          <Users className="w-[0.8vw] h-[0.8vw]" /> Engineers
        </div>
        <div className="flex-1">
          <EngineerPicker
            dept={step.dept}
            selectedIds={step.engineerIds || []}
            onChange={(ids) => onUpdate({ ...step, engineerIds: ids })}
          />
          {step.engineerIds?.length === 0 && deptEngs.length > 0 && (
            <p className="text-[0.64vw] text-slate-400 mt-[0.2vw] flex items-center gap-[0.25vw]">
              <Info className="w-[0.65vw] h-[0.65vw]" /> Auto-assign (least-busy
              from {deptEngs.length})
            </p>
          )}
        </div>
      </div>

      {/* Duration / SLA row */}
      <div className="px-[0.8vw] py-[0.45vw] bg-slate-50/40">
        <DurationPicker
          hours={durHours}
          mins={durMins}
          onChange={(h, m) =>
            onUpdate({ ...step, durationHours: h, durationMins: m })
          }
        />
        {durHours === 0 && durMins === 0 && (
          <p className="text-[0.62vw] text-slate-400 mt-[0.15vw] flex items-center gap-[0.2vw]">
            <Info className="w-[0.6vw] h-[0.6vw]" /> No auto-escalation — ticket
            stays at this level until manually escalated
          </p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FlowEditor
// ─────────────────────────────────────────────────────────────────────────────
const FlowEditor = ({ steps, departments, onChange }) => {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const usedDepts = steps.map((s) => s.dept);
  const availableToAdd = departments.filter((d) => !usedDepts.includes(d));
  const availableToSwitch = (cur) =>
    departments.filter((d) => d === cur || !usedDepts.includes(d));
  const updateStep = (i, u) =>
    onChange(steps.map((s, idx) => (idx === i ? u : s)));
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => {
    const f = [...steps],
      j = i + dir;
    if (j < 0 || j >= f.length) return;
    [f[i], f[j]] = [f[j], f[i]];
    onChange(f);
  };
  const addStep = (dept) => {
    onChange([
      ...steps,
      { dept, engineerIds: [], durationHours: 2, durationMins: 0 },
    ]);
    setShowPicker(false);
  };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      const f = [...steps];
      const [r] = f.splice(dragIdx, 1);
      f.splice(dragOver, 0, r);
      onChange(f);
    }
    setDragIdx(null);
    setDragOver(null);
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
            step={step}
            index={i}
            total={steps.length}
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
          className="w-full flex items-center justify-center gap-[0.4vw] border-2 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:border-blue-300 rounded-[0.4vw] py-[0.6vw] text-[0.78vw] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Escalation Level
        </button>
        {showPicker && (
          <div className="absolute top-full left-0 w-full mt-[0.3vw] bg-white border border-slate-200 shadow-lg rounded-[0.4vw] z-20 overflow-hidden">
            {availableToAdd.map((dept) => {
              const cnt = loadEmployees().filter(
                (e) => e.department === dept,
              ).length;
              return (
                <div
                  key={dept}
                  onClick={() => addStep(dept)}
                  className="flex items-center justify-between px-[0.8vw] py-[0.65vw] hover:bg-blue-50/60 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <span className="text-[0.82vw] font-semibold text-slate-700">
                    {dept}
                  </span>
                  <span
                    className={`text-[0.62vw] px-[0.45vw] py-[0.12vw] rounded-full font-semibold ${cnt === 0 ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-500"}`}
                  >
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
// ChainPreview — now shows duration badges
// ─────────────────────────────────────────────────────────────────────────────
const ChainPreview = ({ steps }) => {
  const employees = loadEmployees();
  const fmtDur = (h, m) => {
    if (!h && !m) return null;
    if (h === 0) return `${m}m`;
    if (m === 0) return h === 24 ? "1 day" : `${h}h`;
    return `${h}h ${m}m`;
  };
  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-[0.5vw] p-[0.8vw]">
      <h4 className="text-[0.78vw] font-bold text-slate-700 mb-[0.6vw] flex items-center gap-[0.3vw]">
        <ArrowRight className="w-[0.85vw] h-[0.85vw] text-blue-500" />{" "}
        Escalation Chain Preview
      </h4>
      {steps.length === 0 ? (
        <span className="text-[0.72vw] text-slate-400 italic">
          No levels configured
        </span>
      ) : (
        <div className="flex flex-col gap-[0.5vw]">
          {steps.map((step, i) => {
            const deptEngs = employees.filter(
              (e) => e.department === step.dept,
            );
            const selEngs = deptEngs.filter((e) =>
              step.engineerIds?.includes(e.userId),
            );
            const dur = fmtDur(step.durationHours ?? 2, step.durationMins ?? 0);
            return (
              <div key={i} className="flex items-start gap-[0.5vw]">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-[1.5vw] h-[1.5vw] rounded-full ${LEVEL_COLORS[i] || "bg-slate-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <span className="text-white text-[0.52vw] font-bold">
                      L{i + 1}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="w-[0.12vw] h-[0.4vw] bg-blue-200" />
                      {dur && (
                        <span className="text-[0.52vw] text-blue-500 bg-blue-50 border border-blue-100 px-[0.3vw] py-[0.05vw] rounded-full font-semibold">
                          {dur}
                        </span>
                      )}
                      <div className="w-[0.12vw] h-[0.4vw] bg-blue-200" />
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-white rounded-[0.3vw] border border-slate-200 px-[0.55vw] py-[0.3vw]">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.75vw] font-bold text-slate-700">
                      {step.dept}
                    </div>
                    {dur && (
                      <span className="text-[0.58vw] text-amber-600 bg-amber-50 border border-amber-100 px-[0.35vw] py-[0.05vw] rounded flex items-center gap-[0.2vw]">
                        <Clock className="w-[0.55vw] h-[0.55vw]" /> {dur}
                      </span>
                    )}
                  </div>
                  {selEngs.length > 0 ? (
                    <div className="flex gap-[0.25vw] flex-wrap mt-[0.2vw]">
                      {selEngs.map((eng) => (
                        <span
                          key={eng.userId}
                          className="flex items-center gap-[0.2vw] text-[0.62vw] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-[0.4vw] py-[0.05vw]"
                        >
                          <span className="w-[1vw] h-[1vw] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.45vw] font-bold">
                            {initials(eng.name)}
                          </span>
                          {eng.name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[0.62vw] text-slate-400 italic">
                      {deptEngs.length === 0
                        ? "⚠ No engineers"
                        : `Auto from ${deptEngs.length}`}
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
            <span className="text-[0.67vw] text-slate-400 italic">
              Resolved / Closed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EscalationSection
// ─────────────────────────────────────────────────────────────────────────────
const EscalationSection = ({ partyTypes, flows, setFlows, departments }) => {
  const [expandedType, setExpandedType] = useState(null);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [origFlows, setOrigFlows] = useState({});

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(ESCALATION_FLOWS_KEY) || "{}");
      setOrigFlows(JSON.parse(JSON.stringify(s)));
    } catch {}
  }, []);
  useEffect(() => {
    setHasChanges(JSON.stringify(flows) !== JSON.stringify(origFlows));
  }, [flows, origFlows]);

  const getFlow = (name) =>
    flows[name] ??
    DEFAULT_DEPTS.map((dept) => ({
      dept,
      engineerIds: [],
      durationHours: 2,
      durationMins: 0,
    }));
  const updateFlow = (name, steps) =>
    setFlows((prev) => ({ ...prev, [name]: steps }));
  const resetType = (name) =>
    setFlows((prev) => ({
      ...prev,
      [name]: DEFAULT_DEPTS.map((dept) => ({
        dept,
        engineerIds: [],
        durationHours: 2,
        durationMins: 0,
      })),
    }));

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
    partyTypes.forEach((t) => {
      reset[t.name] = DEFAULT_DEPTS.map((dept) => ({
        dept,
        engineerIds: [],
        durationHours: 2,
        durationMins: 0,
      }));
    });
    setFlows(reset);
  };
  const getStats = (name) => {
    const steps = getFlow(name);
    const emps = loadEmployees();
    return {
      count: steps.length,
      warnings: steps.filter(
        (s) => emps.filter((e) => e.department === s.dept).length === 0,
      ).length,
      assigned: steps.reduce((sum, s) => sum + (s.engineerIds?.length || 0), 0),
    };
  };

  return (
    <div>
      <div className="flex items-center justify-between px-[1.2vw] py-[0.7vw] border-b border-slate-100">
        <div className="flex items-center gap-[0.6vw]">
          {hasChanges && (
            <span className="text-[0.72vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.6vw] py-[0.3vw] rounded-[0.3vw] font-medium flex items-center gap-[0.3vw]">
              <AlertTriangle className="w-[0.85vw] h-[0.85vw]" /> Unsaved
              changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-[0.6vw]">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-[0.4vw] border border-slate-200 text-slate-600 hover:bg-slate-50 px-[0.8vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.78vw] font-medium transition-all"
          >
            <RotateCcw className="w-[0.85vw] h-[0.85vw]" /> Reset All
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-[0.4vw] px-[1.2vw] py-[0.4vw] rounded-[0.4vw] cursor-pointer text-[0.82vw] font-semibold transition-all shadow-sm ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {saved ? (
              <CheckCircle className="w-[0.9vw] h-[0.9vw]" />
            ) : (
              <Save className="w-[0.9vw] h-[0.9vw]" />
            )}
            {saved ? "Saved!" : "Save Flows"}
          </button>
        </div>
      </div>

      <div className="p-[1.2vw] flex flex-col gap-[1vw]">
        {partyTypes.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-[0.6vw] p-[3vw] text-center">
            <Shield className="w-[3vw] h-[3vw] text-slate-300 mx-auto mb-[1vw]" />
            <p className="text-slate-400 text-[1vw]">
              No party types configured
            </p>
            <p className="text-slate-300 text-[0.8vw] mt-[0.3vw]">
              Add categories in the Party Types tab first
            </p>
          </div>
        ) : (
          partyTypes.map((type, tIdx) => {
            const color = TYPE_COLORS[tIdx % TYPE_COLORS.length];
            const steps = getFlow(type.name);
            const isExpanded = expandedType === type.id;
            const { count, warnings, assigned } = getStats(type.name);
            return (
              <div
                key={type.id}
                className={`bg-white border ${color.border} rounded-[0.6vw] shadow-sm overflow-visible transition-all hover:shadow-md`}
              >
                <div
                  className={`flex items-center justify-between p-[1vw] cursor-pointer select-none ${color.headerBg} ${isExpanded ? `border-b ${color.border}` : ""} rounded-t-[0.6vw]`}
                  onClick={() => setExpandedType(isExpanded ? null : type.id)}
                >
                  <div className="flex items-center gap-[0.8vw] flex-1 min-w-0">
                    <Shield
                      className={`w-[1.2vw] h-[1.2vw] flex-shrink-0 ${color.accent}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[0.5vw] flex-wrap">
                        <span
                          className={`text-[0.75vw] font-bold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] ${color.badge} shadow-sm`}
                        >
                          {type.name}
                        </span>
                        <span className="text-[0.72vw] text-slate-500">
                          {count} level{count !== 1 ? "s" : ""}
                        </span>
                        {assigned > 0 && (
                          <span className="text-[0.62vw] text-blue-600 bg-blue-50 border border-blue-100 px-[0.4vw] py-[0.1vw] rounded-full flex items-center gap-[0.2vw]">
                            <UserCheck className="w-[0.65vw] h-[0.65vw]" />{" "}
                            {assigned} assigned
                          </span>
                        )}
                        {warnings > 0 && (
                          <span className="text-[0.62vw] text-amber-700 bg-amber-50 border border-amber-200 px-[0.4vw] py-[0.1vw] rounded-full flex items-center gap-[0.2vw]">
                            <AlertTriangle className="w-[0.62vw] h-[0.62vw]" />{" "}
                            {warnings} empty dept
                          </span>
                        )}
                      </div>
                      {!isExpanded && steps.length > 0 && (
                        <div className="flex items-center gap-[0.35vw] mt-[0.35vw] flex-wrap">
                          {steps.map((s, i) => {
                            const dur =
                              (s.durationHours || 0) * 60 +
                              (s.durationMins || 0);
                            return (
                              <React.Fragment key={i}>
                                <span
                                  className={`text-[0.65vw] font-semibold border px-[0.4vw] py-[0.15vw] rounded-[0.25vw] ${LEVEL_BG_LIGHT[i] || "bg-slate-100 border-slate-200 text-slate-700"}`}
                                >
                                  L{i + 1}: {s.dept}
                                  {s.engineerIds?.length > 0
                                    ? ` (${s.engineerIds.length})`
                                    : ""}
                                  {dur > 0
                                    ? ` · ${dur < 60 ? dur + "m" : Math.floor(dur / 60) + "h"}`
                                    : ""}
                                </span>
                                {i < steps.length - 1 && (
                                  <ArrowRight className="w-[0.75vw] h-[0.75vw] text-blue-300" />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-[0.6vw] flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetType(type.name);
                      }}
                      className="text-[0.68vw] text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-300 bg-white px-[0.5vw] py-[0.25vw] rounded-[0.3vw] cursor-pointer flex items-center gap-[0.25vw] transition-all"
                    >
                      <RotateCcw className="w-[0.65vw] h-[0.65vw]" /> Reset
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-[1.1vw] h-[1.1vw] text-slate-400" />
                    ) : (
                      <ChevronDown className="w-[1.1vw] h-[1.1vw] text-slate-400" />
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-[1.2vw]">
                    <div className="grid grid-cols-5 gap-[1.5vw]">
                      <div className="col-span-3">
                        <p className="text-[0.72vw] text-slate-400 mb-[0.7vw] flex items-center gap-[0.3vw]">
                          <Settings className="w-[0.8vw] h-[0.8vw]" /> Drag to
                          reorder · Assign engineers · Set SLA escalation time
                          per level
                        </p>
                        <FlowEditor
                          steps={steps}
                          departments={departments}
                          onChange={(s) => updateFlow(type.name, s)}
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-[0.8vw]">
                        <ChainPreview steps={steps} />
                        <div className="bg-slate-50/80 border border-slate-200 rounded-[0.5vw] p-[0.7vw]">
                          <h4 className="text-[0.72vw] font-bold text-slate-600 mb-[0.4vw]">
                            Legend
                          </h4>
                          <div className="flex flex-col gap-[0.3vw] text-[0.68vw] text-slate-500">
                            <div className="flex items-center gap-[0.35vw]">
                              <UserCheck className="w-[0.75vw] h-[0.75vw] text-blue-500" />{" "}
                              Selected engineers tried first (round-robin)
                            </div>
                            <div className="flex items-center gap-[0.35vw]">
                              <Users className="w-[0.75vw] h-[0.75vw] text-slate-400" />{" "}
                              Empty = auto (least busy in dept)
                            </div>
                            <div className="flex items-center gap-[0.35vw]">
                              <Clock className="w-[0.75vw] h-[0.75vw] text-amber-400" />{" "}
                              Duration = SLA before auto-escalating to next
                              level
                            </div>
                            <div className="flex items-center gap-[0.35vw]">
                              <AlertTriangle className="w-[0.75vw] h-[0.75vw] text-amber-400" />{" "}
                              Warning = no engineers in that dept
                            </div>
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

      {hasChanges && (
        <div className="sticky bottom-0 bg-white border-t border-amber-200 p-[0.8vw] flex items-center justify-between shadow-lg">
          <span className="text-[0.78vw] text-amber-700 flex items-center gap-[0.4vw]">
            <AlertTriangle className="w-[0.9vw] h-[0.9vw]" /> Unsaved — new
            tickets will use old config until saved
          </span>
          <button
            onClick={handleSave}
            className="flex items-center gap-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white px-[1.5vw] py-[0.6vw] rounded-[0.4vw] font-semibold cursor-pointer text-[0.85vw] transition-all shadow-sm"
          >
            <Save className="w-[1vw] h-[1vw]" /> Save Now
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SystemSettingsPage
// ─────────────────────────────────────────────────────────────────────────────
const SystemSettingsPage = () => {
  const [activeTab, setActiveTab] = useState("categories");
  const [partyTypes, setPartyTypes] = useState([]);
  const [flows, setFlows] = useState({});
  const [departments, setDepartments] = useState([]);
  const [colVis, setColVis] = useState({ ...DEFAULT_COL_VIS });

  useEffect(() => {
    try {
      const pt = JSON.parse(localStorage.getItem(PARTY_TYPES_KEY) || "[]");
      setPartyTypes(
        pt.length
          ? pt
          : [
              { id: 1, name: "OEM" },
              { id: 2, name: "End Customer" },
            ],
      );
    } catch {
      setPartyTypes([
        { id: 1, name: "OEM" },
        { id: 2, name: "End Customer" },
      ]);
    }
    try {
      const emps = JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || "[]");
      const depts = [...new Set(emps.map((e) => e.department).filter(Boolean))];
      setDepartments([...new Set([...DEFAULT_DEPTS, ...depts])]);
    } catch {
      setDepartments([...DEFAULT_DEPTS]);
    }
    try {
      const s = JSON.parse(localStorage.getItem(ESCALATION_FLOWS_KEY) || "{}");
      setFlows(s);
    } catch {
      setFlows({});
    }
    setColVis(loadColVisibility());
  }, []);

  const TAB_ICONS = {
    categories: Tags,
    escalation: PhoneCall,
    columns: Columns,
  };

  return (
    <div className="w-full max-h-[90vh] font-sans text-[0.85vw] overflow-y-auto pr-[0.4vw]">
      {/* Tab bar */}
      <div className="bg-white border border-slate-200 rounded-[0.6vw] shadow-sm mb-[1vw] overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-[0.5vw] px-[1.2vw] py-[0.8vw] text-[0.82vw] font-semibold cursor-pointer transition-all border-b-2 ${isActive ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
              >
                <Icon className="w-[1vw] h-[1vw]" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Categories ── */}
        {activeTab === "categories" && (
          <div>
            <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                <Tags className="w-[0.9vw] h-[0.9vw] text-white" />
              </div>
              <div>
                <h2 className="text-[0.9vw] font-bold text-slate-900">
                  Party Type Categories
                </h2>
                <p className="text-[0.7vw] text-slate-500">
                  Manage customer categories used across the system
                </p>
              </div>
              <div className="ml-auto text-[0.72vw] text-gray-700 bg-blue-100 px-[0.6vw] py-[0.25vw] rounded-full">
                {partyTypes.length} categories
              </div>
            </div>
            <PartyTypesSection
              partyTypes={partyTypes}
              setPartyTypes={setPartyTypes}
            />
          </div>
        )}

        {/* ── Tab: Escalation ── */}
        {activeTab === "escalation" && (
          <div>
            <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white">
              <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                <PhoneCall className="w-[0.9vw] h-[0.9vw] text-white" />
              </div>
              <div>
                <h2 className="text-[0.9vw] font-bold text-slate-900">
                  Call Escalation Flows
                </h2>
                <p className="text-[0.7vw] text-slate-500">
                  Define per-level escalation paths, engineers & SLA durations
                </p>
              </div>
            </div>
            <EscalationSection
              partyTypes={partyTypes}
              flows={flows}
              setFlows={setFlows}
              departments={departments}
            />
          </div>
        )}

        {/* ── Tab: Columns ── */}
        {activeTab === "columns" && (
          <div>
            <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[0.7vw] border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white">
              <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                <Columns className="w-[0.9vw] h-[0.9vw] text-white" />
              </div>
              <div>
                <h2 className="text-[0.9vw] font-bold text-slate-900">
                  Database Column Visibility
                </h2>
                <p className="text-[0.7vw] text-slate-500">
                  Show or hide columns in the Customer Database table
                </p>
              </div>
            </div>
            <ColumnVisibilitySection colVis={colVis} setColVis={setColVis} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsPage;
