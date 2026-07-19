-- Seed Data

-- Venues
INSERT INTO public.venues (id, name, city, country, capacity) VALUES
('b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'MetLife Stadium', 'New York/New Jersey', 'USA', 82500),
('c8112c32-15bb-41cb-8758-294b0d014494', 'Estadio Azteca', 'Mexico City', 'Mexico', 83264);

-- Zones (MetLife)
INSERT INTO public.zones (id, venue_id, name, current_density_pct, history) VALUES
('4b18c7c2-9e5c-4860-84a1-026859560f78', 'b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'North Concourse', 45, '{40,42,45}'),
('d53027b1-218a-4933-9069-424a1b02b545', 'b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'South Plaza', 82, '{70,75,82}'),
('889608cf-2dfa-497d-bb62-63b7e4529db1', 'b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'East Wing', 65, '{50,60,65}');

-- Gates (MetLife)
INSERT INTO public.gates (id, venue_id, name, type, current_occupancy, capacity) VALUES
('11b7dfaf-5bc4-4786-905e-a9b0d2d3a372', 'b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'Gate 1', 'standard', 120, 200),
('3426e952-4e4b-486a-85d8-c6729e2f41c4', 'b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'Gate 2', 'accessible', 15, 50);

-- Venue Policies
INSERT INTO public.venue_policies (venue_id, question, answer) VALUES
('b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'can fans bring their own water bottles', 'Fans may bring one factory-sealed plastic water bottle of 20 oz or less.'),
('b19d5203-9d04-44b2-a4f6-860f4e918b9f', 're-entry policy', 'Re-entry is strictly prohibited. Once a ticket is scanned, the fan may not exit and re-enter the stadium.'),
('b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'nearest first-aid point', 'First aid stations are located near sections 104, 123, 227, and 338.');


-- Matches
INSERT INTO public.matches (venue_id, home_team, away_team, kickoff_at, status) VALUES
('b19d5203-9d04-44b2-a4f6-860f4e918b9f', 'USA', 'MEX', now() - interval '72 minutes', 'live'),
('c8112c32-15bb-41cb-8758-294b0d014494', 'CAN', 'BRA', now() - interval '20 minutes', 'live');
