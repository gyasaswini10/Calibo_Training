"""
MCP Server — lightweight topic facts for bullet content.
Why: This server acts as the 'Senses' for the agent, providing real-world grounding to prevent unconstrained hallucination.
"""

import logging # Quiet MCP/httpx INFO when spawned as stdio subprocess to keep the MCP JSON stream clean.
import re # Used to strip noise from queries and rank sentences using pattern matching.
import sys # Required for stderr diagnostic printing.
from typing import List, Dict, Any # Standard typing for structured research responses.
from urllib.parse import quote # Essential for safely encoding topic strings for REST API URL construction.

import httpx # A modern, async-capable HTTP client used for non-blocking Wikipedia/Dictionary lookups.

# Silence verbose library logs to prevent standard output pollution, which would break the MCP JSON protocol.
logging.getLogger("mcp").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

from mcp.server.fastmcp import FastMCP # FastMCP wrapper reduces boilerplate for tool implementation.

# Wikipedia REST API requires a descriptive User-Agent to avoid 403 Forbidden errors (Standard scraping etiquette).
_HTTP_HEADERS = {
    "User-Agent": "Autonomous-Research-Agent/1.0 (academic-project; python-httpx)",
    "Accept": "application/json",
}

mcp = FastMCP("research-mcp-server")

def _primary_topic_for_wikipedia(query: str) -> str:
    """
    Refines a conversational query into a clean Wikipedia article title.
    Why: Agents often send 'facts about X' which doesn't resolve to a page; we need just 'X'.
    """
    q = query.strip()
    # Logic: Remove common agentic prompt fluff to find the root subject.
    for suffix in (" facts biology", " facts", " overview"):
        if q.lower().endswith(suffix):
            q = q[: -len(suffix)].strip()
    
    # Logic: If query contains slide-specific sub-topics, strip them to find the main article.
    # Why: Wikipedia usually has one main article for the subject rather than sub-pages for 'Lifecycle of X'.
    low = q.lower()
    cut = len(q)
    sub_topics = [" origins", " taxonomy", " physiological", " growth", " ecological", " industrial"]
    for m in sub_topics:
        i = low.find(m)
        if i > 0: cut = min(cut, i)
    base = q[:cut].strip()
    return base if base else q

def _bullets_from_wikipedia_extract(extract: str, query: str) -> List[str]:
    """
    Deconstructs a raw Wikipedia text block into professional, readable bullet points.
    Why: Raw text blocks are overwhelming; bulleted lists are the standard for high-quality presentations.
    """
    extract = (extract or "").strip()
    if len(extract) < 40: return []

    # Logic: Use regex to split on sentence boundaries for granular processing.
    parts = re.split(r"(?<=[.!?])\s+", extract)
    sentences = [p.strip() for p in parts if len(p.strip()) > 18] # Filter out fragments
    
    # Logic: Deduplication to ensure the presentation doesn't repeat information.
    seen = set()
    out = []
    for s in sentences:
        if s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out[:12] # Limit to 12 candidates for the agent to select from

def _score_sentence_for_slide(sentence: str, topic: str, slide_title: str) -> int:
    """
    Heuristic scoring logic to find the most relevant facts for a specific slide heading.
    Why: A 'Lifecycle' slide should prioritize growth facts over 'Origin' facts.
    """
    s = sentence.lower()
    score = 0
    # Logic: Reward sentences that contain keywords found in the slide title.
    for w in set(re.findall(r"[a-z]{4,}", (slide_title or "").lower())):
        if w in s: score += 3 # High reward for thematic match
    
    # Logic: Reward sentences that mention the core subject.
    for w in re.findall(r"[a-z]+", (topic or "").lower()):
        if len(w) >= 4 and w in s: score += 1
    return score

@mcp.tool()
async def search_topic(query: str, slide_title: str = "", supplement: bool = False) -> dict:
    """
    The main tool entry-point for the Agent to conduct external research.
    Why: This provides the 'ground truth' facts required for a 5-star scientific deck.
    """
    # --- STAGE 1: CLEANUP ---
    q = re.sub(r"\d+", "", query).strip() # Remove numbers that agents might add index-wise
    topic_phrase = _primary_topic_for_wikipedia(q)
    wiki_title = topic_phrase.replace(" ", "_")
    topic_display = topic_phrase.strip()

    # --- STAGE 2: PRIMARY FETCH (Wikipedia REST) ---
    # Why: REST API is faster and more reliable for summaries than legacy MediaWiki.
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_title}"
        async with httpx.AsyncClient(headers=_HTTP_HEADERS, timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                extract = (data.get("extract", "") or "").strip()
                thumb = data.get("thumbnail", {}).get("source", "")
                
                # Logic: Build ranked bullets based on slide context.
                points = _bullets_from_wikipedia_extract(extract, topic_display)
                
                # Internal Scoring logic to prioritize the best facts.
                scored = sorted([(_score_sentence_for_slide(p, topic_display, slide_title), p) for p in points], key=lambda x: -x[0])
                final_pts = [p[1] for p in scored]
                
                return {"ok": True, "points": final_pts, "thumbnail": thumb, "source": "wikipedia"}
    except Exception:
        pass

    # --- STAGE 3: FALLBACK (Dictionary API) ---
    # Why: If the topic is extremely niche or misspelled, dictionary definitions act as a 'Safe Hallucination'.
    word = topic_display.lower().split()[0]
    dict_url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{quote(word)}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(dict_url)
            if r.status_code == 200:
                data = r.json()
                raw_pts = [d.get("definition") for m in data[0].get("meanings", []) for d in m.get("definitions", [])]
                # Filter out dictionary fragments and meta-text like "(heading)"
                pts = [p for p in raw_pts if "(heading)" not in p.lower() and len(p) > 25]
                return {"ok": True, "points": pts[:8], "source": "dictionary"}
    except:
        pass

    # --- STAGE 4: GRACEFUL FAILURE ---
    # Why: Never crash the agent; return an empty set so it can try a different research angle.
    return {"ok": True, "points": [], "source": "fallback"}

if __name__ == "__main__":
    # Start the server on Stdio transport for local agent connectivity.
    mcp.run(transport="stdio")
