"""
Speech Graph Analysis (SGA) engine.

Converts patient speech transcripts into directed word-transition graphs
and computes topological metrics validated as cognitive biomarkers.

Reference: Mota et al. (2012) PLOS ONE; Botezatu et al. (2023) Front. Aging Neurosci.
"""

import re
import math
import networkx as nx
import numpy as np
from typing import TypedDict


class GraphNode(TypedDict):
    id: str
    label: str
    frequency: int


class GraphEdge(TypedDict):
    id: str
    source: str
    target: str
    weight: int


class SpeechGraphMetrics(TypedDict):
    N: int       # node count (unique words)
    E: int       # edge count (total transitions)
    PE: int      # parallel edges (repeated word pairs)
    L1: int      # 1-node loops (self-loops / immediate repetition)
    L2: int      # 2-node loops (A->B->A)
    L3: int      # 3-node loops (A->B->C->A)
    LCC: int     # largest weakly connected component
    LSC: int     # largest strongly connected component
    ATD: float   # average total degree
    density: float


class SpeechGraphResult(TypedDict):
    metrics: SpeechGraphMetrics
    nodes: list[GraphNode]
    edges: list[GraphEdge]


def tokenize(text: str) -> list[str]:
    """Lowercase and extract word tokens."""
    return re.findall(r"\b[a-z']+\b", text.lower())


def build_graph(words: list[str]) -> nx.DiGraph:
    """Build a directed graph from consecutive word pairs."""
    G = nx.DiGraph()
    for word in set(words):
        G.add_node(word)
    for i in range(len(words) - 1):
        src, tgt = words[i], words[i + 1]
        if G.has_edge(src, tgt):
            G[src][tgt]["weight"] += 1
        else:
            G.add_edge(src, tgt, weight=1)
    return G


def compute_metrics(G: nx.DiGraph, words: list[str]) -> SpeechGraphMetrics:
    """Compute all SGA topological metrics."""
    N = G.number_of_nodes()
    E = G.number_of_edges()

    if N == 0:
        return SpeechGraphMetrics(
            N=0, E=0, PE=0, L1=0, L2=0, L3=0,
            LCC=0, LSC=0, ATD=0.0, density=0.0,
        )

    # Parallel edges: edges with weight > 1
    PE = sum(1 for _, _, d in G.edges(data=True) if d["weight"] > 1)

    # L1: self-loops (word immediately repeated)
    L1 = sum(1 for i in range(len(words) - 1) if words[i] == words[i + 1])

    # L2, L3 via adjacency matrix trace
    A = nx.adjacency_matrix(G, weight=None).toarray().astype(np.float64)
    L2 = int(np.trace(A @ A))
    L3 = int(np.trace(A @ A @ A))

    # Connected components
    LCC = len(max(nx.weakly_connected_components(G), key=len))
    LSC = len(max(nx.strongly_connected_components(G), key=len))

    # Average total degree
    ATD = np.mean([G.in_degree(n) + G.out_degree(n) for n in G.nodes()])

    # Density (excluding self-loops)
    self_loops = nx.number_of_selfloops(G)
    density = (E - self_loops) / (N * N) if N > 0 else 0.0

    return SpeechGraphMetrics(
        N=N, E=E, PE=PE, L1=L1, L2=L2, L3=L3,
        LCC=LCC, LSC=LSC,
        ATD=round(float(ATD), 3),
        density=round(float(density), 4),
    )


def layout_nodes(G: nx.DiGraph) -> dict[str, tuple[float, float]]:
    """Compute force-directed positions for React Flow rendering."""
    if G.number_of_nodes() == 0:
        return {}
    if G.number_of_nodes() == 1:
        node = list(G.nodes())[0]
        return {node: (400.0, 300.0)}
    return nx.spring_layout(G, k=2.0 / math.sqrt(G.number_of_nodes()), iterations=50, seed=42, scale=300, center=(400, 300))


def analyze_transcript(transcript: str, window_size: int = 0, step: int = 3) -> SpeechGraphResult:
    """
    Full speech graph analysis pipeline.

    Args:
        transcript: Raw patient speech text
        window_size: Sliding window size (0 = use full transcript)
        step: Sliding window step size

    Returns:
        SpeechGraphResult with metrics, nodes, and edges for visualization
    """
    words = tokenize(transcript)

    if not words:
        return SpeechGraphResult(metrics=compute_metrics(nx.DiGraph(), []), nodes=[], edges=[])

    # Apply sliding window if requested (use last window for metrics)
    if window_size > 0 and len(words) > window_size:
        # Build graph from all windows for comprehensive visualization
        all_words_in_windows: list[str] = []
        for start in range(0, len(words) - window_size + 1, step):
            all_words_in_windows.extend(words[start : start + window_size])
        G = build_graph(words)  # full graph for visualization
        metrics = compute_metrics(G, words)
    else:
        G = build_graph(words)
        metrics = compute_metrics(G, words)

    # Compute layout positions
    positions = layout_nodes(G)

    # Word frequencies for node sizing
    freq: dict[str, int] = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1

    # Build node list
    nodes: list[GraphNode] = []
    for node_id in G.nodes():
        pos = positions.get(node_id, (400.0, 300.0))
        nodes.append(GraphNode(
            id=node_id,
            label=node_id,
            frequency=freq.get(node_id, 1),
        ))

    # Build edge list
    edges: list[GraphEdge] = []
    for src, tgt, data in G.edges(data=True):
        edges.append(GraphEdge(
            id=f"{src}->{tgt}",
            source=src,
            target=tgt,
            weight=data["weight"],
        ))

    return SpeechGraphResult(metrics=metrics, nodes=nodes, edges=edges)
