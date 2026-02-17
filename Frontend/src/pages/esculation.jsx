import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Clock,
  User,
  Package,
  FileText,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Bell,
  History,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import useEscalationWorker from "../service/useEscalationWorker";

const ESCALATION_KEY = "escalation_queue_v1";
const ESCALATION_FLOW = ["Support Engineer", "Service Engineer", "R&D"];

// Request Chrome notification permission on load
function requestChromeNotifPermission() {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }
}

const EscalationPage = () => {
  const { timers, resolveCall } = useEscalationWorker();
  const [escalationQueue, setEscalationQueue] = useState([]);
  const [expandedCall, setExpandedCall] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Track which callIds we've already shown a chrome notification for
  const notifiedCriticalRef = useRef(new Set());
  const notifiedEscalatedRef = useRef(new Set());

  useEffect(() => {
    requestChromeNotifPermission();
    const user = JSON.parse(
      sessionStorage.getItem("loggedInUser") ||
        localStorage.getItem("loggedInUser") ||
        "null",
    );
    if (user) setLoggedInUser(user);
  }, []);

  // Refresh every second
  useEffect(() => {
    const loadQueue = () => {
      const queue = JSON.parse(localStorage.getItem(ESCALATION_KEY) || "[]");
      setEscalationQueue(queue);
    };
    loadQueue();
    const interval = setInterval(loadQueue, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Chrome push notifications for critical / newly escalated to me ─────────
  useEffect(() => {
    if (!loggedInUser || Notification.permission !== "granted") return;

    escalationQueue.forEach((entry) => {
      const callKey = `${entry.callId}-${entry.currentLevel}`;

      // 1. Critical (all escalation levels exhausted) — notify once per call
      if (
        entry.status === "Critical_Unresolved" &&
        !notifiedCriticalRef.current.has(entry.callId)
      ) {
        notifiedCriticalRef.current.add(entry.callId);
        try {
          const n = new Notification(`🚨 CRITICAL: ${entry.callNumber}`, {
            body: `All escalation levels exhausted! Customer: ${entry.customerName}. Immediate action required.`,
            tag: `critical-${entry.callId}`,
            renotify: true,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {}
      }

      // 2. Escalated to ME specifically — notify when I become the assignee
      if (
        entry.status === "Escalated" &&
        entry.currentEngineerId === loggedInUser.userId &&
        !notifiedEscalatedRef.current.has(callKey)
      ) {
        notifiedEscalatedRef.current.add(callKey);
        const prevDept =
          entry.escalationHistory?.[entry.escalationHistory.length - 2]
            ?.department || "";
        try {
          const n = new Notification(
            `📢 Escalated to you: ${entry.callNumber}`,
            {
              body: `From ${prevDept} → ${entry.currentDepartment}. Customer: ${entry.customerName}${entry.callDescription ? ". Issue: " + entry.callDescription.slice(0, 80) : ""}`,
              tag: `escalated-${callKey}`,
              renotify: true,
            },
          );
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {}
      }
    });
  }, [escalationQueue, loggedInUser]);

  // ── Filter: only show entries where I am the current assignee ─────────────
  // Admin sees all; others see only calls assigned directly to them
  const filteredQueue = escalationQueue.filter((entry) => {
    if (loggedInUser) {
      const isAdmin = loggedInUser.department === "Admin";
      if (!isAdmin) {
        // Strict: only show if I am the CURRENT assigned engineer
        if (entry.currentEngineerId !== loggedInUser.userId) return false;
      }
    }

    if (filter === "all") return true;
    if (filter === "pending")
      return entry.status === "Pending" || entry.status === "Assigned";
    if (filter === "escalated") return entry.status === "Escalated";
    if (filter === "resolved") return entry.status === "Resolved";
    if (filter === "critical") return entry.status === "Critical_Unresolved";
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
      case "Assigned":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Escalated":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "Resolved":
        return "bg-green-100 text-green-700 border-green-300";
      case "Critical_Unresolved":
        return "bg-red-100 text-red-700 border-red-300";
      case "Closed":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 0:
        return "bg-blue-500";
      case 1:
        return "bg-yellow-500";
      case 2:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Low":
        return "text-green-600 bg-green-50";
      case "Medium":
        return "text-yellow-600 bg-yellow-50";
      case "High":
        return "text-orange-600 bg-orange-50";
      case "Critical":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getTimerForCall = (callId) => timers.find((t) => t.callId === callId);

  const handleResolve = (callId) => {
    if (window.confirm("Mark this call as resolved?")) resolveCall(callId);
  };

  const stats = {
    total: escalationQueue.length,
    pending: escalationQueue.filter(
      (e) => e.status === "Pending" || e.status === "Assigned",
    ).length,
    escalated: escalationQueue.filter((e) => e.status === "Escalated").length,
    resolved: escalationQueue.filter((e) => e.status === "Resolved").length,
    critical: escalationQueue.filter((e) => e.status === "Critical_Unresolved")
      .length,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-[0.4vw] text-[0.85vw]">
        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-[1vw] mb-[1.2vw]">
          {[
            {
              key: "all",
              label: "Total",
              value: stats.total,
              icon: Shield,
              color: "blue",
            },
            {
              key: "pending",
              label: "Pending",
              value: stats.pending,
              icon: Clock,
              color: "yellow",
            },
            {
              key: "escalated",
              label: "Escalated",
              value: stats.escalated,
              icon: ArrowUpRight,
              color: "orange",
            },
            {
              key: "resolved",
              label: "Resolved",
              value: stats.resolved,
              icon: CheckCircle,
              color: "green",
            },
            {
              key: "critical",
              label: "Critical",
              value: stats.critical,
              icon: Zap,
              color: "red",
            },
          ].map(({ key, label, value, icon: Icon, color }) => (
            <div
              key={key}
              onClick={() => setFilter(key)}
              className={`bg-white rounded-[0.5vw] p-[0.8vw] border cursor-pointer transition-all hover:shadow-md ${filter === key ? `border-${color}-400 shadow-md` : "border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[0.8vw] text-gray-500">{label}</span>
                <Icon className={`w-[1.2vw] h-[1.2vw] text-${color}-500`} />
              </div>
              <div
                className={`text-[1.5vw] font-bold text-${color === "blue" ? "gray-800" : color + "-600"} mt-[0.3vw]`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Live Timers Bar */}
        {timers.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 via-yellow-50 to-red-50 rounded-[0.5vw] p-[0.8vw] mb-[1.2vw] border border-gray-200">
            <div className="flex items-center gap-[0.5vw] mb-[0.5vw]">
              <RefreshCw className="w-[1vw] h-[1vw] text-blue-500 animate-spin" />
              <span className="text-[0.85vw] font-bold text-gray-700">
                Live Escalation Timers
              </span>
            </div>
            <div className="flex flex-wrap gap-[0.8vw]">
              {timers.map((timer) => (
                <div
                  key={timer.callId}
                  className={`flex items-center gap-[0.5vw] px-[0.8vw] py-[0.4vw] rounded-[0.4vw] border text-[0.8vw] font-mono font-bold ${
                    timer.isExpired
                      ? "bg-red-100 border-red-300 text-red-700"
                      : timer.isUrgent
                        ? "bg-orange-100 border-orange-300 text-orange-700 animate-pulse"
                        : "bg-white border-gray-300 text-gray-700"
                  }`}
                >
                  <Clock className="w-[0.9vw] h-[0.9vw]" />
                  <span>{timer.callNumber}</span>
                  <span className="text-[0.9vw]">
                    {timer.isExpired
                      ? "ESCALATING..."
                      : timer.remainingFormatted}
                  </span>
                  <span
                    className={`text-[0.65vw] px-[0.4vw] py-[0.1vw] rounded-full ${
                      timer.currentLevel === 0
                        ? "bg-blue-100 text-blue-600"
                        : timer.currentLevel === 1
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-red-100 text-red-600"
                    }`}
                  >
                    {timer.currentDepartment}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Escalation Queue Cards */}
        <div className="space-y-[1vw]">
          {filteredQueue.length === 0 ? (
            <div className="bg-white rounded-[0.5vw] p-[3vw] text-center border border-gray-200">
              <Shield className="w-[3vw] h-[3vw] text-gray-300 mx-auto mb-[1vw]" />
              <p className="text-[1vw] text-gray-400 font-medium">
                No escalation entries found
              </p>
              <p className="text-[0.8vw] text-gray-300 mt-[0.3vw]">
                Service calls assigned to you will appear here
              </p>
            </div>
          ) : (
            filteredQueue.map((entry) => {
              const timer = getTimerForCall(entry.callId);
              const isExpanded = expandedCall === entry.callId;
              return (
                <div
                  key={entry.callId}
                  className={`bg-white rounded-[0.6vw] border overflow-hidden transition-all hover:shadow-md ${
                    entry.status === "Critical_Unresolved"
                      ? "border-red-300 shadow-red-100 shadow-md"
                      : entry.status === "Escalated"
                        ? "border-orange-300"
                        : entry.status === "Resolved"
                          ? "border-green-300"
                          : "border-gray-200"
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className="p-[1vw] cursor-pointer"
                    onClick={() =>
                      setExpandedCall(isExpanded ? null : entry.callId)
                    }
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-[0.8vw]">
                        <div
                          className={`w-[2.5vw] h-[2.5vw] rounded-full ${getLevelColor(entry.currentLevel)} flex items-center justify-center`}
                        >
                          <span className="text-white text-[0.9vw] font-bold">
                            L{entry.currentLevel + 1}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-[0.5vw]">
                            <span className="font-mono text-[0.9vw] font-bold text-gray-800">
                              {entry.callNumber}
                            </span>
                            <span
                              className={`text-[0.7vw] px-[0.5vw] py-[0.15vw] rounded-full border font-semibold ${getStatusColor(entry.status)}`}
                            >
                              {entry.status === "Critical_Unresolved"
                                ? "CRITICAL"
                                : entry.status}
                            </span>
                            <span
                              className={`text-[0.7vw] px-[0.5vw] py-[0.15vw] rounded-[0.3vw] font-semibold ${getPriorityColor(entry.priority)}`}
                            >
                              {entry.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-[0.8vw] mt-[0.3vw] text-[0.78vw] text-gray-500">
                            <span className="flex items-center gap-[0.3vw]">
                              <User className="w-[0.85vw] h-[0.85vw]" />
                              {entry.customerName}
                            </span>
                            <span className="flex items-center gap-[0.3vw]">
                              <Shield className="w-[0.85vw] h-[0.85vw]" />
                              {entry.currentEngineerName} (
                              {entry.currentDepartment})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-[0.8vw]">
                        {timer && entry.status !== "Resolved" && (
                          <div
                            className={`flex items-center gap-[0.4vw] px-[0.7vw] py-[0.4vw] rounded-[0.4vw] font-mono text-[0.9vw] font-bold ${
                              timer.isExpired
                                ? "bg-red-100 text-red-600 animate-pulse"
                                : timer.isUrgent
                                  ? "bg-orange-100 text-orange-600 animate-pulse"
                                  : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            <Clock className="w-[1vw] h-[1vw]" />
                            {timer.isExpired
                              ? "00:00"
                              : timer.remainingFormatted}
                          </div>
                        )}
                        {entry.status === "Resolved" && (
                          <div className="flex items-center gap-[0.3vw] bg-green-50 text-green-600 px-[0.7vw] py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold">
                            <CheckCircle className="w-[1vw] h-[1vw]" /> Resolved
                          </div>
                        )}
                        { (entry.status !== "Resolved" &&
                          entry.status !== "Closed" &&  entry.currentEngineerId === loggedInUser?.userId ) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolve(entry.callId);
                              }}
                              className="flex items-center gap-[0.3vw] bg-green-600 hover:bg-green-700 text-white px-[0.8vw] py-[0.4vw] rounded-[0.4vw] text-[0.78vw] font-semibold cursor-pointer"
                            >
                              <CheckCircle className="w-[0.9vw] h-[0.9vw]" />{" "}
                              Resolve
                            </button>
                          )}
                        {isExpanded ? (
                          <ChevronUp className="w-[1.2vw] h-[1.2vw] text-gray-400" />
                        ) : (
                          <ChevronDown className="w-[1.2vw] h-[1.2vw] text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-[1vw] bg-gray-50">
                      <div className="grid grid-cols-3 gap-[1.2vw]">
                        <div className="bg-white rounded-[0.5vw] p-[0.8vw] border border-gray-200">
                          <h4 className="text-[0.85vw] font-bold text-gray-700 flex items-center gap-[0.4vw] mb-[0.6vw]">
                            <User className="w-[1vw] h-[1vw] text-blue-500" />{" "}
                            Customer Details
                          </h4>
                          <div className="space-y-[0.4vw] text-[0.78vw]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Name:</span>
                              <span className="font-semibold text-gray-700">
                                {entry.customerName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Code:</span>
                              <span className="font-mono text-gray-700">
                                {entry.partyCode}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Category:</span>
                              <span className="text-gray-700">
                                {entry.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-[0.5vw] p-[0.8vw] border border-gray-200">
                          <h4 className="text-[0.85vw] font-bold text-gray-700 flex items-center gap-[0.4vw] mb-[0.6vw]">
                            <FileText className="w-[1vw] h-[1vw] text-orange-500" />{" "}
                            Issue Details
                          </h4>
                          <div className="space-y-[0.4vw] text-[0.78vw]">
                            <div>
                              <span className="text-gray-500">
                                Description:
                              </span>
                              <p className="font-medium text-gray-700 mt-[0.2vw]">
                                {entry.callDescription || "N/A"}
                              </p>
                            </div>
                            {entry.errorCode && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">
                                  Error Code:
                                </span>
                                <span className="font-mono bg-red-50 text-red-600 px-[0.4vw] py-[0.1vw] rounded">
                                  {entry.errorCode}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-white rounded-[0.5vw] p-[0.8vw] border border-gray-200">
                          <h4 className="text-[0.85vw] font-bold text-gray-700 flex items-center gap-[0.4vw] mb-[0.6vw]">
                            <Package className="w-[1vw] h-[1vw] text-green-500" />{" "}
                            Products ({entry.products?.length || 0})
                          </h4>
                          <div className="space-y-[0.4vw] max-h-[8vw] overflow-y-auto">
                            {entry.products?.map((prod, idx) => (
                              <div
                                key={idx}
                                className="bg-gray-50 rounded-[0.3vw] p-[0.5vw] text-[0.75vw]"
                              >
                                <div className="font-semibold text-gray-700">
                                  {prod.productModel || prod.itemDescription}
                                </div>
                                <div className="flex gap-[0.8vw] text-gray-500 mt-[0.2vw]">
                                  {prod.serialNumber && (
                                    <span>SN: {prod.serialNumber}</span>
                                  )}
                                  {prod.warrantyStatus && (
                                    <span
                                      className={
                                        prod.warrantyStatus === "In Warranty"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }
                                    >
                                      {prod.warrantyStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Escalation Timeline */}
                      <div className="mt-[1vw] bg-white rounded-[0.5vw] p-[0.8vw] border border-gray-200">
                        <h4 className="text-[0.85vw] font-bold text-gray-700 flex items-center gap-[0.4vw] mb-[0.8vw]">
                          <History className="w-[1vw] h-[1vw] text-purple-500" />{" "}
                          Escalation Timeline
                        </h4>
                        <div className="relative">
                          {entry.escalationHistory?.map((hist, idx) => (
                            <div
                              key={idx}
                              className="flex gap-[0.8vw] mb-[1vw] last:mb-0"
                            >
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-[1.5vw] h-[1.5vw] rounded-full flex items-center justify-center ${hist.level === 0 ? "bg-blue-500" : hist.level === 1 ? "bg-yellow-500" : "bg-red-500"}`}
                                >
                                  <span className="text-white text-[0.6vw] font-bold">
                                    {hist.level + 1}
                                  </span>
                                </div>
                                {idx < entry.escalationHistory.length - 1 && (
                                  <div className="w-[0.15vw] flex-1 bg-gray-300 my-[0.2vw]"></div>
                                )}
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-[0.4vw] p-[0.6vw] border border-gray-100">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[0.8vw] font-bold text-gray-700">
                                      {hist.department}
                                    </span>
                                    <span className="text-[0.75vw] text-gray-500 ml-[0.5vw]">
                                      → {hist.engineerName} ({hist.engineerId})
                                    </span>
                                  </div>
                                  <span className="text-[0.7vw] text-gray-400">
                                    {new Date(hist.assignedAt).toLocaleString()}
                                  </span>
                                </div>
                                {hist.reason && (
                                  <p className="text-[0.72vw] text-orange-600 mt-[0.3vw] flex items-center gap-[0.3vw]">
                                    <AlertTriangle className="w-[0.8vw] h-[0.8vw]" />
                                    {hist.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default EscalationPage;
