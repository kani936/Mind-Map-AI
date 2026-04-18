"""
MindMap AI - Flask Backend
Converts unstructured text into a structured mind map JSON.
"""

from flask import Flask, request, jsonify, render_template
import re
from collections import Counter

app = Flask(__name__)

# ── Stopwords ─────────────────────────────────────────────────────────────────
STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "dare",
    "ought", "used", "it", "its", "this", "that", "these", "those", "i",
    "we", "you", "he", "she", "they", "me", "us", "him", "her", "them",
    "my", "our", "your", "his", "their", "what", "which", "who", "whom",
    "when", "where", "why", "how", "all", "each", "every", "both", "few",
    "more", "most", "other", "some", "such", "no", "not", "only", "same",
    "so", "than", "too", "very", "just", "also", "as", "if", "then",
    "because", "while", "although", "though", "since", "until", "unless",
    "about", "above", "after", "before", "between", "into", "through",
    "during", "including", "without", "across", "behind", "beyond",
    "plus", "except", "up", "out", "around", "down", "off", "over",
    "under", "again", "further", "once", "here", "there", "any", "s",
    "use", "uses", "using", "used", "include", "includes", "including",
    "make", "makes", "making", "made", "like", "get", "gets", "getting",
    "one", "two", "three", "new", "also", "well", "way", "ways",
}


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return text


def extract_sentences(text: str) -> list:
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 10]


def extract_keywords(text: str, top_n: int = 12) -> list:
    """Extract top N keywords by frequency, excluding stopwords."""
    words = clean_text(text).split()
    filtered = [w for w in words if w not in STOPWORDS and len(w) > 3]
    freq = Counter(filtered)
    return [word for word, _ in freq.most_common(top_n)]


def infer_main_topic(text: str, keywords: list) -> str:
    """
    Infer main topic:
    1. First line if it looks like a heading (short, no trailing period).
    2. Otherwise use the most frequent keyword.
    """
    first_line = text.strip().split("\n")[0].strip()
    word_count = len(first_line.split())
    if 1 <= word_count <= 6 and not first_line.endswith(".") and not first_line.endswith("?"):
        return first_line.title()
    return keywords[0].title() if keywords else "Main Topic"


def group_into_subtopics(sentences: list, keywords: list, main_topic: str) -> dict:
    """
    Build subtopics by clustering sentences around unique keywords.
    Strategy:
      - Score each sentence against every keyword.
      - Pick the keyword with the highest unique score for each sentence.
      - Merge very small groups into neighbours.
    """
    # Exclude words that appear in the main topic to avoid duplication
    main_words = set(clean_text(main_topic).split())
    subtopic_keys = [kw for kw in keywords if kw not in main_words]

    if not subtopic_keys:
        subtopic_keys = keywords[:]

    # Score matrix: sentence → {kw: score}
    def score(sentence, kw):
        return sentence.lower().count(kw)

    groups = {kw: [] for kw in subtopic_keys}

    for sentence in sentences:
        scores = {kw: score(sentence, kw) for kw in subtopic_keys}
        best_kw = max(scores, key=lambda k: scores[k])
        if scores[best_kw] > 0:
            groups[best_kw].append(sentence)
        else:
            # No keyword match — assign to the group with fewest sentences (balance)
            least = min(groups, key=lambda k: len(groups[k]))
            groups[least].append(sentence)

    # Remove empty groups
    groups = {k: v for k, v in groups.items() if v}

    if not groups:
        groups["General"] = sentences

    return groups


def build_mindmap(text: str) -> dict:
    sentences  = extract_sentences(text)
    keywords   = extract_keywords(text, top_n=12)

    if not keywords:
        return {"error": "Could not extract meaningful keywords from the text."}

    main_topic = infer_main_topic(text, keywords)
    groups     = group_into_subtopics(sentences, keywords, main_topic)

    children = []
    for kw, sents in groups.items():
        leaves = [
            {"name": s[:90] + ("…" if len(s) > 90 else ""), "children": []}
            for s in sents[:4]
        ]
        children.append({"name": kw.title(), "children": leaves})

    # Keep 3–6 subtopics for a clean visual
    children = children[:6]

    return {"name": main_topic, "children": children}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(silent=True)

    if not data or not data.get("text", "").strip():
        return jsonify({"error": "Input text cannot be empty."}), 400

    text = data["text"].strip()

    if len(text) < 20:
        return jsonify({"error": "Please provide more detailed notes (at least 20 characters)."}), 400

    mindmap = build_mindmap(text)

    if "error" in mindmap:
        return jsonify(mindmap), 422

    return jsonify(mindmap), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
