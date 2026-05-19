import { supabase } from "@/app/lib/supabase";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  console.log("API received body:", JSON.stringify(body, null, 2));
  
  // Mantenemos la lectura del body y supabase por si en el futuro se quiere reactivar fácilmente
  // const { messages } = body;

  /*
  // ==========================================
  // LLAMADA REAL COMENTADA PARA EVITAR CONSUMO DE TOKENS EN LA VERSIÓN DE DEMOSTRACIÓN
  // ==========================================
  import { openai } from "@ai-sdk/openai";
  import { streamText, convertToModelMessages } from "ai";

  // Obtener el contexto actual de la base de datos de Supabase
  const { data: restaurants, error } = await supabase
    .from("restaurantes")
    .select("nombre, resumen_ia, categoría, horarios, direccion, localidad");

  let contextString = "No hay datos de restaurantes disponibles en este momento.";
  
  if (!error && restaurants && restaurants.length > 0) {
    contextString = (restaurants as any[]).map((r) => 
      `Restaurante: ${r.nombre}
Categoría (Especialidad): ${r.categoría}
Descripción: ${r.resumen_ia}
Horarios: ${r.horarios ? r.horarios.join(", ") : "No especificado"}
Ubicación: ${r.direccion}, ${r.localidad}`
    ).join("\n\n");
  }

  const systemPrompt = `Eres Kia, una IA experta gastronómica y asistente virtual exclusiva de la plataforma "Gastro Tucumán".
Tu objetivo es ayudar a los usuarios a descubrir restaurantes, entender sus especialidades, horarios y detalles basándote ÚNICA y EXCLUSIVAMENTE en la siguiente base de datos de restaurantes.

Reglas:
1. NUNCA inventes información. Si te preguntan por un restaurante, comida o detalle que no está en la base de datos proporcionada a continuación, responde amablemente que no tienes información al respecto.
2. Si te preguntan sobre tu identidad, responde que eres Kia, la experta gastronómica de Gastro Tucumán.
3. Mantén un tono amigable, entusiasta y útil.
4. Puedes sugerir y recomendar restaurantes que encajen con lo que el usuario busca (ej: "¿Dónde puedo comer pizzas?").
5. Responde de forma concisa pero con estilo. No generes respuestas excesivamente largas.

Base de datos de restaurantes activos (Gastro Tucumán):
--------------------------------------------------
${contextString}
--------------------------------------------------`;

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
  // ==========================================
  */

  // RESPUESTA MOCK (SIMULADA) PARA LA VERSIÓN DE DEMOSTRACIÓN
  const mockText = "🤖 El agente ha sido desactivado.";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // AI SDK v6 UIMessageStream protocol:
      // 2: start message event
      controller.enqueue(encoder.encode(`2:[{"messageId":"mock-1","role":"assistant"}]\n`));
      // 0: text delta
      controller.enqueue(encoder.encode(`0:${JSON.stringify(mockText)}\n`));
      // d: finish with usage
      controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}
