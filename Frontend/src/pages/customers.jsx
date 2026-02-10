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

const STORAGE_KEY = "customer_db_grouped_v4";
const PARTY_TYPES_KEY = "party_types_v1";
const ITEMS_PER_PAGE = 10;

const CustomerDatabase = () => {
  // --- Data State ---
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  // --- Party Types Management ---
  const [partyTypes, setPartyTypes] = useState([]);
  const [showPartyTypeModal, setShowPartyTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null); // {id, name}
  const [newTypeName, setNewTypeName] = useState("");

  // --- Selection State ---
  const [selectedItems, setSelectedItems] = useState(new Set());

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);

  // --- UI State ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // --- Upload Logic State ---
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

  // --- Manual Add Form State ---
  const [newEntry, setNewEntry] = useState({
    partyCode: "",
    partyDescription: "",
    partyType: "",
    items: [{ itemCode: "", itemDescription: "" }],
  });

  const fileInputRef = useRef(null);

  // --- 1. Load & Save ---
  useEffect(() => {
    // Load Party Types
    const storedTypes = localStorage.getItem(PARTY_TYPES_KEY);
    if (storedTypes) {
      try {
        setPartyTypes(JSON.parse(storedTypes));
      } catch (e) {
        console.error("Error loading party types", e);
        // Set default types if error
        const defaultTypes = [
          { id: 1, name: "OEM" },
          { id: 2, name: "End Customer" },
        ];
        setPartyTypes(defaultTypes);
        localStorage.setItem(PARTY_TYPES_KEY, JSON.stringify(defaultTypes));
      }
    } else {
      // Initialize with default types
      const defaultTypes = [
        { id: 1, name: "OEM" },
        { id: 2, name: "End Customer" },
      ];
      setPartyTypes(defaultTypes);
      localStorage.setItem(PARTY_TYPES_KEY, JSON.stringify(defaultTypes));
    }

    // Load Customer DB
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const sorted = parsed.sort((a, b) =>
          a.partyCode.localeCompare(b.partyCode),
        );
        setData(sorted);
      } catch (e) {
        console.error("Error loading DB", e);
      }
    }
  }, []);

  // Set default party type when types load
  useEffect(() => {
    if (partyTypes.length > 0 && !newEntry.partyType) {
      setNewEntry((prev) => ({ ...prev, partyType: partyTypes[0].name }));
    }
  }, [partyTypes]);

  const saveToStorage = (newData) => {
    const sortedData = [...newData].sort((a, b) =>
      a.partyCode.localeCompare(b.partyCode),
    );
    setData(sortedData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedData));
  };

  const savePartyTypes = (types) => {
    setPartyTypes(types);
    localStorage.setItem(PARTY_TYPES_KEY, JSON.stringify(types));
  };

  // --- 2. Helpers ---
  const cleanStr = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // --- 3. Party Type Management Functions ---
  const handleAddPartyType = () => {
    if (!newTypeName.trim()) {
      alert("Please enter a party type name");
      return;
    }

    // Check for duplicates
    if (partyTypes.some((t) => t.name.toLowerCase() === newTypeName.trim().toLowerCase())) {
      alert("This party type already exists!");
      return;
    }

    const newType = {
      id: Date.now(),
      name: newTypeName.trim(),
    };

    savePartyTypes([...partyTypes, newType]);
    setNewTypeName("");
  };

  const handleUpdatePartyType = () => {
    if (!editingType || !editingType.name.trim()) {
      alert("Please enter a valid name");
      return;
    }

    // Check for duplicates (excluding current)
    if (
      partyTypes.some(
        (t) =>
          t.id !== editingType.id &&
          t.name.toLowerCase() === editingType.name.trim().toLowerCase()
      )
    ) {
      alert("This party type already exists!");
      return;
    }

    const oldName = partyTypes.find((t) => t.id === editingType.id)?.name;
    const newName = editingType.name.trim();

    // Update in party types list
    const updatedTypes = partyTypes.map((t) =>
      t.id === editingType.id ? { ...t, name: newName } : t
    );
    savePartyTypes(updatedTypes);

    // Update all data entries with the old name
    if (oldName !== newName) {
      const updatedData = data.map((row) =>
        row.partyType === oldName ? { ...row, partyType: newName } : row
      );
      saveToStorage(updatedData);
    }

    setEditingType(null);
  };

  const handleDeletePartyType = (typeId) => {
    const typeToDelete = partyTypes.find((t) => t.id === typeId);
    
    if (partyTypes.length === 1) {
      alert("Cannot delete the last party type! At least one type must exist.");
      return;
    }

    // Check if any data uses this type
    const usageCount = data.filter((row) => row.partyType === typeToDelete.name).length;
    
    if (usageCount > 0) {
      if (!confirm(`This party type is used in ${usageCount} records. Are you sure you want to delete it? Those records will need to be reassigned.`)) {
        return;
      }
    }

    if (confirm(`Delete party type "${typeToDelete.name}"?`)) {
      const updatedTypes = partyTypes.filter((t) => t.id !== typeId);
      savePartyTypes(updatedTypes);

      // Update data entries - set to first remaining type
      if (usageCount > 0) {
        const newDefaultType = updatedTypes[0].name;
        const updatedData = data.map((row) =>
          row.partyType === typeToDelete.name
            ? { ...row, partyType: newDefaultType }
            : row
        );
        saveToStorage(updatedData);
      }
    }
  };

  // --- 4. Manual Add Logic (Multiple Items) ---
  const handleAddItemRow = () => {
    setNewEntry({
      ...newEntry,
      items: [...newEntry.items, { itemCode: "", itemDescription: "" }],
    });
  };

  const handleRemoveItemRow = (index) => {
    if (newEntry.items.length === 1) return;
    const updatedItems = newEntry.items.filter((_, i) => i !== index);
    setNewEntry({ ...newEntry, items: updatedItems });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = newEntry.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    setNewEntry({ ...newEntry, items: updatedItems });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();

    const duplicateItems = newEntry.items.filter((newItem) =>
      data.some((d) => cleanStr(d.itemCode) === cleanStr(newItem.itemCode)),
    );

    if (duplicateItems.length > 0) {
      alert(
        `Item Code "${duplicateItems[0].itemCode}" already exists in the database!`,
      );
      return;
    }

    const newRows = newEntry.items.map((item) => ({
      partyCode: newEntry.partyCode,
      partyDescription: newEntry.partyDescription,
      partyType: newEntry.partyType,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
    }));

    const newData = [...newRows, ...data];
    saveToStorage(newData);
    setShowAddModal(false);
    setNewEntry({
      partyCode: "",
      partyDescription: "",
      partyType: partyTypes[0]?.name || "",
      items: [{ itemCode: "", itemDescription: "" }],
    });
  };

  // --- 5. Upload Logic ---
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
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      startUpload(file);
    } else {
      alert("Please drop a valid Excel file");
    }
  };
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) startUpload(file);
    e.target.value = null;
  };

  const startUpload = (file) => {
    setUploadStep(2);
    setUploadProgress(0);
    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          processFile(file);
          return 90;
        }
        return prev + 15;
      });
    }, 100);
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (!rawData || rawData.length === 0) {
        alert("Empty File");
        setUploadStep(1);
        return;
      }

      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        if (rawData[i].some((cell) => cleanStr(cell).includes("partycode"))) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        alert("Could not find 'Party Code' column.");
        setUploadStep(1);
        return;
      }

      const headerRow = rawData[headerIdx];
      const getColIndex = (keywords) =>
        headerRow.findIndex((cell) => {
          const c = String(cell)
            .toLowerCase()
            .replace(/[^a-z]/g, "");
          return keywords.every((k) => c.includes(k));
        });

      const idxPartyCode = getColIndex(["party", "code"]);
      const idxPartyDesc =
        getColIndex(["party", "desc"]) !== -1
          ? getColIndex(["party", "desc"])
          : getColIndex(["party", "name"]);
      let idxPartyType = getColIndex(["party", "type"]);
      if (idxPartyType === -1) idxPartyType = getColIndex(["type"]);
      const idxItemCode = getColIndex(["item", "code"]);
      const idxItemDesc = getColIndex(["item", "desc"]);

      const processed = rawData.slice(headerIdx + 1).map((row) => {
        let pType = idxPartyType !== -1 ? row[idxPartyType] : "";
        if (pType && typeof pType === "string") pType = pType.trim();
        if (!pType || pType === "") pType = partyTypes[0]?.name || "OEM";

        return {
          partyCode: idxPartyCode !== -1 ? row[idxPartyCode] : "",
          partyDescription: idxPartyDesc !== -1 ? row[idxPartyDesc] : "",
          partyType: pType,
          itemCode: idxItemCode !== -1 ? row[idxItemCode] : "",
          itemDescription: idxItemDesc !== -1 ? row[idxItemDesc] : "",
        };
      });

      validateData(processed);
      setUploadProgress(100);
      setTimeout(() => setUploadStep(3), 500);
    };
    reader.readAsBinaryString(file);
  };

  const validateData = (rows) => {
    const validRows = [];
    const issues = [];
    let validCount = 0;

    const existingItemCodes = new Set(data.map((d) => cleanStr(d.itemCode)));
    const fileItemCodes = new Set();

    rows.forEach((row, idx) => {
      if (!row.partyCode && !row.partyDescription && !row.itemCode) return;
      const rowNum = idx + 2;

      if (!row.partyCode) {
        issues.push({
          id: `err-p-${idx}`,
          row: rowNum,
          type: "error",
          message: "Missing Party Code",
        });
        return;
      }
      if (!row.itemCode) {
        issues.push({
          id: `err-i-${idx}`,
          row: rowNum,
          type: "error",
          message: "Missing Item Code",
        });
        return;
      }

      const itemCodeClean = cleanStr(row.itemCode);

      if (existingItemCodes.has(itemCodeClean)) {
        issues.push({
          id: `dup-db-${idx}`,
          row: rowNum,
          type: "duplicate",
          message: `Item Code "${row.itemCode}" exists in DB`,
        });
        return;
      }
      if (fileItemCodes.has(itemCodeClean)) {
        issues.push({
          id: `dup-file-${idx}`,
          row: rowNum,
          type: "duplicate",
          message: `Duplicate Item "${row.itemCode}" in file`,
        });
        return;
      }

      fileItemCodes.add(itemCodeClean);
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

  // --- 6. Selection Logic ---
  const handleSelectItem = (code) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(code)) newSelected.delete(code);
    else newSelected.add(code);
    setSelectedItems(newSelected);
  };

  const handleSelectAllPage = (pageData) => {
    const newSelected = new Set(selectedItems);
    const allSelected = pageData.every((item) =>
      newSelected.has(item.itemCode),
    );
    if (allSelected) {
      pageData.forEach((item) => newSelected.delete(item.itemCode));
    } else {
      pageData.forEach((item) => newSelected.add(item.itemCode));
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedItems.size} selected items?`)) {
      const newData = data.filter((i) => !selectedItems.has(i.itemCode));
      saveToStorage(newData);
      setSelectedItems(new Set());
    }
  };

  const handleDelete = (itemCode) => {
    if (confirm("Delete this item?")) {
      const newData = data.filter((i) => i.itemCode !== itemCode);
      saveToStorage(newData);
      if (selectedItems.has(itemCode)) {
        const newSel = new Set(selectedItems);
        newSel.delete(itemCode);
        setSelectedItems(newSel);
      }
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        String(item.partyCode).toLowerCase().includes(s) ||
        String(item.partyDescription).toLowerCase().includes(s) ||
        String(item.itemCode).toLowerCase().includes(s);

      const matchesType =
        filterType === "All" ||
        String(item.partyType).toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [data, searchTerm, filterType]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const isPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedItems.has(item.itemCode));

  const getTypeColor = (typeName) => {
    const index = partyTypes.findIndex((t) => t.name === typeName);
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-orange-100 text-orange-700",
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
      "bg-teal-100 text-teal-700",
      "bg-red-100 text-red-700",
    ];
    return colors[index % colors.length] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="w-full h-full font-sans text-[0.85vw]">
      <div className="flex flex-col gap-[1.5vw] mb-[0.9vw]">
        <div className="flex items-center justify-between bg-white p-[0.7vw] rounded-[0.6vw] shadow-sm border border-gray-200">
          <div className="relative w-[35vw] flex gap-[0.6vw] items-end">
            <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 text-gray-400 w-[1vw] h-[1vw]" />
            <input
              type="text"
              placeholder="Search Party or Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-[2.5vw] pr-[1vw] h-[2.5vw] border border-gray-300 rounded-[0.8vw] focus:outline-none focus:border-gray-800"
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-[1vw] items-center">
              <AnimatePresence>
                {selectedItems.size > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={handleBulkDelete}
                    className="flex items-center gap-[0.5vw] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-[1vw] h-[2.4vw] rounded-[0.4vw] shadow-sm transition-all font-semibold"
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
                {partyTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowPartyTypeModal(true)}
                className="cursor-pointer flex items-center gap-[0.5vw]  border border-blue-300 hover:bg-blue-100 text-blue-700 px-[1vw] h-[2.4vw] rounded-[0.4vw] shadow-sm transition-all"
                title="Manage Party Types"
              >
                <Settings className="w-[1.2vw] h-[1.2vw]" /> Categories
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="cursor-pointer flex items-center gap-[0.5vw] bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-[1vw] h-[2.4vw] rounded-[0.4vw] shadow-sm transition-all"
              >
                <UserPlus className="w-[1.2vw] h-[1.2vw]" /> Add
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="cursor-pointer flex items-center gap-[0.5vw] bg-blue-600 hover:bg-blue-700 text-white px-[1vw] h-[2.4vw] rounded-[0.4vw] shadow-sm transition-all"
              >
                <UploadCloud className="w-[1.2vw] h-[1.2vw]" /> Upload
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[0.6vw] shadow-sm border border-gray-200 flex flex-col">
        <div className="overflow-y-auto max-h-[73vh] min-h-[73vh] w-full rounded-t-[0.6vw]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-[0.6vw] border-b border-r border-gray-200 w-[4%] text-center">
                  <button
                    onClick={() => handleSelectAllPage(paginatedData)}
                    className="flex items-center justify-center w-full h-full outline-none cursor-pointer"
                  >
                    {isPageSelected ? (
                      <CheckSquare className="w-[1.1vw] h-[1.1vw] text-blue-600" />
                    ) : (
                      <Square className="w-[1.1vw] h-[1.1vw] text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200 w-[5%] text-center">
                  S.No
                </th>
                <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200">
                  Party Type
                </th>
                <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200">
                  Party Code
                </th>
                <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200">
                  Party Description 
                </th>
                
                <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200">
                  Item Code
                </th>
                <th className="p-[0.6vw] font-semibold text-gray-800 border-b border-r border-gray-200">
                  Item Description
                </th>
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
                      if (paginatedData[j].partyCode === row.partyCode) {
                        rowSpan++;
                      } else {
                        break;
                      }
                    }
                  }

                  return (
                    <tr
                      key={i}
                      className={`transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="p-[1.049vw] border-r border-gray-200 text-center">
                        <button
                          onClick={() => handleSelectItem(row.itemCode)}
                          className="flex items-center justify-center w-full h-full outline-none cursor-pointer"
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

                         {!isSameParty && (
                        <td
                          rowSpan={rowSpan}
                          className="p-[0.9vw] border-r border-gray-200 bg-white align-center"
                        >
                          <span
                            className={`px-2 py-1 rounded text-[0.7vw] font-medium ${getTypeColor(row.partyType)}`}
                          >
                            {row.partyType}
                          </span>
                        </td>
                      )}

                      {!isSameParty && (
                        <td
                          rowSpan={rowSpan}
                          className="p-[0.9vw] text-gray-800 font-semibold border-r border-gray-200 bg-white align-center"
                        >
                          {row.partyCode}
                        </td>
                      )}

                      {!isSameParty && (
                        <td
                          rowSpan={rowSpan}
                          className="p-[0.9vw] text-gray-700 border-r border-gray-200 bg-white align-center truncate max-w-[15vw] "
                          title={row.partyDescription}
                        >
                          {row.partyDescription}
                        </td>
                      )}

                   

                      <td className="p-[0.9vw] text-gray-700 font-mono border-r border-gray-200">
                        {row.itemCode}
                      </td>

                      <td
                        className="p-[0.9vw] text-gray-700 border-r border-gray-200 truncate max-w-[20vw]"
                        title={row.itemDescription}
                      >
                        {row.itemDescription}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="py-[4vw] text-center text-gray-400"
                  >
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
              className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm cursor-pointer"
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
                    className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.3vw] text-[0.8vw] font-medium transition-colors cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-[0.4vw] border border-gray-300 rounded-[0.3vw] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-[1vw] h-[1vw] text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPartyTypeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-[45vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="px-[1vw] py-[0.7vw] border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50">
                <h2 className="text-[1.2vw] font-semibold text-gray-900 flex items-center gap-[0.5vw]">
                  Manage Party Type Categories
                </h2>
                <button
                  onClick={() => {
                    setShowPartyTypeModal(false);
                    setEditingType(null);
                    setNewTypeName("");
                  }}
                  className="text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="w-[1.2vw] h-[1.2vw]" />
                </button>
              </div>

              <div className="p-[1.5vw] flex flex-col gap-[1.5vw] overflow-y-auto">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-[1vw] rounded-[0.6vw] border border-blue-200">
                  <h3 className="text-[0.95vw] font-bold text-gray-700 mb-[0.8vw] flex items-center gap-[0.5vw]">
                    Add New Category
                  </h3>
                  <div className="flex gap-[0.8vw]">
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleAddPartyType();
                      }}
                      placeholder="Enter category name..."
                      className="flex-1 border border-gray-300 rounded-[0.4vw] p-[0.6vw] focus:ring-2 ring-blue-200 outline-none"
                    />
                    <button
                      onClick={handleAddPartyType}
                      className="px-[1.5vw] py-[0.6vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] cursor-pointer font-semibold flex items-center gap-[0.5vw] transition-all shadow-sm"
                    >
                      <Plus className="w-[1vw] h-[1vw]" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Existing Types List */}
                <div className="bg-white border border-gray-200 rounded-[0.6vw] overflow-hidden">
                  <div className="bg-gray-100 px-[1vw] py-[0.7vw] border-b border-gray-200">
                    <h3 className="text-[0.9vw] font-bold text-gray-700">
                      Existing Categories ({partyTypes.length})
                    </h3>
                  </div>
                  <div className="max-h-[35vh] overflow-y-auto">
                    {partyTypes.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {partyTypes.map((type) => (
                          <div
                            key={type.id}
                            className="p-[1vw] hover:bg-gray-50 transition-colors flex items-center justify-between group"
                          >
                            {editingType && editingType.id === type.id ? (
                              <div className="flex-1 flex gap-[0.8vw] items-center">
                                <input
                                  type="text"
                                  value={editingType.name}
                                  onChange={(e) =>
                                    setEditingType({
                                      ...editingType,
                                      name: e.target.value,
                                    })
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") handleUpdatePartyType();
                                  }}
                                  className="flex-1 border border-blue-300 rounded-[0.4vw] p-[0.5vw] focus:ring-2 ring-blue-200 outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={handleUpdatePartyType}
                                  className="p-[0.5vw] bg-green-600 hover:bg-green-700 text-white rounded-[0.3vw] cursor-pointer"
                                  title="Save"
                                >
                                  <Check className="w-[1vw] h-[1vw]" />
                                </button>
                                <button
                                  onClick={() => setEditingType(null)}
                                  className="p-[0.5vw] bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-[0.3vw] cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-[1vw] h-[1vw]" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-[0.8vw]">
                                  <span
                                    className={`px-3 py-1 rounded text-[0.8vw] font-medium ${getTypeColor(type.name)}`}
                                  >
                                    {type.name}
                                  </span>
                                  <span className="text-[0.75vw] text-gray-400">
                                    ({data.filter((d) => d.partyType === type.name).length} records)
                                  </span>
                                </div>
                                <div className="flex gap-[0.5vw] opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      setEditingType({ id: type.id, name: type.name })
                                    }
                                    className="p-[0.5vw] text-blue-600 hover:bg-blue-50 rounded-[0.3vw] cursor-pointer transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-[1vw] h-[1vw]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePartyType(type.id)}
                                    className="p-[0.5vw] text-red-600 hover:bg-red-50 rounded-[0.3vw] cursor-pointer transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-[1vw] h-[1vw]" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-[2vw] text-center text-gray-400">
                        No categories found. Add one above!
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-[0.5vw] p-[0.8vw]">
                  <p className="text-[0.75vw] text-yellow-800">
                    <strong>Note:</strong> When you rename a category, all existing records using that category will be automatically updated. Deleting a category will reassign affected records to the first available category.
                  </p>
                </div>
              </div>

              <div className="px-[1.5vw] py-[1vw] border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => {
                    setShowPartyTypeModal(false);
                    setEditingType(null);
                    setNewTypeName("");
                  }}
                  className="px-[2vw] py-[0.6vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] cursor-pointer font-semibold"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-[45vw] rounded-[0.8vw] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
                  <h3 className="text-[0.9vw] font-bold text-gray-700 mb-[0.5vw]">
                    Party Details
                  </h3>
                  <div className="grid grid-cols-2 gap-[1.5vw] mb-[0.5vw]">
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
                        {partyTypes.map((type) => (
                          <option key={type.id} value={type.name}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[0.4vw]">
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
                        <div className="flex flex-col justify-end ">
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

      {/* Upload Modal - Same as before, no changes needed */}
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
                    className={`flex flex-col items-center justify-center h-[20vw] border-[0.2vw] border-dashed rounded-[1vw] transition-all cursor-pointer group ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-blue-50"}`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".xlsx, .xls"
                    />
                    <div
                      className={`w-[5vw] h-[5vw]flex items-center justify-center mb-[1vw] transition-transform ${isDragging ? "scale-110 bg-blue-100" : "group-hover:scale-110"}`}
                    >
                      <UploadCloud className="w-[2.5vw] h-[2.5vw] text-blue-500 ml-[0.5vw]" />
                    </div>
                    <p className="text-[1.1vw] font-semibold text-gray-800 md-[0.2vw] mb-[0.4vw]">
                      {isDragging
                        ? "Drop file here"
                        : "Click to upload or Drag & Drop"}
                    </p>
                    <p className="text-gray-700 text-[0.95vw] mb-[0.7vw]">
                      Format : xlsx{" "}
                    </p>
                    <p className="text-gray-700 text-[0.95vw] mb-[0.5vw]">
                      <span className="font-semibold">Expected Format : </span>
                      Party Code, Party Description, Party type, Item Code,
                      Item Description
                    </p>
                    <p className="text-blue-600 text-[0.85vw] bg-blue-50 px-[1vw] py-[0.4vw] rounded-[0.3vw] border border-blue-200">
                      <span className="font-semibold">Note:</span> If a
                      customer has multiple items, add each item in a new row
                      with the same Party Code and Description
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
                      <div className="bg-green-50 border border-green-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center text-center">
                        <span className="text-[1.8vw] font-bold text-green-700 leading-none mb-[0.3vw]">
                          {validationResult.valid}
                        </span>
                        <span className="text-[0.75vw] font-semibold text-green-600 uppercase tracking-wide">
                          Records Added
                        </span>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center text-center">
                        <span className="text-[1.8vw] font-bold text-blue-600 leading-none mb-[0.3vw]">
                          {validationResult.duplicates}
                        </span>
                        <span className="text-[0.75vw] font-semibold text-blue-500 uppercase tracking-wide">
                          Duplicates Skipped
                        </span>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center text-center">
                        <span className="text-[1.8vw] font-bold text-red-600 leading-none mb-[0.3vw]">
                          {validationResult.errors}
                        </span>
                        <span className="text-[0.75vw] font-semibold text-red-500 uppercase tracking-wide">
                          Failed Rows
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={resetUpload}
                      className="px-[3vw] py-[0.8vw] text-[0.9vw] font-medium transition-all shadow-lg shadow-gray-200 cursor-pointer"
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