"""
Multimodal fusion engine using Gemini.

Combines drawing observations, speech graph metrics, and transcript
to produce a unified cognitive risk score.
"""

import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


def get_client() -> genai.Client:
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


async def analyze_fusion(
    drawing_observations: list[str],
    speech_metrics: dict,
    transcript: str,
) -> dict:
    """
    Run multimodal fusion analysis combining all modalities.

    Returns structured risk assessment with composite score and per-domain subscores.
    """
    client = get_client()

    prompt = f"""You are a clinical cognitive assessment AI. Analyze the following \
multimodal data
from a Clock Drawing Test (CDT) dementia screening session and produce a structured \
risk assessment.

## Drawing Observations (from real-time camera analysis)
{json.dumps(drawing_observations, indent=2)}

## Speech Graph Metrics
{json.dumps(speech_metrics, indent=2)}

Key metric interpretation:
- N (unique words): Low = impoverished vocabulary
- LSC (largest strongly connected component): Small = fragmented speech
- L1 (self-loops): High = word perseveration (concerning)
- L2, L3 (short cycles): High = repetitive looping speech
- PE (parallel edges): High = repeated word sequences
- ATD (avg total degree): Low = sparse language network
- density: Low with few nodes = cognitive impairment indicator

## Patient Speech Transcript
"{transcript}"

## Instructions
Produce a JSON response with:
1. "composite_score": 0-100 (0=no concern, 100=severe concern)
2. "risk_level": "low" | "moderate" | "high"
3. "subscores": object with keys "visuospatial", "executive", "language", "motor" each \
0-100
4. "confidence": "low" | "medium" | "high"
5. "clinical_notes": brief clinical summary (2-3 sentences)
6. "drawing_assessment": brief assessment of clock drawing quality
7. "speech_assessment": brief assessment of speech patterns

IMPORTANT: This is a screening tool, not a diagnosis. Frame all outputs as risk \
indicators
that warrant further clinical evaluation."""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {
            "composite_score": 0,
            "risk_level": "low",
            "subscores": {"visuospatial": 0, "executive": 0, "language": 0, "motor": 0},
            "confidence": "low",
            "clinical_notes": "Analysis could not be completed. Please retry.",
            "drawing_assessment": "Unable to assess.",
            "speech_assessment": "Unable to assess.",
        }
