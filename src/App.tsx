import React, { useState, useEffect } from "react";
import {
  Shield,
  Activity,
  Award,
  BookOpen,
  CheckCircle,
  HelpCircle,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Accessibility,
  Volume2,
  Lock,
  Globe,
  Bell,
  Sliders,
  Flag,
  Wifi
} from "lucide-react";
import { Venue, Gate, Zone, Match, Incident, HelpRequest, Broadcast } from "./types";
import FanApp from "./components/FanApp";
import VolunteerApp from "./components/VolunteerApp";
import StaffConsole from "./components/StaffConsole";
import * as supabaseService from "./services/supabase";
import * as dbService from "./services/db";

export default function App() {
  // Navigation & Role Tabs
  const [activeRole, setActiveRole] = useState<"fan" | "volunteer" | "staff">("fan");

  // Database lists
  const [venues, setVenues] = useState<Venue[]>([]);
  const [activeVenueId, setActiveVenueId] = useState<string>("v1");
  const [activeVenue, setActiveVenue] = useState<Venue | null>(null);

  // Live entity states
  const [gates, setGates] = useState<Gate[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  // Ticker state
  const [tickerMessage, setTickerMessage] = useState<string>("WORLD CUP 2026: STADIUM SENSOR NETWORKS ONLINE");

  // Loading indicator
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [systemAlertCount, setSystemAlertCount] = useState<number>(0);

  // Fetch all venues
  const loadVenues = async () => {
    try {
      const data = await dbService.fetchVenues();
      setVenues(data);
      if (data.length > 0) {
        const defaultVenue = data.find((v: any) => v.id === activeVenueId) || data[0];
        setActiveVenue(defaultVenue);
      }
    } catch (e) {
      console.error("Error fetching venues", e);
    }
  };

  // Fetch state for active venue
  const loadLiveState = async (venueId: string) => {
    try {
      const data = await dbService.fetchVenueState(venueId);
      setGates(data.gates || []);
      setZones(data.zones || []);
      setMatches(data.matches || []);
      setIncidents(data.incidents || []);
      setHelpRequests(data.helpRequests || []);
      setBroadcasts(data.broadcasts || []);

      // Calculate critical alerts
      const criticalCount = (data.incidents || []).filter((i: any) => i.status === "active").length;
      setSystemAlertCount(criticalCount);

      // Set rotating ticker message
      if (data.broadcasts && data.broadcasts.length > 0) {
        setTickerMessage(`ANNOUNCEMENT: ${data.broadcasts[0].original}`);
      } else if (criticalCount > 0) {
        setTickerMessage(`CRITICAL WARNING: ${data.incidents[0].description}`);
      } else {
        setTickerMessage(`WORLD CUP 2026: SYSTEM HEALTH NOMINAL FOR ${venueId.toUpperCase()}`);
      }
    } catch (e) {
      console.error("Error loading live state", e);
    } finally {
      setDbLoading(false);
    }
  };

  // Initial loads
  useEffect(() => {
    loadVenues();
  }, []);

  // Sync state for active venue and poll every 5 seconds for simulation drift
  useEffect(() => {
    if (activeVenueId) {
      loadLiveState(activeVenueId);
      const interval = setInterval(() => {
        loadLiveState(activeVenueId);
      }, 5000);

      // Phase 4: Supabase Realtime Subscriptions
      // These will override local mock data as soon as real Supabase events occur.
      const zonesSub = supabaseService.subscribeToZones((payload) => {
        setZones((prev) => 
          prev.map((z) => (z.id === (payload.new as any).id ? { ...z, ...payload.new } : z))
        );
      });

      const incidentsSub = supabaseService.subscribeToIncidents((payload) => {
        setIncidents((prev) => {
          const exists = prev.find((i) => i.id === (payload.new as any).id);
          if (exists) {
            return prev.map((i) => (i.id === (payload.new as any).id ? { ...i, ...payload.new } : i));
          }
          return [payload.new as any, ...prev];
        });
      });

      const helpRequestsSub = supabaseService.subscribeToHelpRequests((payload) => {
        setHelpRequests((prev) => {
          const exists = prev.find((h) => h.id === (payload.new as any).id);
          if (exists) {
            return prev.map((h) => (h.id === (payload.new as any).id ? { ...h, ...payload.new } : h));
          }
          return [payload.new as any, ...prev];
        });
      });

      const crowdSnapshotsSub = supabaseService.subscribeToCrowdSnapshots((payload) => {
        setZones((prev) => 
          prev.map((z) => (z.id === (payload.new as any).zone_id ? { ...z, currentDensityPct: (payload.new as any).density_pct } : z))
        );
      });

      return () => {
        clearInterval(interval);
        zonesSub.unsubscribe();
        incidentsSub.unsubscribe();
        helpRequestsSub.unsubscribe();
        crowdSnapshotsSub.unsubscribe();
      };
    }
  }, [activeVenueId]);

  // Handle active venue selection change
  const handleVenueChange = (venueId: string) => {
    setActiveVenueId(venueId);
    const item = venues.find((v) => v.id === venueId);
    if (item) setActiveVenue(item);
  };

  // Restore/Reset Database
  const handleResetDB = async () => {
    if (window.confirm("Are you sure you want to reset and re-seed the stadium databases to initial state?")) {
      try {
        const data = await dbService.initDatabase();
        if (data.success) {
          alert("Stadium databases re-seeded successfully!");
          loadLiveState(activeVenueId);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-signal-blue selection:text-command-navy">
      {/* 1. Global Tactical Header */}
      <header className="bg-command-navy border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Network state */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-live-amber shadow-md shadow-amber-900/50 flex items-center justify-center">
              <span className="text-command-navy font-black text-lg font-display tracking-wider">S26</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-wider font-display text-chalk">SYNAPSE 26</h1>
                <span className="flex items-center gap-1 text-[9px] text-live-amber font-mono bg-live-amber/10 px-1.5 py-0.5 rounded-sm border border-live-amber/30">
                  <Wifi className="w-2.5 h-2.5 animate-pulse" /> ON AIR
                </span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                FIFA World Cup Operations Portal
              </p>
            </div>
          </div>

          {/* Core Controls: Venue Select & DB Re-seed */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Active Venue Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-xs shadow-sm">
              <MapPin className="w-4 h-4 text-signal-blue shrink-0" />
              <select
                value={activeVenueId}
                onChange={(e) => handleVenueChange(e.target.value)}
                className="bg-transparent text-chalk outline-none pr-1 font-mono cursor-pointer font-semibold"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-chalk">
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Simulated UTC Clock */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs font-mono text-live-amber font-semibold shadow-sm">
              <span className="animate-pulse w-1.5 h-1.5 bg-live-amber rounded-full inline-block"></span>
              2026-07-08 UTC
            </div>

            {/* Re-seed button */}
            <button
              onClick={handleResetDB}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-chalk rounded-md cursor-pointer transition-all flex items-center gap-1 shadow-sm font-semibold"
              title="Reset Simulated Database State"
            >
              <RefreshCw className="w-3 h-3" /> RESET STATE
            </button>
          </div>
        </div>
      </header>

      {/* 2. Real-Time Alert Broadcast Ticker */}
      <div className="bg-alert-red border-b border-red-900 px-4 py-1.5 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-[10px] font-mono font-extrabold text-chalk bg-command-navy/50 px-2.5 py-0.5 rounded-sm shrink-0 flex items-center gap-1 border border-chalk/20">
            <Bell className="w-2.5 h-2.5 animate-pulse" /> BROADCAST FEED
          </span>
          <div className="text-xs font-mono text-chalk font-bold overflow-hidden text-ellipsis whitespace-nowrap animate-[marquee_20s_linear_infinite] tracking-widest">
            {tickerMessage}
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Switch Persona Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
          <button
            onClick={() => setActiveRole("fan")}
            className={`py-3 rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
              activeRole === "fan"
                ? "bg-pitch text-chalk shadow-md border-b-2 border-live-amber"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            }`}
          >
            🎟️ FAN COMPANION
          </button>
          <button
            onClick={() => setActiveRole("volunteer")}
            className={`py-3 rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
              activeRole === "volunteer"
                ? "bg-pitch text-chalk shadow-md border-b-2 border-live-amber"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            }`}
          >
            🙋 VOLUNTEER OPS
          </button>
          <button
            onClick={() => setActiveRole("staff")}
            className={`py-3 rounded-md font-mono text-xs font-bold tracking-wider transition-all cursor-pointer ${
              activeRole === "staff"
                ? "bg-pitch text-chalk shadow-md border-b-2 border-live-amber"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            }`}
          >
            🏢 STAFF CONSOLE
          </button>
        </div>

        {/* Live Metrics Quick Glance Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block mb-1">VENUE NAME</span>
            <span className="text-2xl font-black font-display tracking-widest text-chalk block truncate">
              {activeVenue ? activeVenue.name : "MetLife Stadium"}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block mb-1">STADIUM DENSITY</span>
            <span className="text-2xl font-black font-display tracking-widest text-live-amber block flex items-center gap-1.5">
              <Sliders className="w-5 h-5 text-live-amber" /> 
              {(zones.reduce((sum, z) => sum + z.currentDensityPct, 0) / Math.max(1, zones.length)).toFixed(0)}% AVG
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block mb-1">ACTIVE THREAT EVENTS</span>
            <span className={`text-2xl font-black font-display tracking-widest block ${systemAlertCount > 0 ? "text-alert-red animate-pulse" : "text-chalk"}`}>
              {systemAlertCount}
              <span className="text-sm tracking-normal text-slate-500 ml-2">CRITICAL ALERTS</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block mb-1">SUPPORT TICKETS</span>
            <span className="text-2xl font-black font-display tracking-widest text-signal-blue block">
              {helpRequests.filter((h) => h.status !== "resolved").length}
              <span className="text-sm tracking-normal text-slate-500 ml-2">ACTIVE DISPATCHES</span>
            </span>
          </div>
        </div>

        {/* Dynamic Applet Container */}
        <div className="bg-transparent min-h-[460px] relative">
          {dbLoading ? (
            <div className="absolute inset-0 bg-command-navy/80 rounded-xl flex flex-col items-center justify-center space-y-2.5 z-10">
              <div className="w-8 h-8 border-t-2 border-live-amber rounded-full animate-spin"></div>
              <span className="text-xs font-mono text-slate-500">Loading live operational databases...</span>
            </div>
          ) : activeVenue ? (
            <>
              {activeRole === "fan" && (
                <FanApp
                  venue={activeVenue}
                  gates={gates}
                  zones={zones}
                  broadcasts={broadcasts}
                  matches={matches}
                  onRefresh={() => loadLiveState(activeVenueId)}
                />
              )}
              {activeRole === "volunteer" && (
                <VolunteerApp
                  venue={activeVenue}
                  helpRequests={helpRequests}
                  onRefresh={() => loadLiveState(activeVenueId)}
                />
              )}
              {activeRole === "staff" && (
                <StaffConsole
                  venue={activeVenue}
                  gates={gates}
                  zones={zones}
                  incidents={incidents}
                  helpRequests={helpRequests}
                  broadcasts={broadcasts}
                  onRefresh={() => loadLiveState(activeVenueId)}
                />
              )}
            </>
          ) : (
            <div className="text-center text-slate-500 py-12">No active venue operational state.</div>
          )}
        </div>

      </main>

      {/* 4. Tactical Footer Info */}
      <footer className="bg-slate-950 border-t border-slate-800 py-5 px-4 text-center text-[10px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>SYSTEM VERSION: V4.1.26 - TOURNAMENT RUNTIME</span>
          <span>© FIFA WORLD CUP 2026 - SYNA-OPS INTEGRATION</span>
        </div>
      </footer>
    </div>
  );
}
