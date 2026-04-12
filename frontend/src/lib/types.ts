export interface SpeechGraphMetrics {
  N: number;
  E: number;
  PE: number;
  L1: number;
  L2: number;
  L3: number;
  LCC: number;
  LSC: number;
  ATD: number;
  density: number;
}

export interface GraphNode {
  id: string;
  label: string;
  frequency: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface SpeechGraphResult {
  metrics: SpeechGraphMetrics;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface FusionResult {
  composite_score: number;
  risk_level: "low" | "moderate" | "high";
  subscores: {
    visuospatial: number;
    executive: number;
    language: number;
    motor: number;
  };
  confidence: "low" | "medium" | "high";
  clinical_notes: string;
  drawing_assessment: string;
  speech_assessment: string;
}

export type SessionState = "idle" | "recording" | "analyzing" | "complete";
