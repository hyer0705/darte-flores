<div align="center">

# 🌸 Darte Flores (다르테 플로레스)
**Interactive 3D Bespoke Bouquet Configurator & AI Florist Communication Guide**  
*“To give you flowers” — Bridging the gap between a gift-giver's imagination and a local florist's craft.*

`Google Gemini (@google/genai)` · `React 19` · `TypeScript` · `Three.js (WebGL)` · `Tailwind CSS`

</div>

---

## 🔗 Hackathon Submission Links

- **Public GitHub Repository:** [https://github.com/hyer0705/darte-flores](https://github.com/hyer0705/darte-flores)
- **Demo Video:** `[TODO: Insert YouTube or Google Drive Demo Video Link Here]`
- **Live AI Studio App:** [https://ai.studio/apps/3564b7cb-29d4-495e-ab10-6fdfa1434c15](https://ai.studio/apps/3564b7cb-29d4-495e-ab10-6fdfa1434c15)

---

## 📝 Project Description

**Darte Flores** (*Spanish for "To give you flowers"*) is an AI-powered **3D custom flower bouquet maker and florist order sheet generator** that transforms how people design and order meaningful floral gifts.

When celebrating milestones such as graduations, Parents' Day, bridal showers, recitals, or birthdays, people carefully search for a **main flower** based on its **flower meaning (*floriography*)**. However, visualizing how secondary flowers, filler blooms, greenery, and wrapping paper will harmonize in 3D volume is difficult for non-experts. As a result, customers often tell local florists, *"Please just make it look nice,"* leading to mismatched expectations—especially when specific seasonal flowers are out of stock at the flower shop.

**Darte Flores** solves this visual and communication gap through a 5-step interactive workflow combining **Google Gemini Multimodal AI**, **procedural 3D WebGL (`Three.js`)**, and **AI image generation**:
1. **Context & Multimodal Mood Analysis:** Analyzes the occasion, budget, and an optional reference photo (e.g., the recipient's outfit, bridal shower dress, or recital poster) to extract a 4-color hex palette, mood keywords, and recommend main flowers centered on **flower meanings**.
2. **3D Spiral Hand-Tied Bouquet Variations:** Generates 3 distinct 3D bouquet styles (*Romantic Pastel*, *Modern Vivid*, *Natural French Garden*) arranged procedurally using real florist **Spiral Hand-tied** and **Golden Angle ($\approx 137.5^\circ$)** geometry.
3. **Two-Way Interactive 3D Customization:** Lets users swap secondary/filler flowers, adjust stem counts (`+ / -`), and customize wrapping paper and ribbon colors in a 360° 3D viewer while tracking real-time Korean retail flower pricing.
4. **3D-to-Photorealistic Studio Rendering:** Converts the customized 3D bouquet snapshot and botanical recipe into an 8K photorealistic florist lookbook preview.
5. **Actionable Florist Order Sheet:** Generates a printable and copyable one-page specification sheet for local florists—complete with visual references, exact stem counts, estimated pricing, a floriography message card, and **AI-curated alternative flower suggestions** in case specific blooms are out of stock.

---

## 🎯 Target Users & Problem Statement

### 1. Primary Target: Thoughtful Flower Gift-Givers (B2C Consumers)
- **Who they are:** Individuals preparing custom bouquets for meaningful occasions (graduations, Parents' Day, bridal showers, concerts/recitals, anniversaries) who care about **flower meanings (*floriography*)** and visual harmony with the recipient's style, but lack professional floral design knowledge.
- **Pain Points:**
  - Hard to imagine 3D volume and color harmony between main flowers, sub/filler blooms, and wrapping paper from flat 2D catalog photos.
  - Uncertainty about how many stems fit within their target budget (`30,000 KRW` – `150,000 KRW`) when including standard florist wrapping fees.
  - Anxiety about how to explain their desired vibe to a local florist when ordering via chat or in person.

### 2. Secondary Target: Local Boutique Florists (B2B2C Partners)
- **Who they are:** Independent neighborhood flower shop owners and florists who handle custom pre-orders.
- **Pain Points:**
  - Customers frequently make vague requests (*"Make it pretty within 50,000 KRW"*) or bring unrealistic Pinterest photos that do not match their budget or seasonal inventory.
  - Time-consuming back-and-forth communication when a requested flower is out of stock.
- **How Darte Flores Helps:** Provides a structured **Florist Order Sheet** that clearly states the customer's priority (overall color mood and silhouette) along with **2–3 pre-approved substitute flowers (`alternatives`)** for every main and secondary slot.

---

## 🤖 How We Solved It with Google Gemini Models

All AI capabilities are built with the official **`@google/genai` SDK** and orchestrated through a three-stage multimodal and generative pipeline:

| Stage | Model Used | Capabilities Leveraged | How It Solves the Problem |
| :--- | :--- | :--- | :--- |
| **1. Occasion & Mood Analysis** | **`gemini-3.8-flash`** | • Multimodal Vision + Text Input<br>• Image Relevance Guardrail<br>• Structured Outputs (`responseSchema`) | • Extracts 4 dominant Hex colors and mood keywords from an uploaded reference photo (outfit, venue, poster).<br>• **Multimodal Validation (`isImageRelevant`):** Detects irrelevant uploads (e.g., receipts, code screenshots, blank screens) and gracefully falls back to occasion-based recommendations with a friendly notice.<br>• Recommends 4 main flower candidates with Korean/English names, **flower meanings**, realistic Korean retail stem prices, 3D procedural shape mappings (`shapeType`), and out-of-stock substitutes. |
| **2. 3D Bouquet Recipe Generation** | **`gemini-3.8-flash`** | • Domain-Constrained Reasoning<br>• Strict JSON Schema (`responseSchema`) | • Designs 3 distinct bouquet styles (*Pastel*, *Vivid*, *Natural Garden*) around the chosen main flower.<br>• Enforces professional florist **Mass (45%) : Sub (25%) : Filler (18%) : Greenery (12%)** proportions within the user's net budget (automatically factoring in the `7,000 KRW` standard wrapping fee).<br>• Generates a pool of 6 interactive `swapCandidates` and 2–3 `alternatives` per slot so users can freely customize their 3D bouquet. |
| **3. 3D-to-Photorealistic Rendering** | **`gemini-3.1-flash-lite-image`** | • Image-to-Image + Text Conditioning<br>• `aspectRatio: '4:3'` Studio Config | • Takes a live **PNG snapshot captured directly from the `Three.js` 3D WebGL canvas** (`snapshotBase64`) alongside a detailed botanical prompt (exact flower species, stem counts, hex colors, wrapping paper, and satin ribbon color).<br>• Transforms the procedural 3D composition into an ultra-realistic studio florist photograph while preserving the user's exact color harmony and arrangement structure. |

> **💡 Reliability & Graceful Degradation:** If network connectivity is limited or an API call times out, Darte Flores automatically falls back to client-side canvas color/variance analysis, rich occasion presets, and an automated **Atelier Studio Lookbook Composite Renderer** built from the 3D WebGL snapshot so the user flow is never interrupted.

---

## ✨ Key Features

- **🌸 Floriography-First Main Flower Discovery (Step 1 & 2):**
  - Select from 7 popular Korean gift-giving occasions or enter a custom occasion, set a budget slider (`30,000`–`150,000 KRW`), and optionally upload a mood reference photo.
  - Compare 4 AI-recommended main flowers with highlighted **Flower Meaning badges**, stem prices, and recommendation rationales.
- **💐 Procedural 3D Spiral Hand-Tied Bouquet Engine (Step 3 & 4):**
  - Built with `Three.js`, rendering 7 distinct procedural botanical geometries (`peony`, `rose`, `tulip`, `freesia`, `daisy`, `babysbreath`, `eucalyptus`) plus a dual-layer wrapping paper cone and satin ribbon bow.
  - Uses the botanical **Golden Angle ($\approx 137.5^\circ$)** and **Mass–Filler–Line** hierarchy where all stems converge toward a realistic internal binding point.
- **🔄 Two-Way Hybrid 2D/3D Synchronization (Step 4):**
  - **3D → 2D:** Hovering over any flower in the 3D canvas highlights its entire slot group with an emissive glow and displays a floating `[Flower Name · Flower Meaning]` badge; clicking it selects and scrolls to the corresponding slot in the left 2D control panel.
  - **2D → 3D:** Hovering or selecting a slot card in the 2D panel highlights those exact blooms in the 3D scene.
  - Real-time stem count adjustments (`- / +`), slot swapping, wrapping/ribbon color pickers, and a **non-blocking budget warning gauge** (including the standard `7,000 KRW` florist wrapping fee).
- **📸 On-Demand Photorealistic Preview & Version History (Step 5):**
  - Prevents unnecessary API calls via dirty-state detection when 3D edits occur, and stores generated previews in a visual **Version History** strip so users can compare and restore previous bouquet designs with a single click.
- **📋 Printable & Copyable Florist Order Sheet (`FloristGuideModal`):**
  - Combines the 3D snapshot, AI photorealistic render, extracted hex palette chips, itemized stem recipe table, **Florist Request Note**, **Main & Sub Alternative Flowers** for out-of-stock situations, and a Floriography Gift Card.
  - One-click **Print / Save as PDF (`window.print`)** and **Copy Text for KakaoTalk / SMS Inquiry**.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **3D Graphics Engine:** Three.js (`WebGLRenderer` with `preserveDrawingBuffer`, `OrbitControls`, Raycasting, Procedural Botanical Geometries)
- **Backend / API Server:** Node.js, Express, `tsx`
- **AI SDK & Models:** `@google/genai` SDK (`gemini-3.8-flash`, `gemini-3.1-flash-lite-image`)

```text
darte-flores/
├── server.ts                      # Express API server & @google/genai model endpoints
├── src/
│   ├── types.ts                   # Strict TypeScript interfaces & shared constants
│   ├── App.tsx                    # 5-step workflow state, localStorage history, 2D/3D sync
│   ├── components/
│   │   ├── BouquetCanvas3D.tsx    # Three.js spiral hand-tied 3D bouquet renderer & raycaster
│   │   └── FloristGuideModal.tsx  # Printable/copyable florist specification sheet modal
│   └── services/
│       └── geminiService.ts       # API client, multimodal validation & fallback presets
└── package.json
```

---

## 🚀 Getting Started (Run Locally)

### Prerequisites
- **Node.js** (v18+ recommended)
- A **Google Gemini API Key**

### Installation & Execution

1. **Clone the repository and navigate to the project directory:**
   ```bash
   git clone https://github.com/hyer0705/darte-flores.git
   cd darte-flores
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root of `darte-flores/` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server (runs both Express API and Vite frontend on port 3000):**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
