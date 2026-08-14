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

  // API Endpoint for AI Smart Navigation Co-pilot (OpenStreetMap + Gemini)
  app.post("/api/smart-route-ai", async (req, res) => {
    try {
      const { userQuery, originQuery, originLat, originLng, currentLat, currentLng, carConfig } = req.body;
      if (!userQuery) {
        return res.status(400).json({ error: "Prompt de destino ou comando não fornecido." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Chave GEMINI_API_KEY não configurada no servidor.",
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

      const fuelTypeLabel = carConfig?.currentFuel === 'ethanol' ? 'Etanol' : 'Gasolina';
      const avgKmPerL = carConfig?.currentFuel === 'ethanol' ? (carConfig?.avgConsumptionEthanol || 8.9) : (carConfig?.avgConsumptionGasoline || 12.6);
      const fuelLiters = ((carConfig?.tankCapacity || 50) * (carConfig?.fuelLevel || 43)) / 100;
      const startLat = originLat || currentLat || -22.9194;
      const startLng = originLng || currentLng || -42.8186;

      const systemPrompt = `Você é o Copiloto de Navegação Inteligente e Otimizador de Rotas Econômicas (Eco-Route) do Renault Clio 1.0 16V Hi-Flex integrado ao OpenStreetMap (estilo Google Maps com foco em economia de combustível).
Ponto de Partida/Origem: ${originQuery || `Coordenadas atuais (Lat: ${startLat}, Lng: ${startLng} - Região de Maricá / RJ)`}.
Destino Solicitado pelo motorista: "${userQuery}".
Veículo atual: Renault Clio (Tanque: ${carConfig?.tankCapacity || 50}L, Nível: ${carConfig?.fuelLevel?.toFixed(1) || 43}% = ~${fuelLiters.toFixed(1)} Litros de ${fuelTypeLabel}, Consumo médio: ${avgKmPerL} km/L).

Sua tarefa:
1. Identificar o local de destino e suas coordenadas precisas (latitude e longitude) para traçado rodoviário no OpenStreetMap.
2. Se uma origem textual foi especificada (diferente da localização atual), identificar também as coordenadas da origem (originLatitude, originLongitude).
3. Identificar a rota mais econômica (Eco-Route) considerando velocidade ideal (60-80 km/h) e menor consumo de combustível versus rota mais rápida.
4. Fornecer dica prática de economia de combustível para o Renault Clio 1.0 (ex: manter marchas adequadas, evitar arrancadas, velocidade econômica na RJ-106 / vias expressas).
5. Calcular a estimativa de consumo de combustível para a viagem de ida (em Litros de ${fuelTypeLabel}) e se o tanque atual (${fuelLiters.toFixed(1)}L) é suficiente.
6. Redigir uma mensagem curta, amigável e direta de copiloto para o motorista em Português.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            text: systemPrompt,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              destinationName: {
                type: Type.STRING,
                description: "Nome de exibição amigável do destino",
              },
              searchQuery: {
                type: Type.STRING,
                description: "Termo de busca limpo para OpenStreetMap Nominatim",
              },
              latitude: {
                type: Type.NUMBER,
                description: "Latitude aproximada do destino",
              },
              longitude: {
                type: Type.NUMBER,
                description: "Longitude aproximada do destino",
              },
              originName: {
                type: Type.STRING,
                description: "Nome amigável da origem identificada",
              },
              originLatitude: {
                type: Type.NUMBER,
                description: "Latitude da origem (se informada)",
              },
              originLongitude: {
                type: Type.NUMBER,
                description: "Longitude da origem (se informada)",
              },
              estimatedDistanceKm: {
                type: Type.NUMBER,
                description: "Distância aproximada em quilômetros",
              },
              litersNeeded: {
                type: Type.NUMBER,
                description: "Litros de combustível necessários",
              },
              fuelSufficiencyMessage: {
                type: Type.STRING,
                description: "Status do tanque para esta viagem",
              },
              ecoTip: {
                type: Type.STRING,
                description: "Dica ecológica para menor consumo no Clio 1.0 nesta rota",
              },
              copilotMessage: {
                type: Type.STRING,
                description: "Mensagem falada/exibida pelo copiloto de IA",
              },
              category: {
                type: Type.STRING,
                description: "Categoria: posto, mercado, praia, cidade, restaurante, servico, etc",
              },
            },
            required: [
              "destinationName",
              "searchQuery",
              "latitude",
              "longitude",
              "estimatedDistanceKm",
              "litersNeeded",
              "fuelSufficiencyMessage",
              "copilotMessage",
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Resposta vazia da IA.");
      }

      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (err: any) {
      console.error("Erro no copiloto de navegação IA:", err);
      return res.status(500).json({
        error: err?.message || "Não foi possível processar a rota com a IA.",
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
