import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Endpoint to estimate fuel level from an uploaded dashboard photo
  app.post("/api/estimate-fuel", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Imagem não enviada." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Chave GEMINI_API_KEY não encontrada no ambiente do servidor.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Strip base64 header prefix if included
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/jpeg",
            },
          },
          {
            text: "Examine a foto do painel de instrumentos do veículo/marcador de combustível (ex: Renault Clio, Fiat, VW, etc). Identifique a posição exata do ponteiro (0% = totalmente vazio/reserva R, 25% = 1/4 ou 2º traço acima do R, 50% = 1/2, 75% = 3/4, 100% = 1/1 cheio). No Renault Clio, o 2º traço/marcação acima do R com quadradinho vermelho corresponde a aproximadamente 23.5% a 25% do tanque (~11.8 a 12.5 litros num tanque de 50L). Estime a porcentagem exata do combustível (0 a 100) e forneça uma descrição em português do marcador observado.",
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fuelPercentage: {
                type: Type.NUMBER,
                description:
                  "Porcentagem estimada de combustível no tanque de 0 a 100",
              },
              readingDescription: {
                type: Type.STRING,
                description:
                  "Descrição sucinta da posição do ponteiro no marcador (ex: Ponteiro apontando levemente acima de 1/2 tanque)",
              },
            },
            required: ["fuelPercentage", "readingDescription"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Resposta em branco do serviço de IA.");
      }

      const parsed = JSON.parse(responseText);
      const fuelPercentage = Math.min(
        100,
        Math.max(0, Number(parsed.fuelPercentage) || 0)
      );

      return res.json({
        fuelPercentage,
        readingDescription:
          parsed.readingDescription || "Marcador de combustível analisado.",
      });
    } catch (err: any) {
      console.error("Erro na leitura da imagem com Gemini:", err);
      return res.status(500).json({
        error:
          err?.message ||
          "Não foi possível analisar a foto do marcador de combustível.",
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

startServer();
