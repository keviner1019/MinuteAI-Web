-- Fix RLS policy to allow joining meetings by meeting code
-- Problem: Guests cannot see meetings to join because they're not yet guest_id

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;

-- Create new policies:
-- 1. Users can view meetings where they are host or guest
CREATE POLICY "Users can view their meetings"
    ON public.meetings FOR SELECT
    USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- 2. Anyone authenticated can view meetings by meeting_code (for joining)
CREATE POLICY "Authenticated users can view meetings by code"
    ON public.meetings FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND meeting_code IS NOT NULL
    );

-- 3. Allow guests to update meeting when joining (to set guest_id)
DROP POLICY IF EXISTS "Guests can join meetings" ON public.meetings;
CREATE POLICY "Guests can join meetings"
    ON public.meetings FOR UPDATE
    USING (
        auth.uid() IS NOT NULL 
        AND guest_id IS NULL
        AND meeting_code IS NOT NULL
    )
    WITH CHECK (
        auth.uid() = guest_id
    );

