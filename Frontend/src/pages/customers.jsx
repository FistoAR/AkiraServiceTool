import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  UploadCloud,
  Plus,
  FileSpreadsheet,
  X,
  Check,
  Filter,
  Trash2,
  Save,
  FileWarning,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  PlusCircle,
  MinusCircle,
  Settings,
  Edit2,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "customer_db_grouped_v5";
const PARTY_TYPES_KEY = "party_types_v3";
const COLUMN_VIS_KEY = "customer_db_col_visibility_v1";
const ITEMS_PER_PAGE = 10;

// ── Column definitions (must match SystemSettingsPage) ────────────────────────
const CUSTOMER_DB_COLUMNS = [
  { key: "partyType", label: "Party Type" },
  { key: "productSegment", label: "Product Segment" },
  { key: "partyCode", label: "Party Code", required: true },
  { key: "partyDescription", label: "Party Description", required: true },
  { key: "itemCode", label: "Item Code", required: true },
  { key: "itemDescription", label: "Item Description" },
  { key: "warrantyPeriodDays", label: "Warranty (days)" },
  { key: "state", label: "State" },
  { key: "districtCity", label: "District/City" },
];

function loadColVisibility() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMN_VIS_KEY) || "{}");
    const def = Object.fromEntries(
      CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]),
    );
    return { ...def, ...stored };
  } catch {
    return Object.fromEntries(CUSTOMER_DB_COLUMNS.map((c) => [c.key, true]));
  }
}

// Columns that use rowSpan (grouped per party)
const ROW_SPAN_COLS = new Set([
  "partyType",
  "partyCode",
  "partyDescription",
  "state",
  "districtCity",
]);

