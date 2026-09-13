-- A restore runs only through the Admin-only, development-only backup service.
-- The transaction-local flag permits faithful insertion of historic activity
-- while keeping the normal closed-drawer protections in force everywhere else.
CREATE OR REPLACE FUNCTION require_open_cash_session() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.restore_mode', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW."cashSessionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "cash_sessions"
    WHERE "id" = NEW."cashSessionId" AND "status" = 'OPEN'
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'cash session is not open' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION require_open_session_for_reversal() RETURNS trigger AS $$
DECLARE
  session_id TEXT;
BEGIN
  IF current_setting('app.restore_mode', true) = 'on' THEN
    RETURN NEW;
  END IF;
  SELECT "cashSessionId" INTO session_id FROM "payments" WHERE "id" = NEW."paymentId";
  IF session_id IS NOT NULL THEN
    PERFORM 1 FROM "cash_sessions" WHERE "id" = session_id AND "status" = 'OPEN' FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'cash payment belongs to a closed session' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
