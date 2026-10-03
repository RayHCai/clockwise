# PRD: Interactive Multimodal Dementia Screening Agent

**Author:** Ray Flanagan | **Date:** April 2026 | **Status:** Draft

---

## Problem

The Clock Drawing Test (CDT) is a clinically validated 2-minute dementia screen, but current implementations suffer from three limitations: (1) manual scoring is subjective and misses subtle process-level signals, (2) AI-powered digital CDT tools (e.g., DCTclock) analyze drawings in isolation without leveraging speech biomarkers, and (3) conversational AI screeners (e.g., CognoSpeak, DCS) capture voice but exclude drawing tasks. No existing system combines real-time verbal guidance with simultaneous drawing and speech analysis, despite multimodal fusion consistently improving classification accuracy by 7 to 11 points over any single modality (Yamada et al., 2021; Banks et al., 2024).

## Vision

A voice-guided AI agent that walks patients through the Clock Drawing Test conversationally while simultaneously analyzing the drawing process via computer vision and extracting speech biomarkers from the patient's verbal responses, producing a unified cognitive risk score.

## Target Users

- **Primary:** Primary care clinicians conducting routine cognitive screening (Medicare Annual Wellness Visits, 60M+ annually)
- **Secondary:** Clinical trial sites needing scalable, remote cognitive assessment for AD drug trials
- **Tertiary:** Caregivers and telemedicine providers seeking remote-friendly screening tools

## Core Capabilities

### 1. Voice Agent, Guided CDT Administration
- Conversational agent delivers standardized CDT instructions ("Draw a clock showing 10 past 11")
- Adapts pacing and provides gentle prompts based on patient hesitation or silence
- Captures and timestamps all patient speech during the session
- Designed for accessibility: clear, warm tone; supports hearing-impaired patients via visual text fallback

### 2. Drawing Analysis, Real-Time Computer Vision
- Captures drawing input via tablet/stylus (iPad + Apple Pencil primary target)
- Extracts process features: stroke order, velocity, hesitation pauses, pen pressure, latency between elements
- Extracts product features: circle closure, number placement/spacing, hand position accuracy, symmetry
- Runs inference on completed drawing using fine-tuned ViT or CNN classifier (target: ≥90% balanced accuracy on NHATS benchmark)

### 3. Speech Analysis, Voice Biomarker Extraction
- Real-time ASR transcription of patient speech during the task
- Acoustic features: pause frequency/duration, speech rate, jitter, shimmer, MFCCs
- Linguistic features: lexical diversity, semantic coherence, word-finding difficulty markers, repetitions
- Discourse features: response latency to prompts, conversational engagement level

### 4. Speech Graph Analysis, Real-Time Topological Visualization
Speech Graph Analysis (SGA) converts patient speech into directed network graphs where each unique word becomes a node and consecutive word pairs create edges. Developed by Mota et al. (2012, *PLOS ONE*) and validated on the DementiaBank Pitt Corpus by Botezatu, Miller & Kiselica (2023, *Frontiers in Aging Neuroscience*), SGA produces an instantly interpretable visual biomarker: healthy speech generates dense, richly connected graphs while dementia speech collapses into sparse, tight loops.

**Graph construction:** Transcribed speech is processed through a 30-word sliding window (3-word step). Each unique word = node; each consecutive word pair = directed edge. Edge thickness scales with repetition count.

**Key diagnostic metrics:**
- **Largest Strongly Connected Component (LSC):** Measures long-range word recurrence. Small LSC → patient can't sustain varied speech → concerning.
- **Loop counts (L1, L2, L3):** Short cycles indicate repetitive, looping speech patterns characteristic of AD.
- **Parallel edges:** Multiple edges between the same node pair → same word sequences on repeat.
- **Connected components:** Disconnected subgraphs → fragmented, disjointed topic flow.
- **Node count:** Few unique nodes → impoverished vocabulary.

**Visual signal:** A healthy speaker's graph looks like an expansive web with many nodes and thin, diverse edges. An AD patient's graph collapses into a small cluster with thick repeated edges and tight loops. This contrast is immediately visible without explanation, the graph *is* the diagnosis.

**Real-time animation:** The graph builds live as the patient speaks during the CDT session. Clinicians (and the fusion model) watch whether the network expands outward (healthy) or collapses into repetitive loops (concerning). This runs alongside the voice agent interaction, providing a continuous visual signal during the assessment.

**Implementation:** The open-source `SpeechGraphs` Python library (UFRN neuroscience lab) computes all metrics from plain text. Frontend visualization via D3.js or vis.js with force-directed layout. Proven at hackathon scale (Patronum, TreeHacks 2026).

### 5. Multimodal Fusion, Unified Cognitive Risk Score
- Late-fusion model combining drawing process score, drawing product score, speech biomarker score, and speech graph topology metrics (LSC, loop counts, component structure)
- Outputs: composite risk score (0 to 100), per-domain subscores (visuospatial, executive, language, motor), confidence interval
- Calibrated against established instruments (MoCA, MMSE) and, where available, amyloid-PET status
- Longitudinal tracking: flag significant decline across repeated administrations

## Architecture (High-Level)