const CustomerDatabase = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [partyTypes, setPartyTypes] = useState([]);
  const [colVis, setColVis] = useState(loadColVisibility());

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResult, setValidationResult] = useState({
    total: 0,
    valid: 0,
    duplicates: 0,
    errors: 0,
    validRows: [],
    issues: [],
  });
  const [newEntry, setNewEntry] = useState({
    partyCode: "",
    partyDescription: "",
    partyType: "",
    state: "",
    districtCity: "",
    items: [
      {
        productSegment: "",
        itemCode: "",
        itemDescription: "",
        warrantyPeriodDays: "",
      },
    ],
  });
  const fileInputRef = useRef(null);

  // Reload col visibility when tab regains focus (changed in System Settings)
  useEffect(() => {
    const onFocus = () => setColVis(loadColVisibility());
    window.addEventListener("focus", onFocus);
    // Also listen for storage events (cross-tab)
    const onStorage = (e) => {
      if (e.key === COLUMN_VIS_KEY) setColVis(loadColVisibility());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const loadPartyTypes = () => {
      try {
        const s = localStorage.getItem(PARTY_TYPES_KEY);
        if (s) {
          const p = JSON.parse(s);
          if (p.length > 0) return p;
        }
      } catch {}
      return [
        { id: 1, name: "OEM" },
        { id: 2, name: "End Customer" },
      ];
    };
    setPartyTypes(loadPartyTypes());
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setData(p.sort((a, b) => a.partyCode.localeCompare(b.partyCode)));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (partyTypes.length > 0 && !newEntry.partyType)
      setNewEntry((p) => ({ ...p, partyType: partyTypes[0].name }));
  }, [partyTypes]);

  const saveToStorage = (nd) => {
    const sorted = [...nd].sort((a, b) =>
      a.partyCode.localeCompare(b.partyCode),
    );
    setData(sorted);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  };
  const cleanStr = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // Manual add helpers
  const handleAddItemRow = () =>
    setNewEntry({
      ...newEntry,
      items: [
        ...newEntry.items,
        {
          productSegment: "",
          itemCode: "",
          itemDescription: "",
          warrantyPeriodDays: "",
        },
      ],
    });
  const handleRemoveItemRow = (idx) => {
    if (newEntry.items.length === 1) return;
    setNewEntry({
      ...newEntry,
      items: newEntry.items.filter((_, i) => i !== idx),
    });
  };
  const handleItemChange = (idx, field, val) =>
    setNewEntry({
      ...newEntry,
      items: newEntry.items.map((item, i) =>
        i === idx ? { ...item, [field]: val } : item,
      ),
    });
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const dups = newEntry.items.filter((ni) =>
      data.some((d) => cleanStr(d.itemCode) === cleanStr(ni.itemCode)),
    );
    if (dups.length > 0) {
      alert(`Item Code "${dups[0].itemCode}" already exists!`);
      return;
    }
    const newRows = newEntry.items.map((item) => ({
      partyCode: newEntry.partyCode,
      partyDescription: newEntry.partyDescription,
      partyType: newEntry.partyType,
      state: newEntry.state,
      districtCity: newEntry.districtCity,
      ...item,
    }));
    saveToStorage([...newRows, ...data]);
    setShowAddModal(false);
    setNewEntry({
      partyCode: "",
      partyDescription: "",
      partyType: partyTypes[0]?.name || "",
      state: "",
      districtCity: "",
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

  // Upload
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")))
      startUpload(f);
    else alert("Please drop a valid Excel file");
  };
  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) startUpload(f);
    e.target.value = null;
  };
  const startUpload = (file) => {
    setUploadStep(2);
    setUploadProgress(0);
    const t = setInterval(
      () =>
        setUploadProgress((p) => {
          if (p >= 90) {
            clearInterval(t);
            processFile(file);
            return 90;
          }
          return p + 15;
        }),
      100,
    );
  };
  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (!rawData || rawData.length === 0) {
        alert("Empty File");
        setUploadStep(1);
        return;
      }
      let hIdx = -1;
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        if (rawData[i].some((c) => cleanStr(c).includes("partycode"))) {
          hIdx = i;
          break;
        }
      }
      if (hIdx === -1) {
        alert("Could not find 'Party Code' column.");
        setUploadStep(1);
        return;
      }
      const hr = rawData[hIdx];
      const gci = (kws) =>
        hr.findIndex((c) => {
          const s = String(c)
            .toLowerCase()
            .replace(/[^a-z]/g, "");
          return kws.every((k) => s.includes(k));
        });
      const idxPC = gci(["party", "code"]),
        idxPD =
          gci(["party", "desc"]) !== -1
            ? gci(["party", "desc"])
            : gci(["party", "name"]);
      let idxPT = gci(["party", "type"]);
      if (idxPT === -1) idxPT = gci(["type"]);
      const idxPS = gci(["product", "segment"]),
        idxIC = gci(["item", "code"]),
        idxID = gci(["item", "desc"]),
        idxWP = gci(["warranty", "period"]);
      const idxSt = gci(["state"]),
        idxDC = gci(["district"]) !== -1 ? gci(["district"]) : gci(["city"]);
      const processed = rawData.slice(hIdx + 1).map((row) => {
        let pType = idxPT !== -1 ? row[idxPT] : "";
        if (pType && typeof pType === "string") pType = pType.trim();
        if (!pType) pType = partyTypes[0]?.name || "OEM";
        return {
          partyCode: idxPC !== -1 ? String(row[idxPC]).trim() : "",
          partyDescription: idxPD !== -1 ? String(row[idxPD]).trim() : "",
          partyType: pType,
          state: idxSt !== -1 ? String(row[idxSt]).trim() : "",
          districtCity: idxDC !== -1 ? String(row[idxDC]).trim() : "",
          productSegment: idxPS !== -1 ? row[idxPS] : "",
          itemCode: idxIC !== -1 ? row[idxIC] : "",
          itemDescription: idxID !== -1 ? row[idxID] : "",
          warrantyPeriodDays: idxWP !== -1 ? row[idxWP] : "",
        };
      });
      validateData(processed);
      setUploadProgress(100);
      setTimeout(() => setUploadStep(3), 500);
    };
    reader.readAsBinaryString(file);
  };
  const validateData = (rows) => {
    const validRows = [],
      issues = [];
    let validCount = 0;
    const existing = new Set(data.map((d) => cleanStr(d.itemCode)));
    const fileCodes = new Set();
    rows.forEach((row, idx) => {
      if (!row.partyCode && !row.partyDescription && !row.itemCode) return;
      const rn = idx + 2;
      if (!row.partyCode) {
        issues.push({
          id: `err-p-${idx}`,
          row: rn,
          type: "error",
          message: "Missing Party Code",
        });
        return;
      }
      if (!row.itemCode) {
        issues.push({
          id: `err-i-${idx}`,
          row: rn,
          type: "error",
          message: "Missing Item Code",
        });
        return;
      }
      const clean = cleanStr(row.itemCode);
      if (existing.has(clean)) {
        issues.push({
          id: `dup-db-${idx}`,
          row: rn,
          type: "duplicate",
          message: `Item Code "${row.itemCode}" exists in DB`,
        });
        return;
      }
      if (fileCodes.has(clean)) {
        issues.push({
          id: `dup-f-${idx}`,
          row: rn,
          type: "duplicate",
          message: `Duplicate Item "${row.itemCode}" in file`,
        });
        return;
      }
      fileCodes.add(clean);
      validCount++;
      validRows.push(row);
    });
    setValidationResult({
      total: rows.length,
      valid: validCount,
      duplicates: issues.filter((i) => i.type === "duplicate").length,
      errors: issues.filter((i) => i.type === "error").length,
      validRows,
      issues,
    });
  };
  const commitData = () => {
    saveToStorage([...validationResult.validRows, ...data]);
    setUploadStep(4);
  };
  const resetUpload = () => {
    setShowUploadModal(false);
    setTimeout(() => {
      setUploadStep(1);
      setUploadProgress(0);
      setValidationResult(null);
    }, 300);
  };

  // Selection
  const handleSelectItem = (code) => {
    const s = new Set(selectedItems);
    s.has(code) ? s.delete(code) : s.add(code);
    setSelectedItems(s);
  };
  const handleSelectAllPage = (pd) => {
    const s = new Set(selectedItems);
    const all = pd.every((i) => s.has(i.itemCode));
    if (all) pd.forEach((i) => s.delete(i.itemCode));
    else pd.forEach((i) => s.add(i.itemCode));
    setSelectedItems(s);
  };
  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedItems.size} selected items?`)) {
      saveToStorage(data.filter((i) => !selectedItems.has(i.itemCode)));
      setSelectedItems(new Set());
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const filteredData = useMemo(
    () =>
      data.filter((item) => {
        const s = searchTerm.toLowerCase();
        const ms =
          String(item.partyCode).toLowerCase().includes(s) ||
          String(item.partyDescription).toLowerCase().includes(s) ||
          String(item.itemCode).toLowerCase().includes(s) ||
          String(item.productSegment).toLowerCase().includes(s);
        const mt =
          filterType === "All" ||
          String(item.partyType).toLowerCase() === filterType.toLowerCase();
        return ms && mt;
      }),
    [data, searchTerm, filterType],
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const isPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedItems.has(item.itemCode));

  const getTypeColor = (name) => {
    const idx = partyTypes.findIndex((t) => t.name === name);
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-orange-100 text-orange-700",
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
    ];
    return colors[idx % colors.length] || "bg-gray-100 text-gray-700";
  };

  // Active visible columns (for table rendering)
  const visibleCols = CUSTOMER_DB_COLUMNS.filter(
    (c) => colVis[c.key] !== false,
  );

  // Build table header + cells dynamically based on visible cols
  const renderHeaderCell = (col) => (
    <th
      key={col.key}
      className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 last:border-r-0"
    >
      {col.label}
    </th>
  );

  const renderRowCell = (col, row, isSameParty, rowSpan) => {
    const isSpanned = ROW_SPAN_COLS.has(col.key);
    if (isSpanned && isSameParty) return null; // already rendered in previous row

    const spanProps = isSpanned && !isSameParty ? { rowSpan } : {};
    const baseClass = `p-[0.9vw] border-r border-gray-200 last:border-r-0 ${isSpanned ? "bg-white align-middle" : ""}`;

    switch (col.key) {
      case "partyType":
        return (
          <td key={col.key} {...spanProps} className={baseClass}>
            <span
              className={`px-2 py-1 inline-block min-w-[6vw] text-center rounded text-[0.7vw] font-medium ${getTypeColor(row.partyType)}`}
            >
              {row.partyType}
            </span>
          </td>
        );
      case "productSegment":
        return (
          <td key={col.key} className={baseClass + " text-gray-700"}>
            {row.productSegment}
          </td>
        );
      case "partyCode":
        return (
          <td
            key={col.key}
            {...spanProps}
            className={baseClass + " text-gray-800 font-semibold"}
          >
            {row.partyCode}
          </td>
        );
      case "partyDescription":
        return (
          <td
            key={col.key}
            {...spanProps}
            className={baseClass + " text-gray-700 truncate max-w-[14vw]"}
            title={row.partyDescription}
          >
            {row.partyDescription}
          </td>
        );
      case "itemCode":
        return (
          <td key={col.key} className={baseClass + " text-gray-700 font-mono"}>
            {row.itemCode}
          </td>
        );
      case "itemDescription":
        return (
          <td
            key={col.key}
            className={baseClass + " text-gray-700 truncate max-w-[16vw]"}
            title={row.itemDescription}
          >
            {row.itemDescription}
          </td>
        );
      case "warrantyPeriodDays":
        return (
          <td
            key={col.key}
            className={baseClass + " text-gray-700 text-center font-semibold"}
          >
            {row.warrantyPeriodDays}
          </td>
        );
      case "state":
        return (
          <td
            key={col.key}
            {...spanProps}
            className={baseClass + " text-gray-600"}
          >
            {row.state || "—"}
          </td>
        );
      case "districtCity":
        return (
          <td
            key={col.key}
            {...spanProps}
            className={baseClass + " text-gray-600"}
          >
            {row.districtCity || "—"}
          </td>
        );
      default:
        return (
          <td key={col.key} className={baseClass}>
            {row[col.key]}
          </td>
        );
    }
  };

  const totalCols = 2 + visibleCols.length; // checkbox + S.No + visible

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      {/* Toolbar */}
      <div className="flex flex-col gap-[1.5vw] mb-[0.9vw]">
        <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-200">
          <div className="relative w-[35vw]">
            <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
            <input
              type="text"
              placeholder="Search Party or Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-300 rounded-[0.8vw] focus:outline-none focus:border-gray-800"
            />
          </div>
          <div className="flex gap-[1vw] items-center">
            <AnimatePresence>
              {selectedItems.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleBulkDelete}
                  className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] font-semibold"
                >
                  <Trash2 className="w-[1vw] h-[1vw]" /> Delete (
                  {selectedItems.size})
                </motion.button>
              )}
            </AnimatePresence>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent font-medium text-gray-700 border border-gray-300 p-[0.4vw] rounded-[0.3vw] outline-none cursor-pointer h-[2.4vw]"
            >
              <option value="All">All Types</option>
              {partyTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="cursor-pointer flex items-center gap-[0.5vw] bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-[1vw] h-[2.4vw] rounded-[0.4vw]"
            >
              <UserPlus className="w-[1.2vw] h-[1.2vw]" /> Add
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="cursor-pointer flex items-center gap-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white px-[1vw] h-[2.4vw] rounded-[0.4vw]"
            >
              <UploadCloud className="w-[1.2vw] h-[1.2vw]" /> Upload
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 flex flex-col">
        <div className="overflow-y-auto max-h-[73vh] min-h-[73vh] w-full rounded-t-[0.6vw]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-[0.6vw] border-b border-r border-gray-200 w-[3%] text-center">
                  <button
                    onClick={() => handleSelectAllPage(paginatedData)}
                    className="flex items-center justify-center w-full cursor-pointer"
                  >
                    {isPageSelected ? (
                      <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" />
                    ) : (
                      <Square className="w-[1.1vw] h-[1.1vw] text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 w-[4%] text-center">
                  S.No
                </th>
                {visibleCols.map(renderHeaderCell)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, i) => {
                  const serialNumber =
                    (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                  const isSelected = selectedItems.has(row.itemCode);
                  const prevRow = i > 0 ? paginatedData[i - 1] : null;
                  const isSameParty =
                    prevRow && prevRow.partyCode === row.partyCode;
                  let rowSpan = 1;
                  if (!isSameParty) {
                    for (let j = i + 1; j < paginatedData.length; j++) {
                      if (paginatedData[j].partyCode === row.partyCode)
                        rowSpan++;
                      else break;
                    }
                  }
                  return (
                    <tr
                      key={i}
                      className={`transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="p-[1vw] border-r border-gray-200 text-center">
                        <button
                          onClick={() => handleSelectItem(row.itemCode)}
                          className="flex items-center justify-center w-full cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" />
                          ) : (
                            <Square className="w-[1.1vw] h-[1.1vw] text-gray-300 hover:text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-[0.9vw] text-gray-600 font-medium border-r border-gray-200 text-center">
                        {serialNumber}
                      </td>
                      {visibleCols.map((col) =>
                        renderRowCell(col, row, isSameParty, rowSpan),
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={totalCols}
                    className="py-[4vw] text-center text-gray-400"
                  >
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-blue-100 p-[0.6vw] bg-blue-50 flex justify-between items-center rounded-b-[0.6vw]">
          <div className="text-[0.8vw] text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-800">
              {paginatedData.length > 0
                ? (currentPage - 1) * ITEMS_PER_PAGE + 1
                : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-800">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-800">
              {filteredData.length}
            </span>{" "}
            entries
          </div>
          <div className="flex items-center gap-[1.2vw]">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-[1vw] h-[1vw] text-gray-600" />
            </button>
            <div className="flex gap-[0.7vw]">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = i + 1;
                if (totalPages > 5 && currentPage > 3)
                  pNum = currentPage - 2 + i;
                if (pNum > totalPages) return null;
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 bg-white shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-[1vw] h-[1vw] text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-[58vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-[1vw] py-[0.7vw] border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-[1.2vw] font-semibold text-gray-900">
                  Add Customer & Items
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="w-[1.2vw] h-[1.2vw]" />
                </button>
              </div>
              <form
                onSubmit={handleManualSubmit}
                className="p-[1vw] flex flex-col gap-[1vw] overflow-y-auto"
              >
                <div className="bg-gray-50 p-[1vw] rounded-[0.5vw] border border-gray-200">
                  <h3 className="text-[0.9vw] font-bold text-gray-700 mb-[0.8vw]">
                    Party Details
                  </h3>
                  <div className="grid grid-cols-2 gap-[1.5vw] mb-[0.8vw]">
                    <div className="flex flex-col gap-[0.4vw]">
                      <label className="text-gray-600 font-medium">
                        Party Code *
                      </label>
                      <input
                        required
                        value={newEntry.partyCode}
                        onChange={(e) =>
                          setNewEntry({
                            ...newEntry,
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
                        value={newEntry.partyType}
                        onChange={(e) =>
                          setNewEntry({
                            ...newEntry,
                            partyType: e.target.value,
                          })
                        }
                        className="border p-[0.6vw] rounded-[0.4vw] bg-white outline-none"
                      >
                        {partyTypes.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[0.4vw] mb-[0.8vw]">
                    <label className="text-gray-600 font-medium">
                      Party Description *
                    </label>
                    <input
                      required
                      value={newEntry.partyDescription}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          partyDescription: e.target.value,
                        })
                      }
                      className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                      placeholder="Company Name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-[1.5vw]">
                    <div className="flex flex-col gap-[0.4vw]">
                      <label className="text-gray-600 font-medium">State</label>
                      <input
                        value={newEntry.state}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, state: e.target.value })
                        }
                        className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                        placeholder="e.g. Tamil Nadu"
                      />
                    </div>
                    <div className="flex flex-col gap-[0.4vw]">
                      <label className="text-gray-600 font-medium">
                        District / City
                      </label>
                      <input
                        value={newEntry.districtCity}
                        onChange={(e) =>
                          setNewEntry({
                            ...newEntry,
                            districtCity: e.target.value,
                          })
                        }
                        className="border p-[0.6vw] rounded-[0.4vw] bg-white focus:ring-2 ring-blue-100 outline-none"
                        placeholder="e.g. Coimbatore"
                      />
                    </div>
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
                    {newEntry.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-[0.5vw] items-center border-b border-gray-100 pb-[0.5vw] last:border-0"
                      >
                        <div className="flex-1 flex flex-col gap-[0.3vw]">
                          {idx === 0 && (
                            <label className="text-[0.75vw] text-gray-500">
                              Product Segment
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
                              Warranty (days)
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
                            disabled={newEntry.items.length === 1}
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
                    onClick={() => setShowAddModal(false)}
                    className="px-[2vw] py-[0.6vw] border rounded-[0.4vw] hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-[2vw] py-[0.6vw] bg-black text-white rounded-[0.4vw] hover:bg-gray-800 flex items-center gap-[0.5vw] cursor-pointer"
                  >
                    Save All
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-[55vw] rounded-[0.8vw] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-[1vw] py-[0.7vw] border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-[1.2vw] font-semibold text-gray-900">
                  Upload client data
                </h2>
                <button
                  onClick={resetUpload}
                  className="text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="w-[1.4vw] h-[1.4vw]" />
                </button>
              </div>
              <div className="px-[2vw] py-[1.2vw] flex-1 flex flex-col justify-center min-h-[25vw]">
                {uploadStep === 1 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className={`flex flex-col items-center justify-center h-[20vw] border-[0.2vw] border-dashed rounded-[1vw] cursor-pointer group ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-blue-50"}`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".xlsx,.xls"
                    />
                    <UploadCloud className="w-[2.5vw] h-[2.5vw] text-blue-500 mb-[1vw]" />
                    <p className="text-[1.1vw] font-semibold text-gray-800 mb-[0.4vw]">
                      {isDragging
                        ? "Drop file here"
                        : "Click to upload or Drag & Drop"}
                    </p>
                    <p className="text-gray-700 text-[0.9vw] mb-[0.5vw] text-center px-[10%]">
                      <span className="font-semibold">Expected Columns: </span>
                      Party Type, Product Segment, Party Code, Party
                      Description, Item Code, Item Description, Warranty Period,{" "}
                      <span className="text-blue-600 font-semibold">
                        State, District/City
                      </span>
                    </p>
                    <p className="text-blue-600 text-[0.85vw] bg-blue-50 px-[1vw] py-[0.4vw] rounded-[0.3vw] border border-blue-200">
                      <span className="font-semibold">Note:</span> Multiple
                      items per customer = new row with same Party Code
                    </p>
                  </div>
                )}
                {uploadStep === 2 && (
                  <div className="flex flex-col items-center justify-center w-full max-w-[30vw] mx-auto">
                    <div className="w-full flex justify-between font-semibold text-gray-600 mb-[0.5vw]">
                      <span>Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-[0.8vw] bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {uploadStep === 3 && (
                  <div className="flex gap-[2vw] h-full items-stretch">
                    <div className="w-[18vw] flex flex-col gap-[1vw]">
                      <div className="bg-gray-50 p-[1.5vw] rounded-[0.6vw] border border-gray-200 space-y-[0.8vw]">
                        <h4 className="font-bold text-gray-500 uppercase tracking-wider mb-[1vw]">
                          Summary
                        </h4>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total</span>
                          <span className="font-bold">
                            {validationResult.total}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Valid</span>
                          <span className="font-bold text-green-600">
                            {validationResult.valid}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Errors</span>
                          <span className="font-bold text-red-600">
                            {validationResult.errors}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 border border-gray-200 rounded-[0.6vw] flex flex-col overflow-hidden">
                      <div className="bg-gray-100 px-[1.5vw] py-[0.8vw] border-b border-gray-200 font-semibold text-gray-700">
                        Issues Found ({validationResult.issues.length})
                      </div>
                      <div className="overflow-y-auto flex-1 p-[1vw] space-y-[0.8vw] max-h-[20vw] bg-white">
                        {validationResult.issues.length > 0 ? (
                          validationResult.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-[0.8vw] p-[0.8vw] rounded-[0.4vw] border ${issue.type === "error" ? "bg-red-50 border-red-100" : "bg-blue-50 border-orange-100"}`}
                            >
                              <div>
                                <p
                                  className={`font-bold ${issue.type === "error" ? "text-red-700" : "text-blue-500"}`}
                                >
                                  Row {issue.row}:{" "}
                                  {issue.type === "error"
                                    ? "Error"
                                    : "Duplicate"}
                                </p>
                                <p className="text-gray-600">{issue.message}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Check className="w-[3vw] h-[3vw] mb-[0.5vw]" />
                            <p>No Issues Found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {uploadStep === 4 && (
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    <h3 className="text-[1.6vw] font-bold text-gray-800 mb-[0.5vw]">
                      Import Successful!
                    </h3>
                    <p className="text-[0.9vw] text-gray-500 mb-[2.5vw]">
                      Your customer database has been successfully updated.
                    </p>
                    <div className="grid grid-cols-3 gap-[1.5vw] w-full max-w-[35vw] mb-[3vw]">
                      <div className="bg-green-50 border border-green-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center">
                        <span className="text-[1.8vw] font-bold text-green-700">
                          {validationResult.valid}
                        </span>
                        <span className="text-[0.75vw] font-semibold text-green-600 uppercase tracking-wide">
                          Records Added
                        </span>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center">
                        <span className="text-[1.8vw] font-bold text-blue-600">
                          {validationResult.duplicates}
                        </span>
                        <span className="text-[0.75vw] font-semibold text-blue-500 uppercase tracking-wide">
                          Duplicates Skipped
                        </span>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center">
                        <span className="text-[1.8vw] font-bold text-red-600">
                          {validationResult.errors}
                        </span>
                        <span className="text-[0.75vw] font-semibold text-red-500 uppercase tracking-wide">
                          Failed Rows
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={resetUpload}
                      className="px-[3vw] py-[0.8vw] text-[0.9vw] font-medium border border-gray-300 rounded-[0.4vw] hover:bg-gray-50 cursor-pointer"
                    >
                      Exit
                    </button>
                  </div>
                )}
              </div>
              {uploadStep === 3 && (
                <div className="px-[1.5vw] py-[1vw] border-t border-gray-200 bg-gray-50 flex justify-end gap-[1vw]">
                  <button
                    onClick={resetUpload}
                    className="px-[2vw] py-[0.6vw] border border-gray-300 rounded-[0.4vw] bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={commitData}
                    disabled={validationResult.valid === 0}
                    className={`px-[1vw] py-[0.6vw] rounded-[0.4vw] text-white flex items-center cursor-pointer gap-[0.5vw] ${validationResult.valid > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
                  >
                    <Save className="w-[1vw] h-[1vw]" /> Import Records
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerDatabase;
