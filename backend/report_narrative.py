"""Generate structured clinical narratives for PDF reports using Gemini."""

import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


def get_client() -> genai.Client:
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


async def generate_clinical_narrative(
    fusion_result: dict,
    drawing_observations: list[str],
    speech_metrics: dict,
    transcript: str,
) -> dict:
    """
    Generate an EHR-ready clinical narrative from session data.

    Returns structured output with plain-language clinical sentences,
    per-modality findings, and follow-up recommendations.
    """
    client = get_client()

    prompt = f"""You are a clinical neuropsychologist writing a cognitive screening \
report
for a patient's medical chart. Based on the following multimodal assessment data from a
Clock Drawing Test (CDT) session, produce a structured clinical narrative.

## Fusion Analysis Results
{json.dumps(fusion_result, indent=2)}

## Drawing Observations (AI-assisted real-time camera analysis)
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
Produce a JSON response with exactly these fields:

1. "summary_sentences": array of 2-3 plain-language sentences suitable for a medical \
chart.
   Use clinical language that a PCP would attach to an AWV note. Example style:
   "Patient demonstrated intact visuospatial construction but notable word-finding \
pauses
   consistent with early lexical retrieval difficulty."

2. "drawing_findings": One paragraph summarizing the clock drawing assessment.
   Note specific anomalies (missing numbers, hand placement errors, circle quality).

3. "speech_findings": One paragraph summarizing speech pattern observations.
   Reference specific graph metrics that are clinically relevant.

4. "recommendation": One sentence with a clinical follow-up recommendation based on
   the risk level (e.g., "Consider referral to neuropsychology for comprehensive \
evaluation"
   or "Routine follow-up in 12 months recommended").

5. "graph_interpretation": One sentence interpreting the speech graph for a clinician
   (e.g., "Speech network shows adequate connectivity with 45 unique words and dense
   recurrence patterns, suggesting intact verbal fluency").

IMPORTANT: This is a screening tool, not a diagnosis. Frame all findings as indicators
warranting clinical judgment. Use hedging language ("suggests", "consistent with",
"may indicate") rather than definitive diagnostic statements."""

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
        # Fallback using existing fusion data
        return {
            "summary_sentences": [
                fusion_result.get("clinical_notes", "Analysis could not be completed.")
            ],
            "drawing_findings": fusion_result.get(
                "drawing_assessment", "Unable to assess."
            ),
            "speech_findings": fusion_result.get(
                "speech_assessment", "Unable to assess."
            ),
            "recommendation": "Consider follow-up assessment.",
            "graph_interpretation": "Speech graph analysis unavailable.",
        }
