
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFinances = async (transactions: Transaction[]) => {
  const prompt = `Analise os seguintes dados financeiros da empresa VX Virtual e forneça insights estratégicos em português.
  Considere saúde financeira, tendências de gastos e sugestões de otimização.
  Dados: ${JSON.stringify(transactions)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é um CFO experiente especializado em startups e empresas virtuais. Sua análise deve ser direta, profissional e focada em crescimento sustentável.",
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Erro ao analisar finanças:", error);
    return "Desculpe, não foi possível gerar a análise no momento.";
  }
};
