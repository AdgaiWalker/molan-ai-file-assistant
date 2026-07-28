CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  phone_number text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS devices (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  installation_id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  platform text NOT NULL,
  app_version text NOT NULL,
  trusted boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  revoked_at timestamptz,
  UNIQUE(user_id, installation_id)
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id text PRIMARY KEY,
  phone_number text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  device_id text NOT NULL REFERENCES devices(id),
  access_token_hash text NOT NULL UNIQUE,
  refresh_token_hash text NOT NULL UNIQUE,
  refresh_family_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_session_id text
);

CREATE TABLE IF NOT EXISTS file_objects (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  source_device_id text NOT NULL REFERENCES devices(id),
  role text NOT NULL,
  format text NOT NULL,
  media_type text NOT NULL,
  content_hash text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  object_key text,
  etag text,
  ai_read_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  UNIQUE(user_id, content_hash, role)
);

CREATE TABLE IF NOT EXISTS upload_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  device_id text NOT NULL REFERENCES devices(id),
  client_mutation_id text NOT NULL,
  request_hash text NOT NULL,
  file_object_id text NOT NULL,
  role text NOT NULL,
  format text NOT NULL,
  content_hash text NOT NULL,
  size_bytes bigint NOT NULL,
  media_type text NOT NULL,
  status text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE(user_id, client_mutation_id)
);

CREATE TABLE IF NOT EXISTS upload_parts (
  upload_id text NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  part_number integer NOT NULL CHECK (part_number > 0),
  etag text NOT NULL,
  size_bytes bigint NOT NULL,
  object_key text NOT NULL,
  PRIMARY KEY(upload_id, part_number)
);

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  source_device_id text NOT NULL REFERENCES devices(id),
  title text NOT NULL,
  original_format text NOT NULL,
  current_version_id text,
  state text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS document_versions (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES documents(id),
  source_device_id text NOT NULL REFERENCES devices(id),
  original_format text NOT NULL,
  content_hash text NOT NULL,
  size_bytes bigint NOT NULL,
  file_object_id text NOT NULL REFERENCES file_objects(id),
  parent_version_id text REFERENCES document_versions(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  UNIQUE(document_id, content_hash)
);

CREATE TABLE IF NOT EXISTS sync_events (
  sequence bigserial PRIMARY KEY,
  id text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES users(id),
  client_mutation_id text NOT NULL,
  payload_hash text NOT NULL,
  device_id text NOT NULL REFERENCES devices(id),
  document_id text NOT NULL,
  version_id text,
  base_version_id text,
  operation text NOT NULL,
  phase text NOT NULL,
  retry_count integer NOT NULL,
  object_storage_ref jsonb,
  tombstone jsonb,
  error_code text,
  event_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE(user_id, client_mutation_id)
);

CREATE INDEX IF NOT EXISTS sync_events_user_sequence ON sync_events(user_id, sequence);

CREATE TABLE IF NOT EXISTS conflicts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  document_id text NOT NULL REFERENCES documents(id),
  local_version_id text NOT NULL REFERENCES document_versions(id),
  remote_version_id text NOT NULL REFERENCES document_versions(id),
  detected_at timestamptz NOT NULL,
  resolved_at timestamptz,
  resolution text
);
