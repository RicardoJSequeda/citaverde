-- ==================== DEAD LETTER QUEUE TABLE ====================
-- Stores failed notifications for manual retry and audit trail

CREATE TABLE IF NOT EXISTS notification_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
  error_message TEXT,
  payload JSONB NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'abandoned'
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_dlq_status ON notification_dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dlq_user_id ON notification_dead_letter_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON notification_dead_letter_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dlq_channel ON notification_dead_letter_queue(channel);
CREATE INDEX IF NOT EXISTS idx_dlq_notification_id ON notification_dead_letter_queue(notification_id);

-- ==================== ENABLE RLS ====================

ALTER TABLE notification_dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- Admin can view all DLQ entries
CREATE POLICY IF NOT EXISTS "dlq_admin_access"
  ON notification_dead_letter_queue
  FOR SELECT
  USING (
    (SELECT auth.uid()) IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Users can only see their own failed notifications
CREATE POLICY IF NOT EXISTS "dlq_user_access"
  ON notification_dead_letter_queue
  FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can insert (from workers)
CREATE POLICY IF NOT EXISTS "dlq_insert"
  ON notification_dead_letter_queue
  FOR INSERT
  WITH CHECK (true); -- Service role bypass

-- Only service role can update
CREATE POLICY IF NOT EXISTS "dlq_update"
  ON notification_dead_letter_queue
  FOR UPDATE
  USING (true) -- Service role bypass
  WITH CHECK (true);

-- ==================== COMMENTS ====================

COMMENT ON TABLE notification_dead_letter_queue IS 'Failed notifications that need manual retry or investigation';
COMMENT ON COLUMN notification_dead_letter_queue.status IS 'pending: waiting for retry, resolved: successfully retried, abandoned: exceeded max attempts';
COMMENT ON COLUMN notification_dead_letter_queue.payload IS 'Original notification payload for retry';

-- ==================== TRIGGER FOR updated_at ====================

CREATE OR REPLACE FUNCTION update_dlq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dlq_updated_at ON notification_dead_letter_queue;
CREATE TRIGGER trigger_dlq_updated_at
  BEFORE UPDATE ON notification_dead_letter_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_dlq_updated_at();
