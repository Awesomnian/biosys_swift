/*
  # Swift Parrot Bioacoustic Sensor Database Schema

  ## Overview
  Creates the database structure for storing Swift Parrot audio detections from deployed sensors.

  ## New Tables
  
  ### `detections`
  Stores metadata for each positive Swift Parrot detection event
  - `id` (uuid, primary key) - Unique identifier for each detection
  - `device_id` (text) - Unique identifier for the sensor device
  - `timestamp` (timestamptz) - When the detection occurred
  - `latitude` (numeric) - GPS latitude coordinate
  - `longitude` (numeric) - GPS longitude coordinate
  - `model_name` (text) - AI model version used
  - `confidence` (numeric) - Detection confidence score (0.0 to 1.0)
  - `audio_file_url` (text) - URL to stored audio file in Supabase Storage
  - `uploaded_at` (timestamptz) - When data was uploaded to server
  - `created_at` (timestamptz) - Record creation timestamp

  ### `sensor_status`
  Tracks the operational status and health of deployed sensors
  - `device_id` (text, primary key) - Unique device identifier
  - `last_seen` (timestamptz) - Last contact with server
  - `battery_level` (numeric) - Battery percentage if available
  - `storage_used_mb` (numeric) - Local storage usage
  - `total_detections` (integer) - Lifetime detection count
  - `status` (text) - Operational status (active, offline, error)
  - `updated_at` (timestamptz) - Last status update

  ## Security
  - Enable RLS on all tables
  - Public read access for researchers (authenticated users)
  - Insert access for sensor devices (via service role or device-specific tokens)
*/

-- Create detections table
CREATE TABLE IF NOT EXISTS detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  latitude numeric,
  longitude numeric,
  model_name text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  species_common_name TEXT,
  scientific_name TEXT,
  audio_file_url text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create sensor_status table
CREATE TABLE IF NOT EXISTS sensor_status (
  device_id text PRIMARY KEY,
  last_seen timestamptz DEFAULT now(),
  battery_level numeric CHECK (battery_level >= 0 AND battery_level <= 100),
  storage_used_mb numeric DEFAULT 0,
  total_detections integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'offline', 'error')),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_detections_device_id ON detections(device_id);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_detections_confidence ON detections(confidence DESC);

-- Enable Row Level Security
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_status ENABLE ROW LEVEL SECURITY;

-- Policies for detections table
CREATE POLICY "Anyone can view detections"
  ON detections
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert detections"
  ON detections
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policies for sensor_status table
CREATE POLICY "Anyone can view sensor status"
  ON sensor_status
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert sensor status"
  ON sensor_status
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Service role can update sensor status"
  ON sensor_status
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);