```
┌─────────────────────────────────────────────────┐
│               Voice Agent Layer                 │
│  (LLM-driven conversational flow, TTS/STT)      │
└──────────┬──────────────────┬────────────────────┘
           │                  │
    ┌──────▼──────┐   ┌──────▼──────┐
    │  Drawing    │   │   Speech    │
    │  Pipeline   │   │   Pipeline  │
    │ (CV model,  │   │ (ASR, NLP,  │
    │  kinematic  │   │  acoustic   │
    │  features)  │   │  features)  │
    └──────┬──────┘   └──────┬──────┘
           │                  │
           │          ┌──────▼──────┐
           │          │   Speech    │
           │          │   Graph     │
           │          │ (SGA, D3.js │
           │          │  real-time  │
           │          │  topology)  │
           │          └──────┬──────┘
           │                  │
    ┌──────▼──────────────────▼──────┐
    │     Multimodal Fusion Model    │
    │  (late fusion, calibrated      │
    │   risk score output)           │
    └───────────────┬────────────────┘
                    │
            ┌───────▼───────┐
            │  Clinical     │
            │  Dashboard    │
            │  & Report     │
            └───────────────┘
```

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Drawing input | iPad + Apple Pencil | Captures pressure, tilt, velocity; DCTclock precedent; consumer-accessible |
| CV model | ViT-L/16 fine-tuned | Best published CDT accuracy (Bone et al., 2025); NHATS pre-training available |
| Speech model | Whisper ASR + HuBERT embeddings | Whisper for transcription; HuBERT for acoustic biomarkers (AUC 0.99 in Kakinuma et al., 2025) |
| Fusion strategy | Late fusion (learned weights) | Preserves per-modality interpretability; proven in Yamada et al. and DCRP |
| Voice agent | LLM with constrained prompt | Ensures standardized administration while maintaining natural conversation |
| Speech graph | SpeechGraphs lib + D3.js | Open-source (UFRN); validated on DementiaBank; real-time visual biomarker |

## Research Foundation

| Claim | Source | Key Metric |
|-------|--------|------------|
| Speech graph topology differentiates AD from healthy controls | Mota et al., 2012, *PLOS ONE*; Botezatu et al., 2023, *Front. Aging Neurosci* | LSC correlates with verbal fluency, n=143 |
| Digital CDT process features outperform all manual scoring | Souillard-Mandar et al., 2016 | AUC > 0.90, n=3,994 |
| DCTclock correlates with preclinical amyloid/tau pathology | Rentz et al., 2021, *Neurology* | OR 5.23 for amyloid positivity |
| Deep learning on static CDT images achieves mass-screening accuracy | Chen et al., 2020, *Scientific Reports* | 96.65% accuracy, n=1,315 |
| Voice-recognition cognitive screener validated at scale | Li et al., 2024 (DCS, China) | AUC 0.95 dementia, n=11,186 |
| Multimodal (speech+drawing+gait) beats single modality | Yamada et al., 2021, *J Alzheimer's Dis* | 93.0% accuracy vs 81.9% single-best |
| Combined clock+recall+voice predicts amyloid status | Banks et al., 2024, *Alz & Dem: DADM* | AUC 0.81 amyloid, n=930 |
| Interactive AI assessment is feasible and accepted by elderly | Yoshii et al., 2023, *JMIR* | 97.5% completion rate |

## Success Metrics

- **Diagnostic accuracy:** AUC ≥ 0.85 for MCI detection, ≥ 0.90 for dementia (validated against neuropsych battery + biomarkers)
- **Completion rate:** ≥ 95% of patients complete the full guided session without assistance
- **Time to complete:** ≤ 5 minutes total (CDT + voice interaction)
- **Clinical adoption:** Integration with ≥ 1 EHR system within 12 months of launch
- **Longitudinal sensitivity:** Detect clinically meaningful cognitive change (≥ 0.5 SD) across 6-month intervals

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| FDA regulatory pathway unclear for combined diagnostic | Target 510(k) with DCTclock as predicate; initial launch as clinical decision support (not diagnostic) |
| Bias in training data (NHATS skews older, US-based) | Validate on diverse cohorts; partner with international memory clinics |
| Patient discomfort with AI-administered assessment | User testing with dementia patients and caregivers; warm conversational design; clinician-in-the-loop option |
| Speech model accuracy degrades with accents/hearing aids | Fine-tune ASR on elderly speech corpora; visual text fallback for hearing-impaired |
| Overfitting on small multimodal datasets | Pre-train modalities independently on large datasets; freeze backbones during fusion training |

## Scope & Phasing

**Phase 1 (MVP, 0 to 4 months):** Tablet app with guided CDT voice agent + drawing CV analysis. No speech biomarkers. Output: drawing-only risk score + session recording.

**Phase 2 (4 to 8 months):** Add speech biomarker pipeline. Implement late-fusion model. Longitudinal tracking across sessions. Clinician dashboard with per-domain subscores.

**Phase 3 (8 to 14 months):** Clinical validation study (target n ≥ 500). EHR integration (FHIR). Regulatory submission prep. Remote/telemedicine deployment mode.

## Open Questions

1. Should the agent adapt its conversational behavior based on real-time drawing/speech signals (e.g., offer more encouragement if detecting distress), or maintain strict standardization for diagnostic validity?
2. What is the minimum viable dataset size for training the multimodal fusion layer with clinical-grade performance?
3. Is there a viable path to integrate with existing Linus Health / DCTclock infrastructure rather than building de novo?
4. How should the system handle patients who cannot complete the drawing task, is partial data clinically useful?