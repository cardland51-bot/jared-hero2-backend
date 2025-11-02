import express from "express";
import helmet from "helmet";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";

dotenv.config();

// ----- Setup -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));

// ----- Dynamic CORS -----
const allowedOrigins = [
  "https://cardland51-bot.github.io",
  "https://jared-hero2-frontend.onrender.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("🚫 Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ----- Temp upload directory -----
const upload = multer({
  dest: path.join(__dirname, "data", "tmp"),
  limits: { fileSize: 16 * 1024 * 1024 },
});

// ----- Health check -----
app.get("/health", (_req, res) => res.json({ ok: true }));

// ----- Simple GET route to stop 404 -----
app.get("/analyze", (_req, res) => {
  res.json({ status: "✅ Analyze endpoint is alive and waiting for POST uploads" });
});

// ----- Text-based AI Inference -----
app.post("/inference", async (req, res) => {
  try {
    const { text, mode = "customer" } = req.body || {};
    const system =
      mode === "pro"
        ? "You are Jared, a professional estimator for landscaping. Be concise, include line items, costs, and risks."
        : "You are Jared, a friendly estimator for homeowners. Be clear, simple, and helpful.";

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: text || "Say hello" },
        ],
      }),
    });

    const j = await r.json();
    res.json({ content: j?.choices?.[0]?.message?.content || "No response" });
  } catch (e) {
    console.error("❌ Inference error:", e);
    res.status(500).json({ error: "inference_failed" });
  }
});

// ----- Image Analysis -----
app.post("/analyze-image", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "no_file" });

    const mime = file.mimetype || "image/jpeg";
    const b64 = fs.readFileSync(file.path).toString("base64");
    const dataUrl = `data:${mime};base64,${b64}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You analyze landscaping photos for beds, weeds, mulch, edging, materials and produce a brief summary + 3 bullet recommendations.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this photo; be concise and practical." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    const j = await r.json();
    res.json({
      summary: j?.choices?.[0]?.message?.content || "No summary",
      confidence: 0.9,
    });
  } catch (e) {
    console.error("❌ Analyze-image error:", e);
    res.status(500).json({ error: "analyze_failed" });
  }
});

// ----- Text-to-Speech -----
app.post("/speak", async (req, res) => {
  try {
    const { text = "Hello from Jared." } = req.body || {};
    console.log("🎤 TTS request:", text);

    const tts = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        format: "mp3", // ✅ ensure mp3 format
        input: text,
      }),
    });

    if (!tts.ok) {
      const err = await tts.text();
      console.error("❌ TTS API error:", err);
      return res.status(500).json({ error: "tts_failed" });
    }

    // ✅ Stream audio properly
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    console.log("✅ Streaming TTS response...");
    tts.body.pipe(res);
  } catch (e) {
    console.error("❌ Speak error:", e);
    res.status(500).json({ error: "speak_failed" });
  }
});

// ----- Start server -----
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`✅ JARED-HERO2 backend running on :${port}`));
