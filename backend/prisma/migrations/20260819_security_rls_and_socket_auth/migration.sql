-- Migration: security_rls_and_socket_auth
-- Applied: 2026-08-19
-- Description:
--   Enable Row Level Security (RLS) on all 14 application tables.
--   No permissive policies are added — deny-all for anon/authenticated PostgREST roles.
--   postgres superuser (Prisma) and service_role (Storage) are unaffected (bypass RLS).
--   REVOKE anon/authenticated access to spatial_ref_sys (supabase_admin owned, RLS not possible).
--   REVOKE anon/authenticated EXECUTE on internal cron functions.
--   Fix mutable search_path on sync_expired_students.

-- RLS: application tables
ALTER TABLE public.users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_locations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_segment_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations         ENABLE ROW LEVEL SECURITY;

-- spatial_ref_sys: owned by supabase_admin, cannot enable RLS — revoke instead
REVOKE ALL ON public.spatial_ref_sys FROM anon;
REVOKE ALL ON public.spatial_ref_sys FROM authenticated;

-- sync_expired_students: revoke PostgREST exposure + fix search_path
REVOKE EXECUTE ON FUNCTION public.sync_expired_students() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_expired_students() FROM authenticated;
ALTER FUNCTION public.sync_expired_students() SET search_path = public, extensions;
