import React, { useState } from "react";
import {
  Shield,
  Activity,
  AlertTriangle,
  Send,
  Sparkles,
  Volume2,
  FileText,
  Check,
  Languages,
  ArrowRight,
  Plus,
  Compass,
  Download,
  Flame,
  UserCheck
} from "lucide-react";
import { Venue, Gate, Zone, Incident, HelpRequest, Broadcast } from "../types";
import * as aiService from "../services/ai";
import * as dbService from "../services/db";

interface StaffConsoleProps {
  venue: Venue;
  gates: Gate[];
  zones: Zone[];
  incidents: Incident[];
  helpRequests: HelpRequest[];
  broadcasts: Broadcast[];
  onRefresh: () => void;
}

export default function StaffConsole({
  venue,
  gates,
  zones,
  incidents,
  helpRequests,
  broadcasts,
  onRefresh,
}: StaffConsoleProps) {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"heatmap" | "copilot" | "broadcast" | "report">("heatmap");

  // Gate Turnstile Load-Balancer States
  const [selectedStaffGate, setSelectedStaffGate] = useState<string>("v1-g-1");
  const [gateInflowRates, setGateInflowRates] = useState<Record<string, number>>({
    "v1-g-1": 140,
    "v1-g-2": 85,
    "v1-g-3": 215,
    "v1-g-4": 45,
  });
  const [activeGateReroute, setActiveGateReroute] = useState<string>("");

  // Broadcast Builder States
  const [bcInput, setBcInput] = useState<string>("Gate 1 is congested. All incoming fans please use Gate 3.");
  const [bcSeverity, setBcSeverity] = useState<"info" | "advisory" | "urgent">("advisory");
  const [bcTranslations, setBcTranslations] = useState<any | null>(null);
  const [bcTranslating, setBcTranslating] = useState<boolean>(false);
  const [bcConfirmUrgent, setBcConfirmUrgent] = useState<boolean>(false);

  // Copilot States
  const [copilotInput, setCopilotInput] = useState<string>("Which zones are congested and what actions do you recommend?");
  const [copilotHistory, setCopilotHistory] = useState<Array<{ role: "user" | "copilot"; text: string; action?: any }>>([
    {
      role: "copilot",
      text: "Synapse 26 Staff Copilot online. I have analyzed current density sensors and gates occupancy. Zone C is currently elevated at 88%. I recommend opening Gate 1 to standard overflow.",
      action: { type: "open_overflow", title: "Open Gate 1 Overflow Lane", targetGateId: "v1-g-1" },
    },
  ]);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [approvedActions, setApprovedActions] = useState<string[]>([]);

  // AI Visual check simulation
  const [visualCheckRunning, setVisualCheckRunning] = useState<boolean>(false);
  const [visualCheckResult, setVisualCheckResult] = useState<string>("");

  // Post match report MD state
  const [reportMarkdown, setReportMarkdown] = useState<string>("");
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  // Manual incident form state
  const [incType, setIncType] = useState<"crowd_warning" | "medical" | "accessibility" | "security">("crowd_warning");
  const [incSeverity, setIncSeverity] = useState<"low" | "medium" | "high" | "emergency">("medium");
  const [incDesc, setIncDesc] = useState<string>("");

  // Resolve Incident
  const handleResolveIncident = async (incId: string) => {
    try {
      const data = await dbService.resolveIncident({ incId, status: "resolved" });
      if (data.incident) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Add Incident manually
  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incDesc.trim()) return;

    try {
      const data = await dbService.addIncident({
        venueId: venue.id,
        zoneId: `${venue.id}-z-1`,
        type: incType,
        severity: incSeverity,
        description: incDesc,
        reportedBy: "Staff Console Operator",
      });
      if (data.success) {
        setIncDesc("");
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run AI Visual Check (beta camera simulation)
  const handleRunVisualCheck = () => {
    setVisualCheckRunning(true);
    setVisualCheckResult("");
    setTimeout(() => {
      setVisualCheckRunning(false);
      setVisualCheckResult(
        "AI Vision Analysis (Zone C Cameras): Detected dense flocking near concession stands. Flow bottlenecking at Section 104 is verified. Advise staff deployment."
      );
    }, 2000);
  };

  // Trigger Gemini Copilot Query
  const handleSendCopilotMessage = async () => {
    if (!copilotInput.trim()) return;

    setCopilotHistory((p) => [...p, { role: "user", text: copilotInput }]);
    setCopilotLoading(true);
    const q = copilotInput;
    setCopilotInput("");

    try {
      const data = await aiService.fetchCopilot(q, venue.id);

      // Check if recommendation calls for an action
      let actionItem = undefined;
      const responseText = data.text || "";
      if (responseText.toLowerCase().includes("gate 1") || responseText.toLowerCase().includes("gate")) {
        actionItem = { type: "open_overflow", title: "Approve Gate Overflow Realignment", targetGateId: "v1-g-1" };
      } else if (responseText.toLowerCase().includes("volunteer") || responseText.toLowerCase().includes("deploy")) {
        actionItem = { type: "deploy_staff", title: "Approve Volunteers Re-allocation", targetGateId: "v1-z-3" };
      }

      setCopilotHistory((p) => [
        ...p,
        {
          role: "copilot",
          text: responseText,
          action: actionItem,
        },
      ]);
    } catch (e) {
      setCopilotHistory((p) => [
        ...p,
        {
          role: "copilot",
          text: "Internal copilot connection issue. Standard local analytics model recommending general lane open guidelines.",
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Approve a Copilot Decision Recommendation
  const handleApproveAction = (actionId: string, title: string) => {
    setApprovedActions((p) => [...p, actionId]);
    alert(`APPROVED OPERATIONAL COMMAND: "${title}" has been successfully pushed to the active staff dispatch queues!`);
  };

  // Translate Broadcast
  const handleTranslateBroadcast = async () => {
    if (!bcInput.trim()) return;
    setBcTranslating(true);
    setBcTranslations(null);

    try {
      const data = await aiService.fetchTranslateBroadcast(
        bcInput,
        bcSeverity,
        venue.id
      );
      setBcTranslations(data);
    } catch (err) {
      console.error(err);
      alert("Translation system busy. Please attempt again.");
    } finally {
      setBcTranslating(false);
    }
  };

  // Send the Broadcast to active database
  const handleSendBroadcast = async () => {
    if (!bcTranslations) return;

    if (bcSeverity === "urgent" && !bcConfirmUrgent) {
      setBcConfirmUrgent(true);
      return;
    }

    try {
      const data = await dbService.addBroadcast({
        venueId: venue.id,
        severity: bcSeverity,
        original: bcInput,
        translations: bcTranslations,
      });
      if (data.success) {
        alert("Broadcast successfully transmitted to visual displays and Fan Companion PWAs!");
        setBcInput("");
        setBcTranslations(null);
        setBcConfirmUrgent(false);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Compile Post Match Report MD
  const handleCompileReport = async () => {
    setReportLoading(true);
    setReportMarkdown("");

    try {
      const data = await aiService.fetchPostMatchReport(venue.id);
      setReportMarkdown(data.markdown);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  // Download Markdown utility
  const handleDownloadReport = () => {
    const blob = new Blob([reportMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `post-match-report-${venue.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      {/* Staff Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-command-navy border border-slate-800 p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-alert-red/20 text-alert-red rounded-sm border border-alert-red/50 shadow-[0_0_10px_rgba(230,57,70,0.5)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold tracking-wider text-alert-red font-mono uppercase">COMMAND CENTER OPERATIONS</h2>
            <p className="text-xs text-slate-400">Live Heatmaps & AI Safety Directives</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("heatmap")}
            className={`px-4 py-2 border text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer rounded-sm ${
              activeTab === "heatmap"
                ? "bg-pitch border-live-amber text-chalk shadow-md border-b-2"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-500"
            }`}
          >
            HEATMAPS
          </button>
          <button
            onClick={() => setActiveTab("copilot")}
            className={`px-4 py-2 border text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer rounded-sm ${
              activeTab === "copilot"
                ? "bg-pitch border-live-amber text-chalk shadow-md border-b-2"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-500"
            }`}
          >
            COPILOT CHAT
          </button>
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`px-4 py-2 border text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer rounded-sm ${
              activeTab === "broadcast"
                ? "bg-pitch border-live-amber text-chalk shadow-md border-b-2"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-500"
            }`}
          >
            BROADCASTS
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2 border text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer rounded-sm ${
              activeTab === "report"
                ? "bg-pitch border-live-amber text-chalk shadow-md border-b-2"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-500"
            }`}
          >
            POST-REPORT
          </button>
        </div>
      </div>

      {/* 1. Heatmap tab */}
      {activeTab === "heatmap" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Grid: Zones Heatmap & Trends */}
          <div className="lg:col-span-8 bg-command-navy border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-mono text-xs font-extrabold text-chalk tracking-wider uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-alert-red" />
                CONCOURSE DENSITY METRICS (15-MIN SPARKLINE DRIFT)
              </h3>
              <span className="text-[9px] bg-alert-red/20 text-alert-red border border-alert-red/50 px-2.5 py-0.5 rounded-sm font-mono font-bold">
                AUTO CRON SENSORS
              </span>
            </div>

            <div className="space-y-3">
              {zones.map((zone) => {
                const density = zone.currentDensityPct;
                const statusColor = density > 85 ? "bg-alert-red" : density > 60 ? "bg-live-amber" : "bg-signal-blue";
                const borderAccent = density > 85 ? "border-alert-red/50 bg-alert-red/10" : density > 60 ? "border-live-amber/50 bg-live-amber/10" : "border-slate-800 bg-slate-900";

                // Generate a micro SVG sparkline trend graph
                const points = zone.history || [50, 52, 54, 56, 52, 50, 48, 51, 55, 60, 62, 65, 70, 75, 80];
                const width = 120;
                const height = 24;
                const step = width / (points.length - 1);
                const maxVal = Math.max(...points, 100);
                const minVal = 0;
                const svgPoints = points
                  .map((val, idx) => {
                    const x = idx * step;
                    const y = height - ((val - minVal) / (maxVal - minVal)) * height;
                    return `${x},${y}`;
                  })
                  .join(" ");

                return (
                  <div key={zone.id} className={`p-4 rounded-md border ${borderAccent} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`w-3 h-3 rounded-full ${statusColor} shrink-0 ${density > 85 ? 'animate-pulse' : ''}`}></span>
                      <div>
                        <h4 className="text-xs font-bold font-mono text-chalk">{zone.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">Sensor node: #{zone.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between">
                      {/* Interactive Sparkline inline SVG */}
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-slate-500 mb-1">15-MIN TREND</span>
                        <svg width={width} height={height} className="overflow-visible">
                          <polyline
                            fill="none"
                            stroke={density > 85 ? "#E63946" : density > 60 ? "#FF9F1C" : "#4CC9F0"}
                            strokeWidth="1.5"
                            points={svgPoints}
                          />
                        </svg>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-display tracking-wider font-bold ${density > 85 ? "text-alert-red" : density > 60 ? "text-live-amber" : "text-signal-blue"}`}>
                          {density}% DENSITY
                        </span>
                        <p className="text-[9px] font-mono text-slate-500 font-medium">Flow Level: {density > 85 ? "CRITICAL" : density > 60 ? "ELEVATED" : "OPTIMAL"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Visual Camera scan block */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-md flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <span className="text-[9px] font-mono text-live-amber bg-live-amber/20 px-2.5 py-0.5 rounded-sm border border-live-amber/50 font-bold">
                  CAMERA DIRECTIVES
                </span>
                <h4 className="text-xs font-bold font-mono text-chalk mt-2">AI Visual Security Scanning Feed (Beta)</h4>
                <p className="text-xs text-slate-500">Simulate Vision models analyzing crowd blockages in real-time concourse angles.</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleRunVisualCheck}
                  className="px-4 py-2.5 bg-pitch hover:bg-emerald-900 border border-live-amber/50 text-xs font-mono font-bold text-chalk rounded-sm cursor-pointer transition-all"
                  disabled={visualCheckRunning}
                >
                  {visualCheckRunning ? "SCANNING STREAM..." : "RUN AI VISUAL SCAN"}
                </button>
              </div>
            </div>

            {visualCheckResult && (
              <div className="bg-alert-red/10 border border-alert-red/50 p-4 rounded-md text-xs text-alert-red font-mono leading-relaxed">
                {visualCheckResult}
              </div>
            )}
          </div>

          {/* Active Incidents Logging */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-command-navy border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-mono text-xs font-extrabold text-chalk tracking-wider uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-alert-red" />
                ACTIVE ALERTS & EVENTS ({incidents.filter((i) => i.status === "active").length})
              </h3>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {incidents.filter((i) => i.status === "active").length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center font-medium">No active incident logs.</p>
                ) : (
                  incidents
                    .filter((i) => i.status === "active")
                    .map((inc) => (
                      <div key={inc.id} className="p-3.5 bg-alert-red/10 border border-alert-red/50 rounded-md space-y-2">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-alert-red font-extrabold uppercase">{inc.type.replace("_", " ")}</span>
                          <span className="text-slate-400">{new Date(inc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-xs text-chalk leading-relaxed font-mono">
                          "{inc.description}"
                        </p>
                        <div className="flex justify-between items-center pt-2 border-t border-alert-red/50">
                          <span className="text-[10px] text-slate-500 font-mono">By: {inc.reportedBy}</span>
                          <button
                            onClick={() => handleResolveIncident(inc.id)}
                            className="px-2.5 py-1 bg-alert-red text-chalk rounded-sm text-[9px] font-mono font-bold cursor-pointer transition-colors shadow-sm"
                          >
                            RESOLVE EVENT
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Manual incident form */}
            <form onSubmit={handleAddIncident} className="bg-command-navy border border-slate-800 p-5 rounded-xl space-y-3 shadow-sm">
              <h3 className="font-mono text-xs font-extrabold text-chalk uppercase">LOG MANUAL OPERATIONS INCIDENT</h3>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase">INCIDENT TYPE</label>
                <select
                  value={incType}
                  onChange={(e: any) => setIncType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-sm text-chalk mt-1 outline-none focus:border-alert-red transition-colors font-mono font-semibold"
                >
                  <option value="crowd_warning">Crowd Congestion warning</option>
                  <option value="medical">Medical Response team</option>
                  <option value="accessibility">Accessibility barrier</option>
                  <option value="security">Security escalation</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase">SEVERITY LEVEL</label>
                <select
                  value={incSeverity}
                  onChange={(e: any) => setIncSeverity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-sm text-chalk mt-1 outline-none focus:border-alert-red transition-colors font-mono font-semibold"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium alert</option>
                  <option value="high">High emergency</option>
                  <option value="emergency">Critical panic</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase">EVENT DESCRIPTION</label>
                <textarea
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  rows={2}
                  placeholder="Describe active physical event details..."
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-sm text-chalk mt-1 outline-none focus:border-alert-red transition-colors font-mono font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-alert-red hover:bg-red-700 text-chalk rounded-sm text-xs font-mono font-bold cursor-pointer transition-all shadow-sm"
              >
                LOG OPERATIONAL EVENT
              </button>
            </form>

            {/* Interactive Stadium Gates Load-Balancer SVG Card */}
            <div className="bg-command-navy border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
              <div>
                <h3 className="font-mono text-xs font-extrabold text-chalk tracking-wider uppercase flex items-center gap-2">
                  🛡️ STADIUM GATES & FLOW ROUTING
                </h3>
                <p className="text-[11px] text-slate-400">
                  Click on any Gate node on the circular stadium schematic to adjust active inflow rates or trigger emergency reroutes.
                </p>
              </div>

              {/* Interactive SVG Schematic */}
              <div className="relative w-full aspect-square max-w-[240px] mx-auto bg-slate-900 rounded-md border border-slate-800 p-2 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Outer Stadium Concourse Ring */}
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#1e293b" strokeWidth="4" />
                  {/* Inner Stadium Seating Oval */}
                  <ellipse cx="100" cy="100" rx="55" ry="40" fill="#0B3D2E" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" />
                  <text x="100" y="103" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-mono uppercase tracking-widest opacity-80">Pitch</text>

                  {/* Gate Nodes */}
                  {[
                    { id: "v1-g-1", name: "Gate 1 (North)", cx: 100, cy: 15, color: "#4CC9F0", link: "M 100 15 L 100 60" },
                    { id: "v1-g-2", name: "Gate 2 (East)", cx: 185, cy: 100, color: "#4CC9F0", link: "M 185 100 L 155 100" },
                    { id: "v1-g-3", name: "Gate 3 (South)", cx: 100, cy: 185, color: "#FF9F1C", link: "M 100 185 L 100 140" },
                    { id: "v1-g-4", name: "Gate 4 (West)", cx: 15, cy: 100, color: "#E63946", link: "M 15 100 L 45 100" },
                  ].map((gate) => {
                    const isSelected = selectedStaffGate === gate.id;
                    const isRerouted = activeGateReroute === gate.id;
                    
                    return (
                      <g key={gate.id} className="cursor-pointer group" onClick={() => setSelectedStaffGate(gate.id)}>
                        {/* Connecting flow lines to seats */}
                        <path 
                          d={gate.link} 
                          fill="none" 
                          stroke={isRerouted ? "#E63946" : isSelected ? "#4CC9F0" : "#334155"} 
                          strokeWidth="2.5" 
                          strokeDasharray={isSelected ? "4 2" : "none"}
                          className={isSelected ? "animate-[dash_8s_linear_infinite]" : ""}
                          opacity="0.8" 
                        />
                        
                        {/* Interactive Gate Circle */}
                        <circle 
                          cx={gate.cx} 
                          cy={gate.cy} 
                          r={isSelected ? "11" : "8"} 
                          fill={isRerouted ? "#E63946" : gate.color} 
                          stroke={isSelected ? "#ffffff" : "none"} 
                          strokeWidth="2" 
                          className="transition-all duration-300 hover:scale-125 drop-shadow-[0_0_5px_currentColor]"
                        />
                        
                        {/* Text labels */}
                        <text 
                          x={gate.cx} 
                          y={gate.cy < 100 ? gate.cy - 5 : gate.cy + 13} 
                          fill="#ffffff" 
                          fontSize="7" 
                          fontWeight="bold" 
                          textAnchor="middle" 
                          className="font-mono font-extrabold select-none bg-slate-800 px-1 py-0.5 rounded"
                        >
                          G{gate.id.charAt(gate.id.length - 1)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Gate Controller Info Panel */}
              {selectedStaffGate && (
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-md space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">SELECTED ACCESS NODE</span>
                    <span className="text-[10px] bg-signal-blue/20 border border-signal-blue/50 text-signal-blue px-2 py-0.5 rounded-sm font-mono font-bold">
                      {selectedStaffGate === "v1-g-1" ? "GATE 1" : selectedStaffGate === "v1-g-2" ? "GATE 2" : selectedStaffGate === "v1-g-3" ? "GATE 3" : "GATE 4"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-mono">Simulated Inflow Load:</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="10" 
                        max="350" 
                        value={gateInflowRates[selectedStaffGate] || 100} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setGateInflowRates((p) => ({ ...p, [selectedStaffGate]: val }));
                        }}
                        className="flex-1 accent-signal-blue cursor-pointer" 
                      />
                      <span className="text-xs font-mono font-bold text-chalk shrink-0 w-16 text-right">
                        {gateInflowRates[selectedStaffGate]} f/m
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => {
                        const nextReroute = activeGateReroute === selectedStaffGate ? "" : selectedStaffGate;
                        setActiveGateReroute(nextReroute);
                        if (nextReroute) {
                          alert(`Gate ${selectedStaffGate.charAt(selectedStaffGate.length - 1)} has been marked as congested. Turnstiles are dynamically rerouting fans to adjacent entrances.`);
                        } else {
                          alert(`Gate ${selectedStaffGate.charAt(selectedStaffGate.length - 1)} flow rerouting cancelled. Standard access lines reinstated.`);
                        }
                      }}
                      className={`flex-1 py-1.5 rounded-sm text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                        activeGateReroute === selectedStaffGate 
                          ? "bg-alert-red border-red-700 text-chalk" 
                          : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-alert-red"
                      }`}
                    >
                      ⚠️ {activeGateReroute === selectedStaffGate ? "CANCEL REROUTE" : "TRIGGER REROUTE"}
                    </button>
                    <button
                      onClick={() => {
                        setGateInflowRates((p) => ({ ...p, [selectedStaffGate]: 60 }));
                        alert(`Turnstiles at Gate ${selectedStaffGate.charAt(selectedStaffGate.length - 1)} speed throttled to optimize security checking line flow.`);
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-chalk py-1.5 rounded-sm text-[10px] font-mono font-bold cursor-pointer transition-colors"
                    >
                      ⏳ THROTTLE FLOW
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Copilot Chat Tab */}
      {activeTab === "copilot" && (
        <div className="bg-command-navy border border-slate-800 p-6 rounded-xl space-y-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-mono text-sm font-extrabold tracking-wide text-chalk">
                🏢 OPERATIONS DECISION SUPPORT CO-PILOT
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Confer with the Gemini Operations assistant to analyze gates and request safety adjustments.
              </p>
            </div>
            <span className="text-[10px] bg-alert-red/20 text-alert-red border border-alert-red/50 px-2.5 py-0.5 rounded-sm font-mono font-bold uppercase">
              READ-ONLY TOOLS ACTIVE
            </span>
          </div>

          {/* Chat log */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto p-3 border border-slate-800 rounded-md bg-slate-900">
            {copilotHistory.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-md text-xs leading-relaxed font-mono ${
                item.role === "user"
                  ? "bg-pitch border border-live-amber/50 text-chalk max-w-[80%] ml-auto shadow-sm"
                  : "bg-command-navy border border-slate-800 text-slate-300 max-w-[85%] shadow-sm"
              }`}>
                <div className="font-mono text-[10px] text-slate-500 font-bold uppercase mb-1">
                  {item.role === "user" ? "You (Staff Operator)" : "Gemini Copilot"}
                </div>
                <div className="font-medium text-sm">{item.text}</div>

                {/* Copilot Actionable Suggestion */}
                {item.action && (
                  <div className="mt-3 p-4 bg-alert-red/10 border border-alert-red/50 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] font-mono text-alert-red font-extrabold uppercase tracking-wide bg-alert-red/20 border border-alert-red/50 px-2.5 py-0.5 rounded-sm">
                        SUGGESTED DISPATCH COMMAND
                      </span>
                      <h4 className="text-xs font-bold text-chalk mt-1 font-mono">{item.action.title}</h4>
                    </div>

                    <button
                      onClick={() => handleApproveAction(item.action.targetGateId, item.action.title)}
                      className={`px-4 py-2 font-mono text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer transition-all shadow-sm ${
                        approvedActions.includes(item.action.targetGateId)
                          ? "bg-slate-900 text-live-amber border border-live-amber cursor-not-allowed"
                          : "bg-alert-red hover:bg-red-700 text-chalk"
                      }`}
                      disabled={approvedActions.includes(item.action.targetGateId)}
                    >
                      {approvedActions.includes(item.action.targetGateId) ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> COMMAND EXECUTED
                        </>
                      ) : (
                        "APPROVE ACTION"
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {copilotLoading && (
              <div className="flex items-center gap-1.5 text-signal-blue text-xs font-mono p-1">
                <span className="w-1.5 h-1.5 bg-signal-blue rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-signal-blue rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-signal-blue rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span>Calculating crowd matrices...</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendCopilotMessage()}
              placeholder="Ask: 'Which gates need more staff?' or 'Analyze South Gate congestion'..."
              className="flex-1 bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-sm text-chalk outline-none focus:border-alert-red font-mono font-medium"
            />
            <button
              onClick={handleSendCopilotMessage}
              className="px-5 bg-alert-red hover:bg-red-700 text-chalk rounded-sm text-xs font-mono font-bold cursor-pointer transition-colors"
            >
              SEND
            </button>
          </div>
        </div>
      )}

      {/* 3. Broadcast Generator Tab */}
      {activeTab === "broadcast" && (
        <div className="bg-command-navy border border-slate-800 p-6 rounded-xl space-y-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wide text-chalk">
                📢 MULTILINGUAL BROADCAST GENERATOR
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Author an alert once and generate four channel alignments in English, Spanish, and French simultaneously.
              </p>
            </div>
            <span className="text-[10px] bg-alert-red/20 text-alert-red border border-alert-red/50 px-2.5 py-0.5 rounded-sm font-mono font-bold uppercase">
              3 HOST NATIONS TRANSCRIPT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1.5 font-bold">ENTER PLAIN WARNING ALERT</label>
                <textarea
                  value={bcInput}
                  onChange={(e) => setBcInput(e.target.value)}
                  rows={4}
                  placeholder="Enter raw operational message..."
                  className="w-full bg-slate-900 border border-slate-800 p-3 text-xs rounded-sm text-chalk outline-none focus:border-live-amber font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1.5 font-bold">SEVERITY PROTOCOL</label>
                <div className="flex gap-2">
                  {["info", "advisory", "urgent"].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setBcSeverity(sev as any)}
                      className={`flex-1 py-2 rounded-sm font-mono text-[10px] font-bold border uppercase transition-all cursor-pointer ${
                        bcSeverity === sev
                          ? sev === "urgent"
                            ? "bg-alert-red/20 border-alert-red text-alert-red"
                            : "bg-live-amber/20 border-live-amber text-live-amber"
                          : "bg-slate-900 border-slate-800 text-slate-500 hover:text-chalk hover:bg-slate-800"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTranslateBroadcast}
                className="w-full py-3 bg-live-amber hover:bg-amber-600 text-slate-900 rounded-sm text-xs font-mono font-bold tracking-wider cursor-pointer shadow-sm transition-all"
                disabled={bcTranslating}
              >
                {bcTranslating ? "OPTIMIZING TRANSLATIONS..." : "PREPARE 12-CHANNEL DISPATCH"}
              </button>
            </div>

            {/* Translation Output Grid */}
            <div className="md:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-md flex flex-col justify-between shadow-sm">
              {bcTranslations ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono text-slate-500 font-bold">12-CHANNEL PARALLEL MATRIX</span>
                    <span className="text-[10px] text-signal-blue font-mono bg-signal-blue/20 px-2.5 py-0.5 border border-signal-blue/50 rounded-sm font-bold">
                      Ready to transmit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* EN */}
                    <div className="bg-command-navy p-4 rounded-md border border-slate-800 space-y-3 shadow-sm">
                      <span className="text-[10px] font-mono font-bold text-signal-blue border-b border-slate-800 pb-1.5 block">
                        ENGLISH 🇺🇸
                      </span>
                      <div className="space-y-2 text-[10px] text-slate-300 font-sans font-medium">
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Audio PA:</span>
                          <p className="leading-tight">"{bcTranslations.en?.pa || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Push Text (140c):</span>
                          <p className="leading-tight text-live-amber font-semibold">"{bcTranslations.en?.push || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Caption Board:</span>
                          <p className="leading-tight font-semibold text-chalk">"{bcTranslations.en?.caption || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Cognitive Assist (Simple):</span>
                          <p className="leading-tight italic text-slate-400">"{bcTranslations.en?.simple || "..."}"</p>
                        </div>
                      </div>
                    </div>

                    {/* ES */}
                    <div className="bg-command-navy p-4 rounded-md border border-slate-800 space-y-3 shadow-sm">
                      <span className="text-[10px] font-mono font-bold text-signal-blue border-b border-slate-800 pb-1.5 block">
                        SPANISH 🇪🇸
                      </span>
                      <div className="space-y-2 text-[10px] text-slate-300 font-sans font-medium">
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Audio PA:</span>
                          <p className="leading-tight">"{bcTranslations.es?.pa || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Push Text (140c):</span>
                          <p className="leading-tight text-live-amber font-semibold">"{bcTranslations.es?.push || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Caption Board:</span>
                          <p className="leading-tight font-semibold text-chalk">"{bcTranslations.es?.caption || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Cognitive Assist (Simple):</span>
                          <p className="leading-tight italic text-slate-400">"{bcTranslations.es?.simple || "..."}"</p>
                        </div>
                      </div>
                    </div>

                    {/* FR */}
                    <div className="bg-command-navy p-4 rounded-md border border-slate-800 space-y-3 shadow-sm">
                      <span className="text-[10px] font-mono font-bold text-signal-blue border-b border-slate-800 pb-1.5 block">
                        FRENCH 🇫🇷
                      </span>
                      <div className="space-y-2 text-[10px] text-slate-300 font-sans font-medium">
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Audio PA:</span>
                          <p className="leading-tight">"{bcTranslations.fr?.pa || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Push Text (140c):</span>
                          <p className="leading-tight text-live-amber font-semibold">"{bcTranslations.fr?.push || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Caption Board:</span>
                          <p className="leading-tight font-semibold text-chalk">"{bcTranslations.fr?.caption || "..."}"</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">Cognitive Assist (Simple):</span>
                          <p className="leading-tight italic text-slate-400">"{bcTranslations.fr?.simple || "..."}"</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                    {bcSeverity === "urgent" && bcConfirmUrgent && (
                      <div className="p-4 bg-alert-red/20 border border-alert-red/50 rounded-sm flex justify-between items-center text-xs text-alert-red font-bold">
                        <span className="font-mono">⚠️ Confirmation Required: Send urgent broadcast to stadium?</span>
                        <button
                          onClick={handleSendBroadcast}
                          className="px-4 py-1.5 bg-alert-red hover:bg-red-700 text-chalk font-extrabold font-mono rounded-sm transition-all shadow-sm"
                        >
                          YES, SEND NOW
                        </button>
                      </div>
                    )}

                    {(!bcConfirmUrgent || bcSeverity !== "urgent") && (
                      <button
                        onClick={handleSendBroadcast}
                        className="w-full py-3 bg-signal-blue hover:bg-blue-600 text-slate-900 text-xs font-mono font-bold rounded-sm cursor-pointer transition-colors shadow-sm"
                      >
                        TRANSMIT BROADCAST ON ALL NETWORKS
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full py-16 text-slate-500">
                  <Languages className="w-8 h-8 text-slate-500" />
                  <p className="text-xs font-mono mt-2">Author and optimize message translation to view column boards.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Post-Match report tab */}
      {activeTab === "report" && (
        <div className="bg-command-navy border border-slate-800 p-6 rounded-xl space-y-6 shadow-sm">
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wide text-chalk">
              📊 PREDICTIVE POST-MATCH OPERATIONAL REPORTS
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Analyze tournament match incidents, sustainability CO2 logs, and support dispatches to generate an official downloadable Markdown report.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-md flex flex-col justify-between space-y-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <div>
                <span className="text-[9px] font-mono text-signal-blue bg-signal-blue/20 px-2.5 py-0.5 rounded-sm border border-signal-blue/50 font-bold">
                  METRICS SUMMARY
                </span>
                <div className="space-y-2 mt-4 font-mono text-xs text-slate-400 font-semibold">
                  <div className="flex justify-between">
                    <span>Venue Name:</span>
                    <strong className="text-chalk">{venue.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Incident Count:</span>
                    <strong className="text-alert-red">{incidents.length} Events</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Support Requests Handled:</span>
                    <strong className="text-live-amber">{helpRequests.length} Dispatches</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tournament CO2 Offset:</span>
                    <strong className="text-signal-blue font-extrabold">
                      {helpRequests.reduce((acc, h) => acc + (h.status === "resolved" ? 1.5 : 0), 3.2).toFixed(1)} kg saved
                    </strong>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCompileReport}
                className="w-full py-3 bg-signal-blue hover:bg-blue-600 text-slate-900 rounded-sm text-xs font-mono font-bold cursor-pointer shadow-sm transition-all"
                disabled={reportLoading}
              >
                {reportLoading ? "COMPILING SYSTEM TELEMETRY..." : "COMPILE POST-MATCH MARKDOWN REPORT"}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-md flex flex-col justify-between min-h-[300px]">
              {reportMarkdown ? (
                <div className="space-y-4 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono text-slate-500">MARKDOWN PREVIEW</span>
                    <button
                      onClick={handleDownloadReport}
                      className="flex items-center gap-1.5 text-xs text-signal-blue hover:text-blue-400 font-mono font-extrabold cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> DOWNLOAD .MD
                    </button>
                  </div>

                  <div className="bg-command-navy p-4 rounded-sm text-[11px] font-mono text-slate-300 overflow-y-auto max-h-[220px] whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    {reportMarkdown}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full py-16 text-slate-500">
                  <FileText className="w-8 h-8 text-slate-500" />
                  <p className="text-xs font-mono mt-2">Trigger report generator compilation to view markdown file.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
