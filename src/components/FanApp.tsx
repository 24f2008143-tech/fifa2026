import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Navigation,
  MapPin,
  AlertCircle,
  HelpCircle,
  Send,
  Volume2,
  VolumeX,
  Mic,
  CheckCircle2,
  Accessibility,
  Trees,
  Bus,
  Award,
  ChevronRight,
  Sparkles,
  Search
} from "lucide-react";
import LivePulseSchematic from "./LivePulseSchematic";
import { Venue, Gate, Zone, Incident, HelpRequest, Broadcast, Match } from "../types";
import * as aiService from "../services/ai";
import * as dbService from "../services/db";
import { useRealtimeTable } from "../../hooks/useRealtimeTable";

interface FanAppProps {
  venue: Venue;
  gates: Gate[];
  zones: Zone[];
  broadcasts: Broadcast[];
  matches: Match[];
  onRefresh: () => void;
}

export default function FanApp({ venue, gates, zones, broadcasts, matches, onRefresh }: FanAppProps) {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"nav" | "match" | "transport" | "sustainability">("nav");

  // Realtime subscriptions
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("p-1");

  const { rows: matchEvents } = useRealtimeTable<any>({
    table: "match_events",
  });

  const { rows: playerStats } = useRealtimeTable<any>({
    table: "player_stats",
    filter: selectedPlayerId ? `player_id=eq.${selectedPlayerId}` : undefined,
  });

  // Soccer Pitch Match Simulation state
  const [pitchBallPos, setPitchBallPos] = useState<{ x: number; y: number }>({ x: 200, y: 150 });
  const [pitchActionText, setPitchActionText] = useState<string>("Click anywhere on the pitch to pass the matchball & simulate sector crowd density!");
  const [cheerIntensity, setCheerIntensity] = useState<number>(45);
  const [activePlaySector, setActivePlaySector] = useState<string>("Midfield Central");
  const [matchMinutes, setMatchMinutes] = useState<number>(72);
  const [simMatchScore, setSimMatchScore] = useState<string>("USA 2 - 1 MEX");

  // Penalty Shootout Game state
  const [shootAngle, setShootAngle] = useState<number>(0); // -45 to 45
  const [shootPower, setShootPower] = useState<number>(65); // 10 to 100
  const [shootResult, setShootResult] = useState<string>("");
  const [keeperPos, setKeeperPos] = useState<number>(150); // 100 to 200 goalie position
  const [isShootAnimating, setIsShootAnimating] = useState<boolean>(false);
  const [ballDestination, setBallDestination] = useState<{ x: number; y: number }>({ x: 150, y: 175 });
  const [goalsScored, setGoalsScored] = useState<number>(0);
  const [shootoutTries, setShootoutTries] = useState<number>(0);
  const [shootBreathPhase, setShootBreathPhase] = useState<"Inhale" | "Exhale">("Inhale");

  // Breathing guide timer for sensory calm
  useEffect(() => {
    const timer = setInterval(() => {
      setShootBreathPhase((p) => (p === "Inhale" ? "Exhale" : "Inhale"));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Accessibility State
  const [accessibilityMode, setAccessibilityMode] = useState<boolean>(false);

  // Floating Chat Concierge
  const [isConciergeOpen, setIsConciergeOpen] = useState<boolean>(false);
  const [chatLanguage, setChatLanguage] = useState<string>("English");
  const [chatInput, setChatInput] = useState<string>("Where is the nearest restroom?");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "bot"; text: string; timestamp: string }>>([
    {
      sender: "bot",
      text: "Hello! Welcome to the FIFA World Cup 2026. I am your Synapse 26 concierge. I can find accessible restrooms, provide smart concourse routing avoiding heavy crowds, or dispatch a physical volunteer to your seat. How may I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [showSafetyNotice, setShowSafetyNotice] = useState<boolean>(true);

  // Map & Pathfinding State
  const [selectedSourceZone, setSelectedSourceZone] = useState<string>("");
  const [selectedDestZone, setSelectedDestZone] = useState<string>("");
  const [navigationSteps, setNavigationSteps] = useState<string[]>([]);
  const [navigationExplanation, setNavigationExplanation] = useState<string>("");
  const [isNavigatingLoading, setIsNavigatingLoading] = useState<boolean>(false);

  // Accessibility Assistance Form Modal
  const [showAssistForm, setShowAssistForm] = useState<boolean>(false);
  const [assistCategory, setAssistCategory] = useState<"accessibility" | "medical" | "lost" | "general">("accessibility");
  const [assistDesc, setAssistDesc] = useState<string>("");
  const [assistSubmitting, setAssistSubmitting] = useState<boolean>(false);
  const [assistSuccessMessage, setAssistSuccessMessage] = useState<string>("");

  // Transport & Parking Planner State
  const [tripDistance, setTripDistance] = useState<number>(12);
  const [tripMode, setTripMode] = useState<"transit" | "walk" | "rideshare" | "drive">("transit");
  const [stepFreeOnly, setStepFreeOnly] = useState<boolean>(false);
  const [tripLoading, setTripLoading] = useState<boolean>(false);
  const [tripRecommendation, setTripRecommendation] = useState<{
    recommendedOptionId: string;
    reasonOneSentence: string;
    co2SavedKg: number;
    gateName: string;
    gateCongestion: number;
    estimatedTimeMin: number;
    stepFreeConfirmed: boolean;
    greenPointsEarned: number;
    selectedMode: string;
    allModes: Array<{
      id: string;
      label: string;
      icon: string;
      timeMin: number;
      co2Saved: number;
      points: number;
    }>;
  } | null>(null);

  // Sustainability Stats & Badges
  const [sustainabilityLogs, setSustainabilityLogs] = useState<any[]>([]);
  const [totalSavedCO2, setTotalSavedCO2] = useState<number>(4.2);
  const [totalDistance, setTotalDistance] = useState<number>(24);
  const [sustainabilityQuote, setSustainabilityQuote] = useState<string>(
    "Amazing work! By taking public transit, you've saved equivalent carbon to powering a flat-screen TV for 48 hours."
  );

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConciergeOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isConciergeOpen]);

  // Load local sustainability summary
  useEffect(() => {
    dbService.fetchVenueState(venue.id)
      .then((data) => {
        if (data.sustainability) {
          setSustainabilityLogs(data.sustainability);
          const saved = data.sustainability.reduce((sum: number, item: any) => sum + item.co2SavedKg, 0);
          const dist = data.sustainability.reduce((sum: number, item: any) => sum + item.distanceKm, 0);
          setTotalSavedCO2(saved > 0 ? saved : 4.2);
          setTotalDistance(dist > 0 ? dist : 24);
        }
      })
      .catch((err) => console.error("Error loading sustainability logs", err));
  }, [venue.id]);

  // Polling for live match stats (ticker tape)
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  // Trigger Gemini Concierge API
  const handleSendChatMessage = async (textToSend?: string) => {
    const rawMsg = textToSend || chatInput;
    if (!rawMsg.trim()) return;

    // Append user message
    const userMsg = {
      sender: "user" as const,
      text: rawMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput("");
    setIsChatLoading(true);

    try {
      const currentZoneName = zones.find((z) => z.id === selectedSourceZone)?.name || "Zone A";
      const data = await aiService.fetchConcierge(
        rawMsg,
        venue.name,
        currentZoneName,
        chatLanguage
      );

      setChatHistory((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.text || "I was unable to retrieve a response. Please check your network.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      // If speech is enabled, trigger simple browser speech synthesis
      if (speechEnabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const synthMsg = new SpeechSynthesisUtterance(data.text || "");
        synthMsg.lang = chatLanguage.startsWith("Es") ? "es-ES" : chatLanguage.startsWith("Fr") ? "fr-FR" : "en-US";
        window.speechSynthesis.speak(synthMsg);
      }

      onRefresh(); // Refresh tasks queue if tool request registered assistance
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Concierge system currently busy. Reconnecting to local backup system. Please proceed safely and contact green-vest volunteers nearby.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Simulated Mic Trigger
  const handleMicSimulate = () => {
    setMicActive(true);
    setTimeout(() => {
      setMicActive(false);
      setChatInput("Where is the nearest medical first-aid point?");
    }, 1500);
  };

  // Set Navigation Routes based on selected SVG zones
  const handleZoneSelect = (zoneId: string) => {
    if (!selectedSourceZone) {
      setSelectedSourceZone(zoneId);
    } else if (!selectedDestZone && selectedSourceZone !== zoneId) {
      setSelectedDestZone(zoneId);
      triggerSmartNavigationRoute(selectedSourceZone, zoneId);
    } else {
      setSelectedSourceZone(zoneId);
      setSelectedDestZone("");
      setNavigationSteps([]);
      setNavigationExplanation("");
    }
  };

  const triggerSmartNavigationRoute = async (fromId: string, toId: string) => {
    setIsNavigatingLoading(true);
    const fromName = zones.find((z) => z.id === fromId)?.name || "";
    const toName = zones.find((z) => z.id === toId)?.name || "";

    try {
      const data = await aiService.fetchCopilot(
        `Generate a short step-by-step walking navigation plan from ${fromName} to ${toName}. Factor in the current crowd conditions. Keep it to 3 brief bullet points.`,
        venue.id
      );
      setNavigationExplanation(data.text);

      // Extract bullet points
      const steps = data.text
        .split("\n")
        .map((l: string) => l.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim())
        .filter((l: string) => l.length > 3);

      setNavigationSteps(steps.length > 0 ? steps : [`Start at ${fromName}`, `Continue along concourse corridor`, `Arrive safely at ${toName}`]);
    } catch (err) {
      setNavigationSteps([
        `Proceed from ${fromName} toward East concourse corridor`,
        `Follow clear floor guide lines to avoid central bottlenecks`,
        `Arrive at ${toName} (est. walk time: 3.5 minutes)`,
      ]);
    } finally {
      setIsNavigatingLoading(false);
    }
  };

  // Submit Accessibility assistance request directly to human queue
  const handleSubmitAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssistSubmitting(true);
    setAssistSuccessMessage("");

    const targetZoneId = selectedSourceZone || "v1-z-1";

    try {
      const data = await dbService.requestAssistance({
        category: assistCategory,
        venueId: venue.id,
        zoneId: targetZoneId,
        description: assistDesc || "Assistance requested near seat block.",
        userId: "fan-mobile-pwa",
        urgency: "general", // added to satisfy typescript interface
      });
      if (data.success) {
        setAssistSuccessMessage(`Request successfully dispatched! A volunteer has been tasked to navigate to your zone immediately. (ID: ${data.request.id})`);
        setAssistDesc("");
        onRefresh();
        setTimeout(() => {
          setShowAssistForm(false);
          setAssistSuccessMessage("");
        }, 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssistSubmitting(false);
    }
  };

  // Transport planner submit
  const handlePlanTransport = async () => {
    setTripLoading(true);
    try {
      // Find suitable gates based on venue
      const venueGates = gates.filter((g) => g.venueId === venue.id);
      const fallbackGates = [
        { id: "fallback-g-1", venueId: venue.id, name: "Gate A", type: "standard", currentOccupancy: 1200, capacity: 6000 },
        { id: "fallback-g-2", venueId: venue.id, name: "Gate B", type: "accessible", currentOccupancy: 800, capacity: 6000 },
        { id: "fallback-g-3", venueId: venue.id, name: "Gate C", type: "standard", currentOccupancy: 4500, capacity: 6000 },
        { id: "fallback-g-4", venueId: venue.id, name: "Gate D", type: "accessible", currentOccupancy: 3100, capacity: 6000 },
        { id: "fallback-g-5", venueId: venue.id, name: "Gate E", type: "standard", currentOccupancy: 5200, capacity: 6000 },
      ];
      const activeGates = venueGates.length > 0 ? venueGates : fallbackGates;

      // Filter based on stepFreeOnly
      const filteredGates = stepFreeOnly 
        ? activeGates.filter(g => g.type === "accessible")
        : activeGates;

      // Get best gate (lowest congestion occupancy/capacity)
      const sortedGates = [...(filteredGates.length > 0 ? filteredGates : activeGates)].sort(
        (a, b) => (a.currentOccupancy / a.capacity) - (b.currentOccupancy / b.capacity)
      );
      const bestGate = sortedGates[0];
      const gateCongestionPct = Math.round((bestGate.currentOccupancy / bestGate.capacity) * 100);

      // Fetch AI guidance sentence
      const queryPrompt = `Determine the best transportation approach for a fan traveling ${tripDistance}km to ${venue.name} via ${tripMode}. ${stepFreeOnly ? "Accessibility / Wheelchair step-free path is REQUIRED." : ""} Recommend gate is ${bestGate.name} with live congestion at ${gateCongestionPct}%. Keep it highly encouraging, action-oriented, and under 25 words. Keep the format plain text sentence, do not include markdown or quotes.`;
      
      const data = await aiService.fetchCopilot(queryPrompt, venue.id);
      const aiResponseText = data.text || `High-frequency rail and eco-shuttles are fully operational, dropping fans near ${bestGate.name} with ${gateCongestionPct}% capacity.`;

      // Helper for modes computation
      const calculateModeMetrics = (modeId: string) => {
        let timeMin = 0;
        let co2Saved = 0;
        let points = 0;

        // Congestion adjustment factors based on gate congestion
        const delayFactor = gateCongestionPct / 100; // 0 to 1

        if (modeId === "transit") {
          timeMin = Math.round((tripDistance / 40) * 60 + 10 + delayFactor * 5);
          co2Saved = Number((tripDistance * 0.16).toFixed(2));
          points = Math.round(tripDistance * 10);
        } else if (modeId === "walk") {
          timeMin = Math.round((tripDistance * 8) + 5); // average minutes per km + baseline
          co2Saved = Number((tripDistance * 0.20).toFixed(2));
          points = Math.round(tripDistance * 15);
        } else if (modeId === "rideshare") {
          timeMin = Math.round((tripDistance / 45) * 60 + 10 + delayFactor * 20);
          co2Saved = Number((tripDistance * 0.08).toFixed(2));
          points = Math.round(tripDistance * 3);
        } else { // drive
          timeMin = Math.round((tripDistance / 40) * 60 + 18 + delayFactor * 30);
          co2Saved = 0;
          points = 0;
        }

        return { timeMin, co2Saved, points };
      };

      const selectedMetrics = calculateModeMetrics(tripMode);

      const allModes = [
        { id: "transit", label: "Metro/Rail", icon: "🚄" },
        { id: "walk", label: "Walk/Bike", icon: "🚶" },
        { id: "rideshare", label: "Rideshare", icon: "🚗" },
        { id: "drive", label: "Solo Drive", icon: "🚘" },
      ].map((m) => {
        const metrics = calculateModeMetrics(m.id);
        return {
          id: m.id,
          label: m.label,
          icon: m.icon,
          ...metrics,
        };
      });

      // Best sustainable option
      let recommendedOptionId = "transit";
      if (tripDistance <= 5) {
        recommendedOptionId = "walk";
      }

      setTripRecommendation({
        recommendedOptionId,
        reasonOneSentence: aiResponseText.replace(/^["']|["']$/g, ""), // clean quotes if any
        co2SavedKg: selectedMetrics.co2Saved,
        gateName: bestGate.name,
        gateCongestion: gateCongestionPct,
        estimatedTimeMin: selectedMetrics.timeMin,
        stepFreeConfirmed: stepFreeOnly,
        greenPointsEarned: selectedMetrics.points,
        selectedMode: tripMode,
        allModes,
      });

    } catch (err) {
      console.error(err);
      // Fallback
      const gateName = stepFreeOnly ? "Gate B (Accessible)" : "Gate A";
      const gateCongestion = 45;
      const allModes = [
        { id: "transit", label: "Metro/Rail", icon: "🚄", timeMin: Math.round(tripDistance * 1.5 + 10), co2Saved: Number((tripDistance * 0.16).toFixed(2)), points: Math.round(tripDistance * 10) },
        { id: "walk", label: "Walk/Bike", icon: "🚶", timeMin: Math.round(tripDistance * 10), co2Saved: Number((tripDistance * 0.20).toFixed(2)), points: Math.round(tripDistance * 15) },
        { id: "rideshare", label: "Rideshare", icon: "🚗", timeMin: Math.round(tripDistance * 1.3 + 15), co2Saved: Number((tripDistance * 0.08).toFixed(2)), points: Math.round(tripDistance * 3) },
        { id: "drive", label: "Solo Drive", icon: "🚘", timeMin: Math.round(tripDistance * 1.3 + 25), co2Saved: 0, points: 0 },
      ];
      const selectedMetrics = allModes.find(m => m.id === tripMode) || allModes[0];

      setTripRecommendation({
        recommendedOptionId: "transit",
        reasonOneSentence: `High-frequency transit runs directly to stadium entry points. Recommend entering through ${gateName}.`,
        co2SavedKg: selectedMetrics.co2Saved,
        gateName,
        gateCongestion,
        estimatedTimeMin: selectedMetrics.timeMin,
        stepFreeConfirmed: stepFreeOnly,
        greenPointsEarned: selectedMetrics.points,
        selectedMode: tripMode,
        allModes,
      });
    } finally {
      setTripLoading(false);
    }
  };

  const handleSelectModeFromComparison = (modeId: "transit" | "walk" | "rideshare" | "drive") => {
    setTripMode(modeId);
    if (tripRecommendation) {
      const matchingMode = tripRecommendation.allModes.find((m) => m.id === modeId);
      if (matchingMode) {
        setTripRecommendation({
          ...tripRecommendation,
          selectedMode: modeId,
          co2SavedKg: matchingMode.co2Saved,
          estimatedTimeMin: matchingMode.timeMin,
          greenPointsEarned: matchingMode.points,
        });
      }
    }
  };

  // Log Trip Sustainability
  const handleLogTrip = async () => {
    if (!tripRecommendation) return;
    try {
      const data = await dbService.logTrip({
        userId: "fan-mobile-pwa",
        venueId: venue.id,
        tripMode: tripMode,
        distanceKm: tripDistance,
      });
      if (data.success) {
        // Trigger encouraging quote
        const responseQuote = await aiService.fetchCopilot(
          `Write a single encouraging, positive, and non-preachy sentence of feedback thanking a fan for choosing ${tripMode} to cover ${tripDistance}km and saving CO2. Do not shame drivers, stay very supportive.`,
          venue.id
        );
        setSustainabilityQuote(responseQuote.text || "Thank you for contributing to a cleaner World Cup tournament experience!");

        // Refresh stats
        setTotalSavedCO2((p) => Number((p + data.log.co2SavedKg).toFixed(2)));
        setTotalDistance((p) => p + Number(tripDistance));
        setSustainabilityLogs((p) => [data.log, ...p]);
        alert("Trip logged successfully! Green reward credentials updated.");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Assist Accessibility lowest-density calculations
  const quietZone = zones.length > 0 ? [...zones].sort((a, b) => a.currentDensityPct - b.currentDensityPct)[0] : null;

  return (
    <div className={`p-1 md:p-4 space-y-4 ${accessibilityMode ? "text-lg contrast-200" : ""}`}>
      {/* Live Match Stats Ticker Tape */}
      {matches.length > 0 && (
        <div className="w-full bg-command-navy border-b border-slate-800 overflow-hidden relative flex items-center h-10 rounded-xl shadow-sm text-xs font-mono">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-command-navy z-10 flex items-center border-r border-slate-800 text-live-amber font-bold">
            LIVE MATCH STATS
          </div>
          <div className="animate-ticker whitespace-nowrap pl-32 flex items-center gap-12 text-slate-400 w-max">
            {matches.map((m) => (
              <div key={m.id} className="flex items-center gap-4">
                <span className="font-bold text-chalk">{m.homeTeam} {m.scoreHome !== undefined ? m.scoreHome : '-'} vs {m.scoreAway !== undefined ? m.scoreAway : '-'} {m.awayTeam}</span>
                {m.status === "live" ? (
                  <>
                    <span className="text-live-amber animate-pulse">{m.minute}'</span>
                    {m.possessionHome !== undefined && (
                      <span className="text-slate-500">POSS: {m.possessionHome}% - {100 - m.possessionHome}%</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 uppercase">{m.status}</span>
                )}
              </div>
            ))}
            {/* Duplicate for infinite scroll illusion */}
            {matches.map((m) => (
              <div key={`${m.id}-dup`} className="flex items-center gap-4">
                <span className="font-bold text-chalk">{m.homeTeam} {m.scoreHome !== undefined ? m.scoreHome : '-'} vs {m.scoreAway !== undefined ? m.scoreAway : '-'} {m.awayTeam}</span>
                {m.status === "live" ? (
                  <>
                    <span className="text-live-amber animate-pulse">{m.minute}'</span>
                    {m.possessionHome !== undefined && (
                      <span className="text-slate-500">POSS: {m.possessionHome}% - {100 - m.possessionHome}%</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 uppercase">{m.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cinematic Stadium Hero Banner -> Command Deck Hero */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-sm border border-slate-800 bg-command-navy flex flex-col sm:flex-row min-h-[300px]">
        {/* Left side text/info */}
        <div className="p-6 flex flex-col justify-center sm:w-1/2 z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="animate-pulse w-2 h-2 rounded-full bg-live-amber"></span>
            <span className="text-xs text-live-amber font-mono font-bold tracking-widest uppercase">
              LIVE MATCHDAY PULSE — {venue.name}
            </span>
          </div>
          <h2 className="text-chalk text-3xl sm:text-5xl font-display uppercase tracking-tight leading-none mb-4">
            Command Deck
          </h2>
          <div className="flex gap-4 font-mono text-sm">
            <div>
              <div className="text-slate-500 mb-1">LOCAL TIME</div>
              <div className="text-chalk font-bold">68:45</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">AVG DENSITY</div>
              <div className="text-chalk font-bold">54%</div>
            </div>
          </div>
        </div>
        {/* Right side Visualization */}
        <div className="relative sm:w-1/2 flex items-center justify-center p-4">
          <div className="w-full max-w-[280px]">
            <LivePulseSchematic zones={zones} />
          </div>
        </div>
      </div>

      {/* Accessibility Alert & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-pitch/40 border border-pitch p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pitch text-chalk rounded-md border border-slate-800">
            <Accessibility className="w-5 h-5 animate-pulse text-signal-blue" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-wide text-chalk font-mono">ACCESSIBILITY PROTOCOL</h2>
            <p className="text-xs text-slate-400">AA Standard Compliance Controls active</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setAccessibilityMode(!accessibilityMode)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md border text-xs font-mono font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
              accessibilityMode
                ? "bg-live-amber border-amber-400 text-command-navy font-bold"
                : "bg-command-navy hover:bg-slate-800 border-slate-700 text-chalk hover:text-white shadow-sm"
            }`}
            id="acc-toggle-button"
            aria-label="Toggle high contrast accessibility mode"
          >
            {accessibilityMode ? "ACCESSIBILITY MODE: ON" : "ACCESSIBILITY MODE: OFF"}
          </button>
          <button
            onClick={() => setShowAssistForm(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-alert-red hover:bg-red-500 border border-red-500 text-white rounded-md text-xs font-mono font-bold shadow-sm cursor-pointer"
            id="quick-assist-button"
          >
            🚨 QUICK ASSISTANCE
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-command-navy p-1.5 rounded-xl border border-slate-800 shadow-sm">
        <button
          onClick={() => setActiveTab("nav")}
          className={`flex-1 py-3 text-center rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
            activeTab === "nav" ? "bg-slate-800 text-signal-blue shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Navigation className="w-4 h-4" />
            STADIUM MAP
          </div>
        </button>
        <button
          onClick={() => setActiveTab("match")}
          className={`flex-1 py-3 text-center rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
            activeTab === "match" ? "bg-slate-800 text-signal-blue shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            ⚽ MATCH DAY HUB
          </div>
        </button>
        <button
          onClick={() => setActiveTab("transport")}
          className={`flex-1 py-3 text-center rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
            activeTab === "transport" ? "bg-slate-800 text-signal-blue shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Bus className="w-4 h-4" />
            TRANSIT PLANNER
          </div>
        </button>
        <button
          onClick={() => setActiveTab("sustainability")}
          className={`flex-1 py-3 text-center rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
            activeTab === "sustainability" ? "bg-slate-800 text-signal-blue shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Trees className="w-4 h-4" />
            GREEN REWARDS
          </div>
        </button>
      </div>

      {/* 1. Map & Navigation View */}
      {activeTab === "nav" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SVG Map Section */}
          <div className="lg:col-span-7 bg-command-navy border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-mono text-sm font-bold tracking-wide text-chalk">
                  📍 INTERACTIVE CONCOURSE HEATMAP
                </h3>
                <span className="text-[10px] bg-live-amber/20 text-live-amber border border-live-amber/50 px-2.5 py-0.5 rounded-sm font-mono font-bold">
                  LIVE SENSORS
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Click any concourse zone to select path points, inspect current crowd density, and map a safe, crowd-aware walking route.
              </p>
            </div>

            {/* Stadium concourse SVG */}
            <div className="flex items-center justify-center w-full max-w-[340px] mx-auto aspect-square bg-slate-900 rounded-xl p-4 border border-slate-800 my-4 shadow-inner">
              <LivePulseSchematic 
                zones={zones} 
                onZoneClick={handleZoneSelect}
                selectedSourceZone={selectedSourceZone}
                selectedDestZone={selectedDestZone}
              />
            </div>

            {/* Live Stadium Zone Status Indicators */}
            <div className="border-t border-slate-800/80 my-4 pt-4">
              <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2.5 font-extrabold flex justify-between items-center">
                <span>📊 Live Zone Capacity Statuses</span>
                <span className="text-[9px] text-slate-500 normal-case font-normal font-sans">Click to select as navigation point</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                {zones.map((z) => {
                  let statusText = "Stable";
                  let statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
                  let dotColor = "bg-emerald-500 animate-pulse";
                  
                  if (z.currentDensityPct > 85) {
                    statusText = "Critical";
                    statusColor = "text-rose-400 border-rose-500/20 bg-rose-500/5";
                    dotColor = "bg-rose-500 animate-pulse";
                  } else if (z.currentDensityPct > 60) {
                    statusText = "Near Capacity";
                    statusColor = "text-amber-400 border-amber-500/20 bg-amber-500/5";
                    dotColor = "bg-amber-500 animate-pulse";
                  }

                  const isSelected = selectedSourceZone === z.id || selectedDestZone === z.id;
                  const isSource = selectedSourceZone === z.id;

                  return (
                    <button
                      key={z.id}
                      onClick={() => handleZoneSelect(z.id)}
                      className={`text-left p-2 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? isSource 
                            ? "border-emerald-500/80 bg-emerald-500/5 ring-1 ring-emerald-500/30" 
                            : "border-indigo-500/80 bg-indigo-500/5 ring-1 ring-indigo-500/30"
                          : "border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex justify-between items-center gap-1 w-full">
                        <span className="font-mono text-xs font-bold text-slate-200 truncate">{z.name}</span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0 font-bold">{z.currentDensityPct}%</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-1 w-full">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${statusColor}`}>
                          <span className={`w-1 h-1 rounded-full ${dotColor}`}></span>
                          {statusText}
                        </span>
                        {isSelected && (
                          <span className={`text-[8px] font-mono font-extrabold px-1 rounded-sm uppercase tracking-wider ${
                            isSource ? "bg-emerald-500/25 text-emerald-300" : "bg-indigo-500/25 text-indigo-300"
                          }`}>
                            {isSource ? "Start" : "Dest"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Legend */}
            <div className="flex justify-between items-center border-t border-slate-800 pt-3.5 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-signal-blue/20 border border-signal-blue rounded-sm"></span> Normal (&lt;60%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-live-amber/20 border border-live-amber rounded-sm"></span> Medium (60-85%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-alert-red/20 border border-alert-red rounded-sm"></span> Dense (&gt;85%)
              </span>
            </div>
          </div>

          {/* Navigation Control Panel */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Route Selection Box */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-sm">
              <h3 className="font-mono text-xs font-extrabold text-slate-200 tracking-wider uppercase mb-3 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-indigo-600" />
                CONCOURSE NAVIGATION
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-bold">STARTING ZONE</label>
                    <select
                      value={selectedSourceZone}
                      onChange={(e) => handleZoneSelect(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-xl text-slate-200 outline-none focus:border-indigo-500 transition-colors font-semibold"
                    >
                      <option value="">-- Click on map --</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.currentDensityPct}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 font-bold">DESTINATION ZONE</label>
                    <select
                      value={selectedDestZone}
                      onChange={(e) => {
                        setSelectedDestZone(e.target.value);
                        if (selectedSourceZone && e.target.value) {
                          triggerSmartNavigationRoute(selectedSourceZone, e.target.value);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-xl text-slate-200 outline-none focus:border-indigo-500 transition-colors font-semibold"
                      disabled={!selectedSourceZone}
                    >
                      <option value="">-- Select Target --</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id} disabled={z.id === selectedSourceZone}>
                          {z.name} ({z.currentDensityPct}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isNavigatingLoading && (
                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center text-xs text-slate-500 font-mono animate-pulse">
                    Analyzing live gate density and computing step-free bypasses...
                  </div>
                )}

                {navigationSteps.length > 0 && !isNavigatingLoading && (
                  <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                      <span className="text-xs font-mono font-bold text-indigo-700">OPTIMIZED ROUTE PATH</span>
                      <span className="text-[9px] text-emerald-700 font-mono bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                        Crowd-Aware Bypass Active
                      </span>
                    </div>
                    <ol className="space-y-2.5">
                      {navigationSteps.map((step, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-slate-300">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-100 w-5 h-5 flex items-center justify-center rounded-full shrink-0 border border-indigo-200 text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    {navigationExplanation && (
                      <p className="text-slate-500 italic pt-2 border-t border-slate-800 text-[10px]">
                        * {navigationExplanation}
                      </p>
                    )}
                  </div>
                )}

                {!selectedSourceZone && (
                  <div className="p-4 bg-slate-900 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500 italic">
                    Tip: Click direct sections on the circular SVG concourse to inspect capacity gates.
                  </div>
                )}
              </div>
            </div>

            {/* Accessibility Assistant Screen Section */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-sm">
              <h3 className="font-mono text-xs font-extrabold text-slate-200 tracking-wider uppercase mb-3 flex items-center gap-2">
                <Accessibility className="w-4 h-4 text-amber-600" />
                SENSORY & QUIET PATHWAYS
              </h3>

              <div className="space-y-3">
                {quietZone && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                    <span className="text-[9px] font-mono font-extrabold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Lowest Sensory Activity (Sensory Calm Zone)
                    </span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2 font-mono">{quietZone.name}</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Operating at only <span className="text-emerald-600 font-bold font-mono">{quietZone.currentDensityPct}% capacity</span>. Highly recommended space for decompression or low sensory overhead.
                    </p>
                  </div>
                )}

                {/* PA Live Captions Feed */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-extrabold">
                    📢 LIVE PA CAPTION BROADCAST FEED (d/Deaf Assist)
                  </h4>
                  {broadcasts.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-2">No active announcements.</p>
                  ) : (
                    <div className="space-y-2">
                      {broadcasts.slice(0, 2).map((bc) => (
                        <div key={bc.id} className="border-l-2 border-indigo-500 pl-2.5 py-1">
                          <p className="text-xs text-slate-300">
                            {bc.translations[chatLanguage === "Spanish" ? "es" : chatLanguage === "French" ? "fr" : "en"]?.caption || bc.original}
                          </p>
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(bc.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Match Day Hub View */}
      {activeTab === "match" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Interactive Soccer Pitch SVG */}
          <div className="lg:col-span-7 bg-command-navy border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-mono text-sm font-black tracking-wide text-chalk uppercase flex items-center gap-1.5">
                  ⚽ Interactive Tactical Pitch Board
                </h3>
                <span className="text-[9px] bg-live-amber/20 text-live-amber border border-live-amber/50 px-2.5 py-0.5 rounded-sm font-mono font-bold animate-pulse">
                  MATCH LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Click anywhere on the pitch to pass the matchball. Simulates operational crowd density dynamics based on match play!
              </p>
            </div>

            {/* Stadium Pitch SVG */}
            <div className="relative w-full aspect-[4/3] bg-pitch rounded-xl p-4 border border-slate-800 shadow-inner overflow-hidden flex flex-col items-center justify-center">
              {/* Pitch Grass Stripe Pattern */}
              <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-live-amber/20 via-transparent to-live-amber/20 pointer-events-none" />
              
              <svg 
                viewBox="0 0 400 300" 
                className="w-full h-full cursor-crosshair select-none relative z-10"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = ((e.clientX - rect.left) / rect.width) * 400;
                  const clickY = ((e.clientY - rect.top) / rect.height) * 300;
                  setPitchBallPos({ x: clickX, y: clickY });

                  // Determine sector
                  let sector = "Midfield Central";
                  let warning = "";
                  if (clickX < 130) {
                    sector = "North Attacking Zone";
                    warning = "North Gate 1 concessions experiencing peak half-time rush!";
                  } else if (clickX > 270) {
                    sector = "South Defensive Zone";
                    warning = "South Exit corridors clear. Recommended route for accessible exit.";
                  } else if (clickY < 100) {
                    sector = "East Wing Corridor";
                    warning = "East concourse seating density elevated. Walkway bypasses suggested.";
                  } else if (clickY > 200) {
                    sector = "West Wing Gateways";
                    warning = "West restrooms operating at nominal crowd levels.";
                  }

                  setActivePlaySector(sector);
                  setPitchActionText(`Ball passed to ${sector}! ${warning}`);
                  const randomCheer = Math.floor(Math.random() * 40) + 60; // 60-100
                  setCheerIntensity(randomCheer);
                }}
              >
                {/* Grass Stripes in SVG */}
                {[...Array(10)].map((_, i) => (
                  <rect key={i} x={i * 40} y="0" width="20" height="300" fill="rgba(255,255,255,0.03)" pointerEvents="none" />
                ))}

                {/* Outer Boundary line */}
                <rect x="15" y="15" width="370" height="270" rx="3" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" pointerEvents="none" />
                
                {/* Center Circle & Spot */}
                <circle cx="200" cy="150" r="45" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" pointerEvents="none" />
                <circle cx="200" cy="150" r="3" fill="rgba(255,255,255,0.8)" pointerEvents="none" />
                
                {/* Halfway Line */}
                <line x1="200" y1="15" x2="200" y2="285" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" pointerEvents="none" />

                {/* Left Penalty Area */}
                <rect x="15" y="75" width="60" height="150" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" pointerEvents="none" />
                <rect x="15" y="110" width="20" height="80" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" pointerEvents="none" />
                <circle cx="75" cy="150" r="2" fill="rgba(255,255,255,0.8)" pointerEvents="none" />
                <path d="M 75 120 A 35 35 0 0 1 75 180" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" pointerEvents="none" />

                {/* Right Penalty Area */}
                <rect x="325" y="75" width="60" height="150" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" pointerEvents="none" />
                <rect x="365" y="110" width="20" height="80" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" pointerEvents="none" />
                <circle cx="325" cy="150" r="2" fill="rgba(255,255,255,0.8)" pointerEvents="none" />
                <path d="M 325 180 A 35 35 0 0 1 325 120" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" pointerEvents="none" />

                {/* Corner Flags / Arcs */}
                <path d="M 15 25 A 10 10 0 0 1 25 15" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" pointerEvents="none" />
                <path d="M 375 15 A 10 10 0 0 1 385 25" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" pointerEvents="none" />
                <path d="M 25 285 A 10 10 0 0 1 15 275" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" pointerEvents="none" />
                <path d="M 385 275 A 10 10 0 0 1 375 285" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" pointerEvents="none" />

                {/* Cheering soundwave pulses if intensity is high */}
                {cheerIntensity > 75 && (
                  <circle 
                    cx={pitchBallPos.x} 
                    cy={pitchBallPos.y} 
                    r="40" 
                    fill="none" 
                    stroke="rgba(251,191,36,0.5)" 
                    strokeWidth="2.5" 
                    className="animate-ping" 
                    pointerEvents="none" 
                  />
                )}

                {/* The Soccer Ball SVG (rendered at selected position) */}
                <g 
                  transform={`translate(${pitchBallPos.x - 10}, ${pitchBallPos.y - 10})`} 
                  className="transition-all duration-500 ease-out pointer-events-none"
                >
                  <circle cx="10" cy="10" r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                  {/* Soccer ball pentagons */}
                  <path d="M 10 1 L 13 6 L 18 5 L 16 10 L 19 14 L 14 16 L 10 19 L 6 16 L 1 14 L 4 10 L 2 5 L 7 6 Z" fill="none" stroke="#0f172a" strokeWidth="1" />
                  <polygon points="10,5 14,9 12,14 8,14 6,9" fill="#0f172a" />
                  <line x1="10" y1="1" x2="10" y2="5" stroke="#0f172a" strokeWidth="1" />
                  <line x1="1" y1="14" x2="6" y2="9" stroke="#0f172a" strokeWidth="1" />
                  <line x1="19" y1="14" x2="14" y2="9" stroke="#0f172a" strokeWidth="1" />
                  <line x1="6" y1="16" x2="8" y2="14" stroke="#0f172a" strokeWidth="1" />
                  <line x1="14" y1="16" x2="12" y2="14" stroke="#0f172a" strokeWidth="1" />
                </g>
              </svg>
            </div>

            {/* Tactical Metrics Feedback Card */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-command-navy p-2.5 rounded-md border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-500 block font-bold">MATCH SCORE</span>
                  <span className="text-sm font-black font-display tracking-widest text-chalk mt-0.5 block">{simMatchScore}</span>
                </div>
                <div className="bg-command-navy p-2.5 rounded-md border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-500 block font-bold">TIME ELAPSED</span>
                  <span className="text-sm font-black font-display tracking-widest text-chalk mt-0.5 block">{matchMinutes}'</span>
                </div>
                <div className="bg-command-navy p-2.5 rounded-md border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-500 block font-bold">CHEER ROAR</span>
                  <span className="text-sm font-black font-display tracking-widest text-live-amber mt-0.5 block">{cheerIntensity} dB</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-mono leading-relaxed bg-command-navy border border-slate-800 p-2.5 rounded-md">
                📢 <strong className="text-chalk">Tactical Feed:</strong> {pitchActionText}
              </p>

              {/* Match Events Realtime Section */}
              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold mb-2">⚡ Live Match Events</h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {matchEvents && matchEvents.length > 0 ? (
                    matchEvents.map((event: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-mono bg-command-navy/50 p-2 rounded-sm border border-slate-800/60">
                        <span className="text-live-amber font-bold">[{event.minute}']</span>
                        <span className="text-chalk flex-1 ml-2">{event.description}</span>
                        <span className="text-[9px] text-slate-500 uppercase px-1 rounded-sm bg-slate-900 border border-slate-800">{event.event_type}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] font-mono text-slate-500 text-center py-2">
                      Waiting for live match events... (Simulation active)
                    </div>
                  )}
                </div>
              </div>

              {/* Player Stats Realtime Section */}
              <div className="border-t border-slate-800 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold">📊 Player Stats Tracker</h4>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="bg-command-navy border border-slate-800 text-[10px] font-mono text-chalk rounded-md px-2 py-0.5 outline-none cursor-pointer"
                  >
                    <option value="p-1">Christian Pulisic (USA)</option>
                    <option value="p-2">Giovanni Reyna (USA)</option>
                    <option value="p-3">Hirving Lozano (MEX)</option>
                  </select>
                </div>
                {playerStats && playerStats.length > 0 ? (
                  playerStats.map((stat: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 text-xs font-mono bg-command-navy/50 p-2.5 rounded-md border border-slate-800/60">
                      <div>
                        <span className="text-slate-500 block text-[9px]">PLAYER</span>
                        <span className="text-chalk font-bold">{stat.player_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">DISTANCE RUN</span>
                        <span className="text-signal-blue font-bold">{stat.distance_km} km</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-500 block text-[9px]">GOALS / ASSISTS</span>
                        <span className="text-chalk font-bold">{stat.goals} G / {stat.assists} A</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-500 block text-[9px]">PASS ACCURACY</span>
                        <span className="text-chalk font-bold">
                          {stat.passes_total > 0 ? ((stat.passes_completed / stat.passes_total) * 100).toFixed(0) : 0}% 
                          <span className="text-slate-500 text-[10px] ml-1">({stat.passes_completed}/{stat.passes_total})</span>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-command-navy/50 p-2.5 rounded-md border border-slate-800/60 text-xs font-mono flex justify-between items-center text-slate-500">
                    <span>{selectedPlayerId === 'p-3' ? 'Hirving Lozano' : selectedPlayerId === 'p-2' ? 'Giovanni Reyna' : 'Christian Pulisic'}</span>
                    <span className="text-[10px]">Mock tracking: 9.8 km, 88% pass completion</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sensory Calm Penalty Shootout */}
          <div className="lg:col-span-5 bg-command-navy border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <h3 className="font-mono text-sm font-black tracking-wide text-chalk uppercase flex items-center gap-1.5">
                  🥅 SENSORY CALM GAME
                </h3>
                <span className="text-[10px] bg-signal-blue/20 text-signal-blue border border-signal-blue/50 px-2.5 py-0.5 rounded-sm font-mono font-bold uppercase">
                  Breath Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Experience stadium sensory overload or anxiety? Practice mindful breathing to score calming goals and earn carbon badges!
              </p>
            </div>

            {/* Breathing Guide Animation */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3.5">
              {/* Pulsing breathing football graphic using our digital soccer ball image */}
              <div className="relative flex items-center justify-center shrink-0">
                <img
                  src="/src/assets/images/digital_soccer_ball_1783511059824.jpg"
                  alt="Digital Football"
                  referrerPolicy="no-referrer"
                  className={`w-14 h-14 rounded-md object-cover border border-slate-700 transition-all duration-[2500ms] ${
                    shootBreathPhase === "Inhale" ? "scale-110 rotate-6 shadow-md" : "scale-100 opacity-80"
                  }`}
                />
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block">MINDFULNESS RHYTHM</span>
                <span className="text-xs font-bold text-signal-blue block font-mono">
                  {shootBreathPhase === "Inhale" ? "🧘 INHALE SLOWLY..." : "🌬️ EXHALE GENTLY..."}
                </span>
                <p className="text-[10px] text-slate-400">Sync your breathing with the expanding cyber soccer sphere.</p>
              </div>
            </div>

            {/* Shootout Goal SVG Section */}
            <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-sky-200 to-sky-50 rounded-2xl border border-slate-800 p-2 overflow-hidden flex flex-col justify-end shadow-inner">
              {/* Draw grass pitch line */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-emerald-700 border-t border-emerald-600" />
              
              <svg viewBox="0 0 300 200" className="w-full h-full relative z-10">
                {/* SVG Soccer Goal structure */}
                <rect x="40" y="40" width="220" height="110" rx="2" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                {/* Goal nets (diamond path patterns) */}
                <path d="M 40 40 L 60 150 M 60 40 L 80 150 M 80 40 L 100 150 M 100 40 L 120 150 M 120 40 L 140 150 M 140 40 L 160 150 M 160 40 L 180 150 M 180 40 L 200 150 M 200 40 L 220 150 M 220 40 L 240 150 M 240 40 L 260 150" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeOpacity="0.5" />
                <path d="M 40 60 L 260 60 M 40 80 L 260 80 M 40 100 L 260 100 M 40 120 L 260 120 M 40 140 L 260 140" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeOpacity="0.5" />

                {/* Interactive Goalkeeper SVG */}
                <g transform={`translate(${keeperPos - 20}, 85)`} className="transition-all duration-500 ease-out">
                  {/* Goalie torso and arms */}
                  <rect x="15" y="15" width="10" height="20" rx="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
                  <circle cx="20" cy="10" r="6" fill="#fbcfe8" stroke="#ef4444" strokeWidth="1" />
                  {/* Red Goalie Cap */}
                  <path d="M 14 10 A 6 6 0 0 1 26 10 Z" fill="#ef4444" />
                  {/* Outstretched arms */}
                  <line x1="5" y1="18" x2="15" y2="18" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  <line x1="25" y1="18" x2="35" y2="18" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  {/* Goalie Gloves */}
                  <circle cx="3" cy="18" r="3" fill="#ffffff" stroke="#991b1b" strokeWidth="1" />
                  <circle cx="37" cy="18" r="3" fill="#ffffff" stroke="#991b1b" strokeWidth="1" />
                </g>

                {/* Animated Football SVG */}
                <g 
                  transform={`translate(${ballDestination.x - 10}, ${ballDestination.y - 10})`} 
                  className={`transition-all duration-[800ms] ease-out ${isShootAnimating ? "rotate-[360deg] scale-[0.65]" : ""}`}
                >
                  <circle cx="10" cy="10" r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                  <circle cx="10" cy="10" r="4" fill="#0f172a" />
                  <path d="M 10 1 L 10 6 M 1 10 L 6 10 M 19 10 L 14 10 M 10 19 L 10 14" stroke="#0f172a" strokeWidth="1" />
                </g>
              </svg>

              {/* Feedback text */}
              {shootResult && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
                  <span className="text-3xl animate-bounce">
                    {shootResult.includes("GOAL") ? "🏆" : "🧤"}
                  </span>
                  <h4 className="text-sm font-black font-mono text-white mt-2 uppercase tracking-widest">{shootResult}</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-[200px]">
                    {shootResult.includes("GOAL") 
                      ? "Magnificent! You scored and earned +0.50kg carbon offset points." 
                      : "The goalie saved it! Relax your shoulders, breathe in deeply and try again."}
                  </p>
                  <button
                    onClick={() => {
                      setShootResult("");
                      setBallDestination({ x: 150, y: 175 }); // Reset back to penalty spot
                    }}
                    className="mt-3 px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-full text-[10px] font-mono font-bold tracking-wider cursor-pointer shadow"
                  >
                    SHOOT AGAIN
                  </button>
                </div>
              )}
            </div>

            {/* Shooters Panel Controls */}
            <div className="space-y-3.5 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">🎯 AIM ANGLE: {shootAngle}°</label>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={shootAngle}
                    onChange={(e) => setShootAngle(Number(e.target.value))}
                    disabled={isShootAnimating || !!shootResult}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold">⚡ KICK POWER: {shootPower}%</label>
                  <input
                    type="range"
                    min="15"
                    max="95"
                    value={shootPower}
                    onChange={(e) => setShootPower(Number(e.target.value))}
                    disabled={isShootAnimating || !!shootResult}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                <span>Shots Tried: <strong className="text-slate-200">{shootoutTries}</strong></span>
                <span>Calm Goals: <strong className="text-indigo-600">{goalsScored}</strong></span>
              </div>

              <button
                onClick={() => {
                  if (isShootAnimating || !!shootResult) return;
                  setIsShootAnimating(true);
                  setShootoutTries((t) => t + 1);

                  // Calculate target coordinate in the goal
                  // Goal coordinates on SVG: width 300, height 200.
                  // Goalmouth box: x: 40 to 260, y: 40 to 150
                  // Default ball penalty spot is x: 150, y: 175
                  const targetX = 150 + (shootAngle * 2.2); // Maps to goal width
                  const targetY = 150 - (shootPower * 1.1); // Maps to goal height

                  setBallDestination({ x: targetX, y: targetY });

                  // Move goalie
                  const randomGoalieX = 150 + (Math.random() * 80 - 40);
                  setKeeperPos(randomGoalieX);

                  setTimeout(() => {
                    // Check if goalie blocks it
                    const distance = Math.abs(targetX - randomGoalieX);
                    // Also check if out of bounds
                    if (targetX < 40 || targetX > 260 || targetY < 40) {
                      setShootResult("MISSED THE POSTS");
                    } else if (distance < 25 && targetY > 75) {
                      setShootResult("SAVED BY GOALKEEPER");
                    } else {
                      setShootResult("GOAL! MAGNIFICENT SHOT");
                      setGoalsScored((g) => g + 1);
                      // Add carbon offsets
                      setTotalSavedCO2((c) => Number((c + 0.5).toFixed(2)));
                    }
                    setIsShootAnimating(false);
                  }, 800);
                }}
                disabled={isShootAnimating || !!shootResult}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-mono font-bold tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isShootAnimating ? "CALMING KICK IN MOTION..." : "🚀 MIND IN SYNC: KICK PENALTY"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Transportation Planner View */}
      {activeTab === "transport" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wide text-slate-200">
              🚌 TRANSIT & VEHICLE GATEWAYS
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Analyze best routes to {venue.name} based on live distance, stadium congestion, and wheelchair step-free routes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1.5 font-bold uppercase tracking-wider">TRAVEL DISTANCE TO STADIUM (KM)</label>
                <input
                  type="range"
                  min="2"
                  max="50"
                  value={tripDistance}
                  onChange={(e) => setTripDistance(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs font-mono text-slate-400 mt-1">
                  <span>2 km</span>
                  <span className="text-indigo-400 font-extrabold">{tripDistance} km</span>
                  <span>50 km</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1.5 font-bold uppercase tracking-wider">TRANSPORTATION MODE</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "transit", label: "Metro/Rail", icon: "🚄" },
                    { id: "walk", label: "Walk/Bike", icon: "🚶" },
                    { id: "rideshare", label: "Rideshare", icon: "🚗" },
                    { id: "drive", label: "Solo Drive", icon: "🚘" },
                  ].map((mode) => {
                    const isSelected = tripMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setTripMode(mode.id as any)}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold shadow-sm shadow-indigo-500/10"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                        }`}
                      >
                        <span className="text-lg">{mode.icon}</span>
                        <span className="text-[10px] font-mono leading-tight">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wheelchair / Step-Free Filter */}
              <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 p-3.5 rounded-2xl">
                <input
                  type="checkbox"
                  id="step-free-toggle"
                  checked={stepFreeOnly}
                  onChange={(e) => setStepFreeOnly(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
                <label htmlFor="step-free-toggle" className="text-xs font-mono text-slate-300 font-bold select-none cursor-pointer flex items-center gap-1.5">
                  ♿ Request Wheelchair / Step-Free Routes
                </label>
              </div>

              <button
                onClick={handlePlanTransport}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-mono font-extrabold tracking-wider cursor-pointer shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                disabled={tripLoading}
              >
                {tripLoading ? "📡 SYNCING WITH STADIUM COPILOT..." : "🗺️ FIND MY ROUTE"}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              {tripRecommendation ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase tracking-wider">🗺️ CURRENT NAVIGATION RECOMMENDATION</span>
                    <span className={`text-[9px] border px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                      tripRecommendation.recommendedOptionId === tripRecommendation.selectedMode
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
                      {tripRecommendation.recommendedOptionId === tripRecommendation.selectedMode ? "★ Optimal Choice" : "Alternative Route"}
                    </span>
                  </div>

                  {/* Dynamic travel summary cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Estimated Time</span>
                      <span className="text-sm font-bold font-mono text-indigo-400 mt-1">
                        ⏱️ {tripRecommendation.estimatedTimeMin} mins
                      </span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Green Rewards</span>
                      <span className="text-sm font-bold font-mono text-emerald-400 mt-1">
                        🌱 +{tripRecommendation.greenPointsEarned} pts
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-300 font-sans tracking-wide leading-relaxed bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
                    "{tripRecommendation.reasonOneSentence}"
                  </p>

                  {/* Gate & Congestion information */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-bold">🎯 Target Entry Gate:</span>
                      <span className="text-slate-200 font-extrabold font-mono">{tripRecommendation.gateName}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-bold">🚦 Gate Live Congestion:</span>
                      {(() => {
                        const cong = tripRecommendation.gateCongestion;
                        let text = "Stable";
                        let colorClass = "text-emerald-400 bg-emerald-400/10 border-emerald-500/20";
                        let dotColor = "bg-emerald-400";
                        if (cong > 85) {
                          text = "Critical";
                          colorClass = "text-alert-red bg-alert-red/20 border-alert-red/50 animate-pulse";
                          dotColor = "bg-alert-red";
                        } else if (cong > 60) {
                          text = "Near Capacity";
                          colorClass = "text-live-amber bg-live-amber/20 border-live-amber/50";
                          dotColor = "bg-live-amber";
                        }
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${colorClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                            {cong}% ({text})
                          </span>
                        );
                      })()}
                    </div>

                    {tripRecommendation.stepFreeConfirmed && (
                      <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-xs font-mono text-emerald-400">
                        <span className="flex items-center gap-1 font-bold">♿ Accessibility Status:</span>
                        <span className="font-extrabold text-[10px] uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          ✓ Step-Free Route Verified
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Carbon savings box */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trees className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs text-slate-300 font-mono font-bold uppercase tracking-wider">CARBON SAVINGS</span>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-emerald-400">
                      +{tripRecommendation.co2SavedKg.toFixed(2)} kg CO2
                    </span>
                  </div>

                  {/* Mode Comparison Matrix */}
                  <div className="border-t border-slate-850 pt-3.5 mt-2">
                    <h4 className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-extrabold">
                      🔄 Mode Comparison Matrix (Click to switch)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {tripRecommendation.allModes.map((m) => {
                        const isCurrent = tripRecommendation.selectedMode === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleSelectModeFromComparison(m.id as any)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isCurrent
                                ? "bg-indigo-600/15 border-indigo-500/80 ring-1 ring-indigo-500/30"
                                : "bg-slate-950/40 border-slate-850 hover:bg-slate-800/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs">{m.icon} <span className="font-mono text-[9px] text-slate-200 font-bold">{m.label}</span></span>
                              {m.id === tripRecommendation.recommendedOptionId && (
                                <span className="text-[8px] bg-emerald-500/25 text-emerald-300 px-1 rounded font-mono font-extrabold uppercase shrink-0">
                                  BEST
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-1.5 text-[9px] font-mono">
                              <span className="text-slate-400 font-bold">⏱️ {m.timeMin}m</span>
                              <span className="text-emerald-400 font-bold">🌱 {m.points > 0 ? `+${m.points}p` : "0p"}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleLogTrip}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-extrabold tracking-wider cursor-pointer mt-1 shadow-md transition-colors"
                  >
                    🎉 LOG TRIP TO CLAIM REWARDS
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full py-12 text-slate-400">
                  <span className="text-3xl mb-2">🚗</span>
                  <p className="text-xs font-mono text-slate-300">Set distance & mode, then click <strong className="text-indigo-400">Find My Route</strong> to evaluate path accessibility and dynamic gates.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Sustainability Green Rewards View */}
      {activeTab === "sustainability" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wide text-slate-200">
                🌱 GREEN STADIUM CHALLENGE
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                FIFA World Cup 2026 carbon neutrality dashboard. Claim your tournament badge!
              </p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-mono font-bold">
              ESTIMATION FORMULA: EPA-V26
            </span>
          </div>

          {/* Badges Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              totalSavedCO2 >= 2
                ? "bg-amber-50 border-amber-200 text-slate-200 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}>
              <div className={`p-3 rounded-xl ${totalSavedCO2 >= 2 ? "bg-amber-100 text-amber-600" : "bg-slate-800 text-slate-400"}`}>
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono">BRONZE SUSTAINER</h4>
                <p className="text-[10px] text-slate-500">Save &gt;= 2.0kg CO2 (Unlocked at 2kg)</p>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold">{totalSavedCO2 >= 2 ? "★ ACTIVE BENEFIT CLAIMED" : "LOCKED"}</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              totalSavedCO2 >= 5
                ? "bg-slate-900 border-slate-300 text-slate-200 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}>
              <div className={`p-3 rounded-xl ${totalSavedCO2 >= 5 ? "bg-slate-800 text-slate-300" : "bg-slate-800 text-slate-400"}`}>
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono">SILVER ECO LEADER</h4>
                <p className="text-[10px] text-slate-500">Save &gt;= 5.0kg CO2 (Unlocked at 5kg)</p>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold">{totalSavedCO2 >= 5 ? "★ ACTIVE BENEFIT CLAIMED" : "LOCKED"}</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              totalSavedCO2 >= 10
                ? "bg-yellow-50 border-yellow-200 text-slate-200 shadow-sm"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}>
              <div className={`p-3 rounded-xl ${totalSavedCO2 >= 10 ? "bg-yellow-100 text-yellow-600" : "bg-slate-800 text-slate-400"}`}>
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono">GOLD CARBON ZERO</h4>
                <p className="text-[10px] text-slate-500">Save &gt;= 10.0kg CO2 (Unlocked at 10kg)</p>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold">{totalSavedCO2 >= 10 ? "★ ACTIVE BENEFIT CLAIMED" : "LOCKED"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Encouragement Box */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-mono font-bold text-indigo-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI SUSTAINABILITY INSIGHTS
              </h4>
              <p className="text-xs italic text-slate-300 leading-relaxed font-serif">
                "{sustainabilityQuote}"
              </p>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-mono text-slate-500">
                <span>Distance Tracked: <strong>{totalDistance} km</strong></span>
                <span>CO2 Offset Count: <strong className="text-emerald-600">{totalSavedCO2.toFixed(2)} kg</strong></span>
              </div>
            </div>

            {/* Travel History Logs */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <h4 className="text-xs font-mono font-bold text-slate-200 mb-3">HISTORICAL TRAVEL LOG</h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {sustainabilityLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No trips logged yet.</p>
                ) : (
                  sustainabilityLogs.map((log) => (
                    <div key={log.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs shadow-sm">
                      <div>
                        <span className="capitalize font-mono text-slate-300 font-semibold">
                          {log.tripMode === "transit" ? "🚄 Transit" : log.tripMode === "walk" ? "🚶 Walk" : log.tripMode === "rideshare" ? "🚗 Carpool" : "🚘 Drive"}
                        </span>
                        <span className="text-slate-400 ml-1.5 font-mono">({log.distanceKm} km)</span>
                      </div>
                      <span className="text-emerald-600 font-mono font-bold">+{log.co2SavedKg} kg Saved</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Concierge Chatbot Button */}
      <button
        onClick={() => setIsConciergeOpen(!isConciergeOpen)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-lg shadow-indigo-150 z-50 flex items-center gap-2 cursor-pointer group"
        aria-label="Open AI Stadium Concierge chat"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-mono text-xs font-bold whitespace-nowrap">
          AI CONCIERGE
        </span>
      </button>

      {/* Concierge Dialog Modal */}
      {isConciergeOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-xl z-50 overflow-hidden flex flex-col h-[480px]">
          {/* Modal Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping"></div>
              <span className="font-mono text-xs font-bold text-indigo-600">SYNAPSE 26 CHAT CONCIERGE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={chatLanguage}
                onChange={(e) => setChatLanguage(e.target.value)}
                className="bg-slate-900 text-[10px] font-mono p-1 rounded-md border border-slate-700 text-slate-300 font-semibold cursor-pointer outline-none"
              >
                <option value="English">EN 🇺🇸</option>
                <option value="Spanish">ES 🇪🇸</option>
                <option value="French">FR 🇫🇷</option>
              </select>
              <button
                onClick={() => setIsConciergeOpen(false)}
                className="text-slate-400 hover:text-slate-300 font-extrabold text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Safety Disclaimer Notice */}
          {showSafetyNotice && (
            <div className="bg-amber-50 border-b border-amber-100 p-2.5 text-[10px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span>Notice: AI concierge answers are automated. Always crosscheck safety layouts and gate instructions with visual signs or live green-vest stadium staff.</span>
                <button
                  onClick={() => setShowSafetyNotice(false)}
                  className="underline font-bold ml-1 hover:text-amber-950 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Chat History Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-sm"
                    : "bg-slate-900 text-slate-200 border border-slate-700 rounded-tl-none"
                }`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">{msg.timestamp}</span>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono p-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span>Connecting to Gemini 3.5...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="px-3 py-1.5 border-t border-slate-800 flex gap-1 overflow-x-auto whitespace-nowrap bg-slate-900 select-none">
            {[
              "Where is Gate 1?",
              "Is South Gate crowded?",
              "Call a volunteer support"
            ].map((pText, i) => (
              <button
                key={i}
                onClick={() => handleSendChatMessage(pText)}
                className="bg-slate-900 border border-slate-700 text-slate-300 hover:text-indigo-600 hover:border-indigo-500 text-[10px] font-mono px-2.5 py-1 rounded-xl cursor-pointer shadow-sm transition-all"
              >
                {pText}
              </button>
            ))}
          </div>

          {/* Input Controls */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
            <button
              onClick={() => setSpeechEnabled(!speechEnabled)}
              className={`p-2 rounded-xl cursor-pointer ${speechEnabled ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-300"}`}
              title="Toggle Text-to-Speech playback"
            >
              {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={handleMicSimulate}
              className={`p-2 rounded-xl cursor-pointer ${micActive ? "text-rose-500 bg-rose-50 animate-pulse" : "text-slate-400 hover:text-slate-300"}`}
              title="Simulate Speech-to-Text input"
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
              placeholder="Type or speak a question..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={() => handleSendChatMessage()}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* QUICK ASSIST MODAL FORM */}
      {showAssistForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-5 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-600 font-mono font-bold">
                <Accessibility className="w-5 h-5 text-rose-500" />
                DISPATCH PHYSICAL VOLUNTEER ASSIST
              </div>
              <button
                onClick={() => setShowAssistForm(false)}
                className="text-slate-400 hover:text-slate-300 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAssist} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1 font-bold">SUPPORT CATEGORY</label>
                <select
                  value={assistCategory}
                  onChange={(e: any) => setAssistCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-xl text-slate-200 outline-none focus:border-rose-500 font-semibold"
                >
                  <option value="accessibility">♿ Mobility & Access Escort</option>
                  <option value="medical">🩹 Mild Medical / First Aid Guidance</option>
                  <option value="lost">🔍 Lost & Found Items</option>
                  <option value="general">❓ General Directions & Guide Info</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1 font-bold">STADIUM ZONE (TARGET LOCATION)</label>
                <select
                  value={selectedSourceZone}
                  onChange={(e) => setSelectedSourceZone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-xl text-slate-200 outline-none focus:border-rose-500 font-semibold"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} (Density: {z.currentDensityPct}%)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  * Note: Human volunteer dispatches safely coordinate within active stadium sections.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1 font-bold">ADDITIONAL DESCRIPTION / COMMENT</label>
                <textarea
                  value={assistDesc}
                  onChange={(e) => setAssistDesc(e.target.value)}
                  rows={3}
                  placeholder="E.g., elderly fan needing wheelchair lift support near ramp 4B."
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs rounded-xl text-slate-200 outline-none focus:border-rose-500 font-semibold"
                  required
                />
              </div>

              {assistSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-700 text-xs font-mono font-medium">
                  {assistSuccessMessage}
                </div>
              )}

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssistForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-mono cursor-pointer font-bold transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors shadow-sm"
                  disabled={assistSubmitting}
                >
                  {assistSubmitting ? "DISPATCHING..." : "CONFIRM DISPATCH REQUEST"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
