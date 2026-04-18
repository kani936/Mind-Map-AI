# 🧠 MindMap AI – Smart Notes to Mind Map Generator

> Turn unstructured notes into clear, interactive visual mind maps — powered by Python NLP and D3.js.

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey?logo=flask)
![D3.js](https://img.shields.io/badge/D3.js-v7-orange?logo=d3.js)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📸 Preview

```
┌─────────────────────────────────────────────────────┐
│  🧠 MindMap AI                                       │
│  Turn messy notes into clear, visual mind maps      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Paste your notes...                        │   │
│  │                                             │   │
│  │                          [Generate Mind Map]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  🗺 Machine Learning                        │   │
│  │                                             │   │
│  │       ●─── Supervised ───● Labeled Data     │   │
│  │  ●────●─── Unsupervised ─● Clustering       │   │
│  │       ●─── Reinforcement─● Rewards          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## ✨ Features

- **Instant mind map generation** from any block of text
- **NLP keyword extraction** — no external API or model required
- **Interactive D3.js tree** — horizontal, collapsible hierarchy
- **Expand / Collapse** individual nodes or all at once
- **Loading animation** while processing
- **Error handling** for empty or too-short input
- **Responsive design** — works on desktop and mobile
- **Zero external dependencies** beyond Flask

---

## 🛠 Tech Stack

| Layer      | Technology          |
|------------|---------------------|
| Backend    | Python 3.10+, Flask |
| NLP        | Custom keyword extraction (no spaCy needed) |
| Frontend   | HTML5, CSS3, Vanilla JS |
| Visualization | D3.js v7 (CDN)   |

---

## 📁 Project Structure

```
mindmap-ai/
├── app.py              # Flask app + NLP pipeline
├── requirements.txt    # Python dependencies
├── templates/
│   └── index.html      # Single-page UI
├── static/
│   ├── style.css       # Design system & component styles
│   └── script.js       # D3 rendering + UI logic
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or higher
- pip

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/mindmap-ai.git
cd mindmap-ai

# 2. Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

### Open in browser

```
http://localhost:5000
```

---

## 🔌 API Reference

### `POST /generate`

Converts raw text into a hierarchical mind map JSON.

**Request**

```json
{
  "text": "Machine learning is a subset of AI. It includes supervised learning..."
}
```

**Response `200 OK`**

```json
{
  "name": "Machine Learning",
  "children": [
    {
      "name": "Supervised",
      "children": [
        { "name": "Uses labeled data to train models.", "children": [] }
      ]
    },
    {
      "name": "Unsupervised",
      "children": [
        { "name": "Finds hidden patterns without labels.", "children": [] }
      ]
    }
  ]
}
```

**Error `400 / 422`**

```json
{ "error": "Input text cannot be empty." }
```

---

## 🗺 How It Works

1. User pastes notes into the textarea and clicks **Generate Mind Map**
2. Frontend sends a `POST /generate` request with the raw text
3. Flask backend runs the NLP pipeline:
   - Splits text into sentences
   - Extracts top keywords (stopword-filtered frequency analysis)
   - Infers the main topic from the first line or top keyword
   - Groups sentences under the keyword they mention
4. Returns a nested JSON tree
5. D3.js renders an interactive horizontal tree layout
6. User can expand/collapse nodes and reset

---

## 🔮 Future Improvements

- [ ] Export mind map as PNG / SVG
- [ ] spaCy integration for richer NLP (named entities, noun chunks)
- [ ] Drag-and-drop node editing
- [ ] Save / load mind maps (localStorage or database)
- [ ] Dark mode toggle
- [ ] OpenAI / LLM integration for smarter topic extraction
- [ ] Share mind map via URL

---

## 📄 License

MIT © 2024 — free to use, modify, and distribute.
