-- Migration: Auto-end meeting when last participant leaves
-- This trigger automatically ends a meeting when all participants have left

-- Create or replace the function to check and auto-end meetings
CREATE OR REPLACE FUNCTION check_auto_end_meeting()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
  meeting_status TEXT;
BEGIN
  -- Only proceed if a participant just became inactive
  IF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    -- Get the current meeting status
    SELECT status INTO meeting_status
    FROM public.meetings
    WHERE id = NEW.meeting_id;

    -- Only check for auto-end if meeting is active
    IF meeting_status = 'active' THEN
      -- Count remaining active participants
      SELECT COUNT(*) INTO active_count
      FROM public.meeting_participants
      WHERE meeting_id = NEW.meeting_id
        AND is_active = true;

      -- If no active participants remain, end the meeting
      IF active_count = 0 THEN
        UPDATE public.meetings
        SET
          status = 'ended',
          ended_at = NOW()
        WHERE id = NEW.meeting_id
          AND status = 'active';

        RAISE NOTICE 'Meeting % auto-ended: last participant left', NEW.meeting_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_end_meeting ON public.meeting_participants;

-- Create the trigger
CREATE TRIGGER trigger_auto_end_meeting
  AFTER UPDATE ON public.meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_auto_end_meeting();

-- Add comment
COMMENT ON FUNCTION check_auto_end_meeting() IS 'Automatically ends a meeting when the last participant leaves';
