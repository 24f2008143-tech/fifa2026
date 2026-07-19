-- Create Venues table
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    capacity INTEGER NOT NULL
);

-- Create Gates table
CREATE TABLE IF NOT EXISTS public.gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('standard', 'accessible')),
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    capacity INTEGER NOT NULL
);

-- Create Zones table
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    current_density_pct INTEGER NOT NULL DEFAULT 0,
    history INTEGER[] NOT NULL DEFAULT '{}'
);

-- Create Matches table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    kickoff_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('upcoming', 'live', 'completed'))
);

-- Create Incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    zone_id TEXT NOT NULL, -- Keep as TEXT for now to match mock data
    type TEXT NOT NULL CHECK (type IN ('crowd_warning', 'medical', 'accessibility', 'security', 'other', 'capacity_warning')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'emergency')),
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved')),
    description TEXT NOT NULL,
    reported_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create HelpRequests table
CREATE TABLE IF NOT EXISTS public.help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    zone_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('accessibility', 'medical', 'lost', 'general')),
    status TEXT NOT NULL CHECK (status IN ('unassigned', 'assigned', 'resolved')),
    assigned_volunteer_id TEXT,
    description TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Broadcasts table
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'advisory', 'urgent')),
    original TEXT NOT NULL,
    translations JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CrowdSnapshots table
CREATE TABLE IF NOT EXISTS public.crowd_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    density_pct INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create VenuePolicies table
CREATE TABLE IF NOT EXISTS public.venue_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL
);

-- Create CopilotSuggestions table
CREATE TABLE IF NOT EXISTS public.copilot_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    suggestion TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'modified', 'dismissed', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- Setup realtime
alter publication supabase_realtime add table public.help_requests;
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.zones;
