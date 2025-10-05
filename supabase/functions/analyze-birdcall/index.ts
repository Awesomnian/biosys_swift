import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SpeciesPrediction {
  species_name: string;
  probability: number;
}

interface TimeSegmentPrediction {
  start_time: number;
  stop_time: number;
  species: SpeciesPrediction[];
}

interface BirdNETResponse {
  predictions: TimeSegmentPrediction[];
}

interface DetectionResult {
  species_name: string;
  probability: number;
  start_time: number;
  stop_time: number;
}

interface AnalysisResponse {
  confidence: number;
  isPositive: boolean;
  modelName: string;
  species?: string;
  allDetections?: DetectionResult[];
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // BirdNET server URL
    const birdnetUrl = "https://pruinose-alise-uncooled.ngrok-free.dev";
    console.log(`Using BirdNET server at: ${birdnetUrl}`);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request body to get storage path
    const { storagePath, bucket } = await req.json();

    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: "No storage path provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Downloading audio from Supabase Storage: ${bucket || 'detections'}/${storagePath}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download audio file from Supabase Storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from(bucket || 'detections')
      .download(storagePath);

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`);
    }

    console.log(`Downloaded audio file: ${audioData.size} bytes`);

    // Create FormData for BirdNET
    const birdnetFormData = new FormData();
    birdnetFormData.append("file", audioData, storagePath);

    console.log('Sending to BirdNET...');

    // Send to BirdNET server
    const birdnetResponse = await fetch(`${birdnetUrl}/inference/`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      body: birdnetFormData,
    });

    if (!birdnetResponse.ok) {
      const errorText = await birdnetResponse.text();
      throw new Error(`BirdNET server returned ${birdnetResponse.status}: ${errorText}`);
    }

    const birdnetData: BirdNETResponse = await birdnetResponse.json();
    console.log(`BirdNET returned ${birdnetData.predictions.length} time segments`);

    // Flatten predictions
    const allDetections: DetectionResult[] = [];
    for (const segment of birdnetData.predictions) {
      for (const speciesDetection of segment.species) {
        allDetections.push({
          species_name: speciesDetection.species_name,
          probability: speciesDetection.probability,
          start_time: segment.start_time,
          stop_time: segment.stop_time,
        });
      }
    }

    // Find Swift Parrot detections
    const swiftParrotNames = [
      "Lathamus discolor",
      "Swift Parrot",
      "lathamus",
      "swift",
    ];

    const swiftParrotDetection = allDetections.find((detection) =>
      swiftParrotNames.some((name) =>
        detection.species_name.toLowerCase().includes(name.toLowerCase())
      )
    );

    const threshold = 0.9;
    const confidence = swiftParrotDetection?.probability || 
                      (allDetections.length > 0 ? allDetections[0].probability : 0);
    const isPositive = swiftParrotDetection ? confidence >= threshold : false;

    const response: AnalysisResponse = {
      confidence,
      isPositive,
      modelName: "BirdNET",
      species: swiftParrotDetection?.species_name || allDetections[0]?.species_name,
      allDetections: allDetections.slice(0, 10),
    };

    console.log(`Analysis complete. Swift Parrot: ${swiftParrotDetection ? 'YES' : 'NO'}, confidence: ${confidence.toFixed(3)}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error analyzing audio:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to analyze audio",
        confidence: 0,
        isPositive: false,
        modelName: "BirdNET",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});