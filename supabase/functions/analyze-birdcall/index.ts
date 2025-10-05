import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BirdNETResult {
  species: string;
  common_name: string;
  scientific_name: string;
  confidence: number;
  start_time?: number;
  end_time?: number;
}

interface AnalysisResponse {
  confidence: number;
  isPositive: boolean;
  modelName: string;
  species?: string;
  commonName?: string;
  scientificName?: string;
  allDetections?: BirdNETResult[];
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
    const birdnetUrl = Deno.env.get("BIRDNET_SERVER_URL") || "http://localhost:8080";
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
    birdnetFormData.append("audio", audioFile);

    const birdnetResponse = await fetch(`${birdnetUrl}/analyze`, {
      method: "POST",
      body: birdnetFormData,
    });

    if (!birdnetResponse.ok) {
      throw new Error(`BirdNET server returned ${birdnetResponse.status}: ${await birdnetResponse.text()}`);
    }

    const results: BirdNETResult[] = await birdnetResponse.json();
    console.log(`BirdNET returned ${results.length} detections`);

    const swiftParrotNames = [
      "Lathamus discolor",
      "Swift Parrot",
    ];

    const swiftParrotDetection = results.find((result) =>
      swiftParrotNames.some((name) =>
        result.scientific_name?.toLowerCase().includes(name.toLowerCase()) ||
        result.common_name?.toLowerCase().includes(name.toLowerCase()) ||
        result.species?.toLowerCase().includes(name.toLowerCase())
      )
    );

    const threshold = 0.9;
    const confidence = swiftParrotDetection?.confidence || 0;
    const isPositive = confidence >= threshold;

    const response: AnalysisResponse = {
      confidence,
      isPositive,
      modelName: "BirdNET",
      species: swiftParrotDetection?.species,
      commonName: swiftParrotDetection?.common_name,
      scientificName: swiftParrotDetection?.scientific_name,
      allDetections: results.slice(0, 10),
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
