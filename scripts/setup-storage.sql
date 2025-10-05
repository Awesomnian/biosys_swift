-- Create storage bucket for audio detections
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-detections', 'audio-detections', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for audio detections bucket
CREATE POLICY "Public can view audio files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-detections');

CREATE POLICY "Service role can upload audio files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'audio-detections');

CREATE POLICY "Service role can delete audio files"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'audio-detections');
