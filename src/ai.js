// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE IA — Groq (llama-3.3-70b-versatile)
// Groq es gratuito y muy rápido. Este archivo genera las respuestas
// conversacionales del bot usando el historial de la sesión.
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── PROMPT DE SISTEMA ────────────────────────────────────────────────────────
// Este es el "cerebro" del bot: define su personalidad, conocimiento y límites.
// Se manda en cada llamada a Groq para que siempre tenga contexto.

function buildSystemPrompt(geneticasDisponibles = []) {
  const stockTexto = geneticasDisponibles.length > 0
    ? geneticasDisponibles.map(g =>
        `- *${g.nombre}* (${g.tipo}) — $${g.precio_por_gramo}/gr | THC: ${g.thc}% | CBD: ${g.cbd}% | ${g.descripcion || ""}${g.terpenos ? " | Terpenos: " + g.terpenos : ""}`
      ).join("\n")
    : "No hay stock disponible en este momento.";

  return `Sos el asistente virtual de *Melodys Farm*, un cannabis club argentino.
Tu nombre es *Melody* y hablás en español rioplatense informal pero respetuoso (usando "vos", "acá", "dale", etc.).
Sos cálido, directo y conocés todo sobre las genéticas del club.

═══ STOCK ACTUAL ═══
${stockTexto}

═══ INFO DEL CLUB ═══
- Los pedidos se retiran en el local del club (el admin te confirma el domicilio)
- Los días de retiro disponibles son: martes, jueves y sábado
- El pago es en efectivo en el momento del retiro
- Para ser socio se paga una cuota mensual (consultá con el admin)
- No hacemos envíos a domicilio — solo retiro en el local

═══ TU ROL ═══
- Respondés consultas sobre genéticas: tipo (sativa/indica/híbrida), THC, CBD, terpenos, efecto, sabor
- Ayudás al socio a hacer un pedido (lo guiás paso a paso)
- Informás sobre promociones cuando las hay
- Si no sabés algo, decís que lo consultes con el admin

═══ REGLAS ═══
- NUNCA inventés precios, stock o información que no tenés
- Si el stock está vacío o la genética no está disponible, avisalo claramente
- No hablés de ilegalidades ni de distribución fuera del club
- No des información de contacto personal del dueño, solo decí "hablá con el admin"
- Sé conciso: los mensajes de Telegram tienen que ser cortos y fáciles de leer
- Usá emojis con moderación (1-2 por mensaje máximo) para que sea amigable pero no infantil`;
}

// ─── GENERAR RESPUESTA ────────────────────────────────────────────────────────

/**
 * Genera una respuesta de la IA usando el historial de la sesión
 * @param {Array} history — array de {role, content}
 * @param {Array} geneticasDisponibles — para que la IA sepa el stock actual
 * @returns {string} — texto de respuesta
 */
async function generarRespuesta(history, geneticasDisponibles = []) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: buildSystemPrompt(geneticasDisponibles) },
        ...history,
      ],
      max_tokens: 400,       // respuestas cortas para Telegram
      temperature: 0.7,      // algo de variedad pero sin inventar
    });

    return completion.choices[0]?.message?.content?.trim() || "No pude generar una respuesta, intentá de nuevo.";
  } catch (err) {
    console.error("[Groq] Error al generar respuesta:", err.message);
    return "Tuve un problema técnico, intentá de nuevo en un momento 🔧";
  }
}

// ─── DETECTAR INTENCIÓN ───────────────────────────────────────────────────────
// Detección rápida con regex — así no gastamos tokens de Groq para cosas simples

const INTENCIONES = {
  saludo: /^(hola|buenas|hey|buenas tardes|buenas noches|buen dia|buenos dias|hi|hello)\b/i,
  stock: /\b(stock|disponible|tienen|hay|que tienen|que hay|variedades|geneticas|genetica)\b/i,
  pedido: /\b(quiero|pedir|pedido|comprar|me das|dame|necesito|reservar)\b/i,
  precio: /\b(precio|cuanto sale|cuanto cuesta|cuanto es|cuanto cobra|vale)\b/i,
  info: /\b(thc|cbd|terpenos|efecto|sativa|indica|hibrida|sabor|aroma|potencia)\b/i,
  cancelar: /\b(cancelar|cancel|no quiero|olvidate|dejalo|no gracias|salir)\b/i,
  promos: /\b(promo|promocion|descuento|oferta|especial)\b/i,
  ayuda: /\b(ayuda|help|que podes|como funciona|opciones|menu)\b/i,
};

/**
 * Detecta la intención del mensaje con regex (sin gastar tokens de Groq)
 * @param {string} texto
 * @returns {string} — nombre de la intención o "otro"
 */
function detectarIntencion(texto) {
  const t = texto.toLowerCase().trim();
  for (const [intencion, regex] of Object.entries(INTENCIONES)) {
    if (regex.test(t)) return intencion;
  }
  return "otro";
}

module.exports = {
  generarRespuesta,
  detectarIntencion,
};
