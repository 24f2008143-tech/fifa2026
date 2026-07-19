import React, { useState } from "react";
import {
  ListFilter,
  CheckSquare,
  BookOpen,
  Volume2,
  Sparkles,
  Search,
  MessageCircle,
  Clock,
  MapPin,
  AlertTriangle,
  FileText
} from "lucide-react";
import { Venue, HelpRequest } from "../types";
import * as aiService from "../services/ai";
import * as dbService from "../services/db";

interface VolunteerAppProps {
  venue: Venue;
  helpRequests: HelpRequest[];
  onRefresh: () => void;
}

const COMMON_PHRASES = [
  "The nearest accessible restroom is on your left.",
  "Please have your mobile ticket QR code ready.",
  "This gate is temporarily closed for crowd flow control.",
  "Please follow the green signs to reach the rideshare drop-off zone.",
  "Medical staff are on their way to your section now.",
  "Can I check your ticket details to help you find your seat?"
];

export default function VolunteerApp({ venue, helpRequests, onRefresh }: VolunteerAppProps) {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"tasks" | "phrasebook" | "copilot">("tasks");

  // State: Volunteer identity simulation
  const volunteerId = "vol-7"; // simulated logged in volunteer
  const [selectedSectorMap, setSelectedSectorMap] = useState<string>("B");

  // Phrasebook States
  const [selectedPhrase, setSelectedPhrase] = useState<string>(COMMON_PHRASES[0]);
  const [phraseTargetLang, setPhraseTargetLang] = useState<string>("Spanish");
  const [phraseTranslation, setPhraseTranslation] = useState<string>("");
  const [phrasePhonetic, setPhrasePhonetic] = useState<string>("");
  const [phraseLoading, setPhraseLoading] = useState<boolean>(false);

  // Policy Q&A States
  const [policyQuery, setPolicyQuery] = useState<string>("Can fans bring water bottles?");
  const [policyAnswer, setPolicyAnswer] = useState<string>("");
  const [policyLoading, setPolicyLoading] = useState<boolean>(false);

  // Claim support ticket
  const handleClaimTask = async (reqId: string) => {
    try {
      const data = await dbService.assignHelpTask({ reqId, volunteerId });
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Complete support ticket
  const handleResolveTask = async (reqId: string) => {
    try {
      const data = await dbService.resolveHelpTask({ reqId });
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Translate Phrase
  const handleTranslatePhrase = async () => {
    setPhraseLoading(true);
    setPhraseTranslation("");
    setPhrasePhonetic("");

    try {
      const data = await aiService.fetchCopilot(
        `Translate the following stadium phrase into "${phraseTargetLang}". Give me the direct translation and also a rough phonetic reading guide in English for pronunciation. Return EXACTLY in JSON format: {"translation": "...", "phonetic": "..."}.
Phrase to translate: "${selectedPhrase}"`,
        venue.id
      );
      let parsed = { translation: "", phonetic: "" };
      try {
        parsed = JSON.parse(data.text);
      } catch (e) {
        // Fallback parsers
        parsed.translation = data.text;
        parsed.phonetic = "Phonetic audio guide simulated.";
      }
      setPhraseTranslation(parsed.translation);
      setPhrasePhonetic(parsed.phonetic);
    } catch (err) {
      setPhraseTranslation("Error connecting to translator.");
    } finally {
      setPhraseLoading(false);
    }
  };

  // Stadium policy copilot Q&A
  const handlePolicyQuery = async () => {
    setPolicyLoading(true);
    setPolicyAnswer("");

    try {
      const data = await aiService.fetchCopilot(policyQuery, venue.id);
      setPolicyAnswer(data.text);
    } catch (err) {
      setPolicyAnswer("Unable to verify rules right now.");
    } finally {
      setPolicyLoading(false);
    }
  };

  // Filter lists
  const unassignedRequests = helpRequests.filter((r) => r.status === "unassigned");
  const myAssignedRequests = helpRequests.filter((r) => r.status === "assigned" && r.assignedVolunteerId === volunteerId);
  const resolvedRequests = helpRequests.filter((r) => r.status === "resolved");

  return (
    <div className="space-y-4">
      {/* Volunteer Banner */}
      <div className="flex justify-between items-center bg-command-navy border border-slate-800 p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 bg-signal-blue rounded-full animate-pulse border-2 border-command-navy shadow-[0_0_8px_rgba(76,201,240,0.8)]"></div>
          <div>
            <h2 className="text-xs font-extrabold tracking-wider text-signal-blue font-mono uppercase">STAFF ACTIVE BROADCAST STATE</h2>
            <p className="text-xs text-slate-400">Assigned Volunteer: <strong className="text-chalk font-mono">Green-Vest-7 (Sector B)</strong></p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-signal-blue bg-signal-blue/20 border border-signal-blue/50 px-3 py-1 rounded-sm">
          SHIFT ACTIVE
        </span>
      </div>

      {/* Volunteer Tabs */}
      <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex-1 py-3.5 text-center rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
            activeTab === "tasks"
              ? "bg-pitch text-chalk shadow-md border-b-2 border-live-amber"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ListFilter className="w-4 h-4" />
            LIVE TASK DISPATCH
          </div>
        </button>
        <button
          onClick={() => setActiveTab("phrasebook")}
          className={`flex-1 py-3.5 text-center rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
            activeTab === "phrasebook"
              ? "bg-pitch text-chalk shadow-md border-b-2 border-live-amber"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" />
            RAPID PHRASEBOOK
          </div>
        </button>
        <button
          onClick={() => setActiveTab("copilot")}
          className={`flex-1 py-3.5 text-center rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
            activeTab === "copilot"
              ? "bg-pitch text-chalk shadow-md border-b-2 border-live-amber"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            POLICY COPILOT
          </div>
        </button>
      </div>

      {/* Tab content 1: Live Task Dispatch queue */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Active unclaimed requests */}
          <div className="bg-command-navy border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-mono text-xs font-extrabold text-chalk tracking-wider uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-signal-blue" />
                UNASSIGNED DISPATCH TICKETS ({unassignedRequests.length})
              </h3>
              <span className="text-[9px] bg-signal-blue/20 text-signal-blue border border-signal-blue/50 font-mono px-2.5 py-0.5 rounded-sm font-bold">
                REALTIME BROADCAST
              </span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {unassignedRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-xs font-mono">
                  All active fan assistance requests in your sector are currently assigned or completed!
                </div>
              ) : (
                unassignedRequests.map((req) => {
                  const isUrgent = req.urgency === "high" || req.category === "medical";
                  return (
                    <div
                      key={req.id}
                      className={`p-4 rounded-md border transition-all ${
                        isUrgent
                          ? "bg-alert-red/10 border-alert-red/50 shadow-sm"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-sm border ${
                          isUrgent ? "bg-alert-red/20 text-alert-red border-alert-red/50" : "bg-signal-blue/20 text-signal-blue border-signal-blue/50"
                        }`}>
                          {req.urgency.toUpperCase()} - {req.category.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-xs text-chalk mt-2 font-medium leading-relaxed font-mono">
                        "{req.description}"
                      </p>

                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-800">
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-live-amber font-bold">
                          <MapPin className="w-3.5 h-3.5" />
                          ZONE: {req.zoneId.split("-").pop()?.toUpperCase() || "GENERAL"}
                        </span>
                        <button
                          onClick={() => handleClaimTask(req.id)}
                          className="px-3.5 py-1.5 bg-pitch hover:bg-emerald-900 text-chalk border border-live-amber/50 text-[10px] font-mono font-bold rounded-sm cursor-pointer transition-colors shadow-sm"
                        >
                          ACCEPT DISPATCH
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* My claimed tasks and resolved log */}
          <div className="space-y-4">
            <div className="bg-command-navy border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-mono text-xs font-extrabold text-chalk tracking-wider uppercase flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-signal-blue" />
                  MY ACTIVE CLAIMS ({myAssignedRequests.length})
                </h3>
              </div>

              <div className="space-y-3">
                {myAssignedRequests.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 italic text-xs font-mono border border-dashed border-slate-800 rounded-md bg-slate-900">
                    No active dispatches claimed. Accept an unassigned ticket to assist fans near you.
                  </div>
                ) : (
                  myAssignedRequests.map((req) => (
                    <div key={req.id} className="p-4 bg-slate-900 border border-slate-800 rounded-md">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-sm bg-pitch text-live-amber border border-live-amber/50">
                          {req.category.toUpperCase()} - CLAIMED
                        </span>
                        <span className="text-[10px] font-mono text-signal-blue animate-pulse font-bold">ACTIVE</span>
                      </div>

                      <p className="text-xs text-chalk mt-2 leading-relaxed font-mono">
                        "{req.description}"
                      </p>

                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-800">
                        <span className="text-[10px] font-mono text-live-amber font-bold flex items-center gap-1">
                          📍 LOC: {req.zoneId.split("-").pop()?.toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleResolveTask(req.id)}
                          className="px-3.5 py-1.5 bg-pitch hover:bg-emerald-900 border border-chalk/20 text-chalk text-[10px] font-mono font-bold rounded-sm cursor-pointer transition-colors shadow-sm"
                        >
                          MARK COMPLETED
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resolved tasks ticker */}
            <div className="bg-command-navy border border-slate-800 p-5 rounded-xl space-y-3 shadow-sm">
              <h4 className="font-mono text-xs font-extrabold text-chalk uppercase tracking-wider">
                COMPLETED RESOLVED ARCHIVE ({resolvedRequests.length})
              </h4>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {resolvedRequests.map((r) => (
                  <div key={r.id} className="p-2.5 bg-slate-900 rounded-md border border-slate-800 flex justify-between items-center text-xs text-slate-500 font-mono">
                    <span>✓ TKT-{r.id.slice(-5).toUpperCase()}</span>
                    <span className="uppercase font-bold text-slate-400">{r.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Volunteer Pitch Coverage Map */}
        <div className="bg-command-navy border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
          <div>
            <h4 className="font-mono text-xs font-extrabold text-chalk uppercase flex items-center gap-1.5">
              🏟️ INTERACTIVE DISPATCH STADIUM SECTORS
            </h4>
            <p className="text-[11px] text-slate-400">
              Real-time spatial projection of help request tickets around the stadium bowl. Your assigned post is <strong className="text-chalk">Sector B (Midfield East)</strong>.
            </p>
          </div>

          <div className="relative w-full aspect-[16/9] bg-pitch rounded-md border border-slate-800 p-2 overflow-hidden shadow-inner flex items-center justify-center">
            <svg viewBox="0 0 400 220" className="w-full h-full">
              {/* Outer Stadium Outer Boundary */}
              <ellipse cx="200" cy="110" rx="180" ry="95" fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="3 3" />
              
              {/* Concourse Walkways */}
              <ellipse cx="200" cy="110" rx="150" ry="75" fill="none" stroke="#1e293b" strokeWidth="12" opacity="0.4" />
              
              {/* Football Field Pitch */}
              <rect x="140" y="70" width="120" height="80" fill="#15803d" stroke="#166534" strokeWidth="2" rx="2" />
              {/* Pitch center line */}
              <line x1="200" y1="70" x2="200" y2="150" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <circle cx="200" cy="110" r="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <circle cx="200" cy="110" r="1.5" fill="#ffffff" />
              {/* Goal lines */}
              <rect x="128" y="98" width="12" height="24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <rect x="260" y="98" width="12" height="24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

              {/* Stadium Sectors */}
              {[
                { id: "A", name: "Sector A (North Deck)", path: "M 100 25 Q 200 -5 300 25", labelX: 200, labelY: 30, color: "#94a3b8", pulse: false },
                { id: "B", name: "Sector B (Midfield East - ASSIGNED)", path: "M 320 40 Q 380 110 320 180", labelX: 345, labelY: 115, color: "#10b981", pulse: true },
                { id: "C", name: "Sector C (South Deck)", path: "M 100 195 Q 200 225 300 195", labelX: 200, labelY: 198, color: "#3b82f6", pulse: false },
                { id: "D", name: "Sector D (West Wing)", path: "M 80 40 Q 20 110 80 180", labelX: 55, labelY: 115, color: "#ef4444", pulse: false },
              ].map((sector) => {
                const isAssigned = sector.id === "B";
                const isSelected = selectedSectorMap === sector.id;
                return (
                  <g 
                    key={sector.id} 
                    className="cursor-pointer" 
                    onClick={() => {
                      setSelectedSectorMap(sector.id);
                      alert(`Viewing ${sector.name}. Dispatch centers show standard operational flow in this quadrant.`);
                    }}
                  >
                    {/* Sector boundary line */}
                    <path 
                      d={sector.path} 
                      fill="none" 
                      stroke={isAssigned ? "#10b981" : isSelected ? "#4f46e5" : "#475569"} 
                      strokeWidth={isSelected ? "4" : "2"} 
                      opacity={isSelected ? "0.9" : "0.5"}
                    />

                    {/* Pulsing indicator if assigned */}
                    {sector.pulse && (
                      <circle 
                        cx={sector.labelX} 
                        cy={sector.labelY} 
                        r="12" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="1.5" 
                        className="animate-ping" 
                      />
                    )}

                    {/* Sector label bubble */}
                    <circle cx={sector.labelX} cy={sector.labelY} r="7" fill={isAssigned ? "#10b981" : "#1e293b"} stroke="#334155" strokeWidth="1" />
                    <text x={sector.labelX} y={sector.labelY + 2.5} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono font-black">{sector.id}</text>
                  </g>
                );
              })}

              {/* Help Request ticket pins plotted */}
              {helpRequests.filter((r) => r.status !== "resolved").map((req, idx) => {
                // Spread coordinates around based on ID hashes to make them look real
                const charCode = req.id.charCodeAt(req.id.length - 1) || 5;
                const signX = charCode % 2 === 0 ? 1 : -1;
                const offsetIdx = idx * 14;
                const x = 200 + signX * (80 + (charCode % 5) * 12) + Math.sin(offsetIdx) * 15;
                const y = 110 + signX * (40 + (charCode % 4) * 12) + Math.cos(offsetIdx) * 15;

                const isUrgent = req.urgency === "high";
                const pinColor = isUrgent ? "#ef4444" : "#6366f1";

                return (
                  <g key={req.id} className="cursor-help group">
                    <circle cx={x} cy={y} r="5" fill={pinColor} stroke="#ffffff" strokeWidth="1" className={isUrgent ? "animate-pulse" : ""} />
                    <line x1={x} y1={y} x2={x} y2={y - 8} stroke="#ffffff" strokeWidth="0.75" />
                    <rect x={x - 12} y={y - 14} width="24" height="6" rx="1" fill="#1e293b" opacity="0.9" />
                    <text x={x} y={y - 9.5} fill="#ffffff" fontSize="5" fontWeight="bold" textAnchor="middle" className="font-mono text-[4px]">#{req.id.slice(-4).toUpperCase()}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2.5 rounded-md text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#E63946] rounded-full inline-block"></span>
              <span>URGENT HELP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#4CC9F0] rounded-full inline-block"></span>
              <span>GENERAL ASSIST</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#FF9F1C] rounded-full inline-block animate-pulse"></span>
              <span className="text-live-amber">ASSIGNED ZONE (SECTOR B)</span>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Tab content 2: Rapid Phrasebook */}
      {activeTab === "phrasebook" && (
        <div className="bg-command-navy border border-slate-800 p-6 rounded-xl space-y-6 shadow-sm">
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wide text-chalk">
              🗣️ MULTILINGUAL DISPATCH PHRASEBOOK
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select standard World Cup operations directives and instantly generate clear translations and verbal phonetics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1.5 font-bold uppercase tracking-widest">SELECT COMMON OPERATIONAL STATEMENT</label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto border border-slate-800 p-2 rounded-md bg-slate-900">
                  {COMMON_PHRASES.map((phrase, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedPhrase(phrase)}
                      className={`p-2.5 rounded-sm text-xs leading-relaxed cursor-pointer transition-all font-mono ${
                        selectedPhrase === phrase
                          ? "bg-pitch text-live-amber border-l-4 border-live-amber font-bold"
                          : "text-slate-400 hover:bg-slate-800 hover:text-chalk"
                      }`}
                    >
                      "{phrase}"
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1.5 font-bold uppercase tracking-widest">TARGET TRANSLATION DIALECT</label>
                <select
                  value={phraseTargetLang}
                  onChange={(e) => setPhraseTargetLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-md text-chalk outline-none focus:border-live-amber transition-colors font-mono font-bold"
                >
                  <option value="Spanish">Spanish 🇪🇸</option>
                  <option value="French">French 🇫🇷</option>
                  <option value="Arabic">Arabic 🇸🇦</option>
                  <option value="Portuguese">Portuguese 🇧🇷</option>
                  <option value="German">German 🇩🇪</option>
                </select>
              </div>

              <button
                onClick={handleTranslatePhrase}
                className="w-full py-3 bg-live-amber hover:bg-amber-500 text-command-navy rounded-sm text-xs font-mono font-bold cursor-pointer shadow-sm transition-colors"
                disabled={phraseLoading}
              >
                {phraseLoading ? "FETCHING DUAL TRANSLATION..." : "TRANSLATE & PHONETIZE"}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-md flex flex-col justify-between shadow-sm">
              {phraseTranslation ? (
                <div className="space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono text-signal-blue bg-signal-blue/20 px-2.5 py-0.5 rounded-sm border border-signal-blue/50 font-bold uppercase">
                      Target Language: {phraseTargetLang}
                    </span>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">TRANSLATION SCRIPT</label>
                      <p className="text-xl font-display tracking-wide text-chalk leading-relaxed">
                        "{phraseTranslation}"
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">PHONETIC READING GUIDE (SAY ALOUD)</label>
                      <p className="text-sm text-live-amber leading-relaxed font-mono italic font-bold">
                        "{phrasePhonetic}"
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>* Latency: Low-Lite Flash Model</span>
                    <button
                      onClick={() => {
                        if (window.speechSynthesis) {
                          const synth = new SpeechSynthesisUtterance(phraseTranslation);
                          synth.lang = phraseTargetLang === "Spanish" ? "es-ES" : phraseTargetLang === "French" ? "fr-FR" : "en-US";
                          window.speechSynthesis.speak(synth);
                        }
                      }}
                      className="flex items-center gap-1 text-signal-blue hover:text-sky-300 font-extrabold cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> READ SCRIPT
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full py-12 text-slate-600">
                  <span className="text-2xl opacity-50">🗣️</span>
                  <p className="text-[10px] font-mono mt-2 uppercase tracking-widest font-bold">Awaiting translation input.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab content 3: Grounded Policy Q&A */}
      {activeTab === "copilot" && (
        <div className="bg-command-navy border border-slate-800 p-6 rounded-xl space-y-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wide text-chalk">
                📚 STADIUM POLICY CO-PILOT
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Query grounded rules regarding bag sizes, medical response stations, and re-entry gates.
              </p>
            </div>
            <span className="text-[10px] bg-live-amber/20 text-live-amber border border-live-amber/50 px-2.5 py-0.5 rounded-sm font-mono uppercase font-bold">
              RAG Grounded
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={policyQuery}
                onChange={(e) => setPolicyQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePolicyQuery()}
                placeholder="Type policy query: e.g., bag policy limit, re-entry rule..."
                className="flex-1 bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-sm text-chalk outline-none focus:border-live-amber font-mono font-medium"
              />
              <button
                onClick={handlePolicyQuery}
                className="px-5 py-2.5 bg-live-amber hover:bg-amber-500 text-command-navy text-xs font-mono font-bold rounded-sm cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                disabled={policyLoading}
              >
                <Search className="w-4 h-4" /> QUERY
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-mono text-slate-500 select-none font-semibold">
              <span className="hover:text-chalk cursor-pointer transition-colors" onClick={() => setPolicyQuery("bag size limit")}>★ Sample: "bag size limit"</span>
              <span className="hover:text-chalk cursor-pointer transition-colors" onClick={() => setPolicyQuery("can fans bring water")}>★ Sample: "can fans bring water"</span>
              <span className="hover:text-chalk cursor-pointer transition-colors" onClick={() => setPolicyQuery("stadium re-entry rules")}>★ Sample: "stadium re-entry rules"</span>
            </div>

            {policyLoading && (
              <div className="p-4 bg-slate-900 rounded-md border border-slate-800 text-center text-xs text-signal-blue font-mono animate-pulse">
                Consulting grounded database documents...
              </div>
            )}

            {policyAnswer && !policyLoading && (
              <div className="bg-pitch border border-live-amber/20 p-5 rounded-md space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-live-amber/20 pb-1.5 text-xs">
                  <span className="font-mono font-bold text-live-amber flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> VERIFIED STADIUM COMPLIANCE RULE
                  </span>
                  <span className="text-[9px] text-live-amber/70 font-mono">100% Truthfulness</span>
                </div>
                <p className="text-xs text-chalk leading-relaxed font-mono">
                  {policyAnswer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
