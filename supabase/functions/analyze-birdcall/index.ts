import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const birdnetUrl = Deno.env.get("BIRDNET_SERVER_URL") || "https://pruinose-alise-uncooled.ngrok-free.dev";
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

    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Analyzing audio file: ${audioFile.name}, size: ${audioFile.size} bytes`);

    const birdnetFormData = new FormData();
    birdnetFormData.append("file", audioFile);

    const birdnetResponse = await fetch(`${birdnetUrl}/inference/`, {
      method: "POST",
      body: birdnetFormData,
    });

    if (!birdnetResponse.ok) {
      throw new Error(`BirdNET server returned ${birdnetResponse.status}: ${await birdnetResponse.text()}`);
    }

    const birdnetData: BirdNETResponse = await birdnetResponse.json();
    console.log(`BirdNET returned ${birdnetData.predictions.length} time segments`);

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

    const swiftParrotNames = [
      "Lathamus discolor",
      "Swift Parrot",
    ];

    const swiftParrotDetection = allDetections.find((detection) =>
      swiftParrotNames.some((name) =>
        detection.species_name.toLowerCase().includes(name.toLowerCase())
      )
    );

    const threshold = 0.9;
    const confidence = swiftParrotDetection?.probability || 0;
    const isPositive = confidence >= threshold;

    const response: AnalysisResponse = {
      confidence,
      isPositive,
      modelName: "BirdNET",
      species: swiftParrotDetection?.species_name,
      allDetections: allDetections.slice(0, 10),
    };

    console.log(`Analysis complete. Swift Parrot confidence: ${confidence.toFixed(3)}`);

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