// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL — Lógica de conversación del bot
// Acá se procesan todos los mensajes y callbacks que llegan de Telegram.
//
// FLUJO DE PEDIDO:
//   idle → waiting_genetica → waiting_gramos → waiting_confirmacion
//        → waiting_dia_retiro → (pedido guardado en Supabase) → idle
// ─────────────────────────────────────────────────────────────────────────────

const tg = require("./telegram");
const { generarRespuesta, detectarIntencion } = require("./ai");
const {
  getOrCreateSession, addToHistory, setState,
  setData, resetState,
} = require("./sessions");
const db = require("./db");

// Días de retiro disponibles
const DIAS_RETIRO = ["Martes", "Jueves", "Sábado"];

// Mensaje estándar para usuarios no autorizados
const MSG_NO_AUTORIZADO =
  "⛔ No estás autorizado para usar este bot.\n\n" +
  "Si sos socio de Melodys Farm, contactá al admin para que te habilite el acceso.";

// ─── MENSAJES DE TEXTO ────────────────────────────────────────────────────────

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const texto = msg.text?.trim() || "";
  const nombre = msg.from?.first_name || "socio";
  const username = msg.from?.username || null;
  const telegramId = msg.from?.id;

  // Registrar/actualizar socio en la base de datos
  await db.registrarSocio(telegramId, nombre, username).catch(() => {});

  // ─── CHEQUEO DE AUTORIZACIÓN ─────────────────────────────────────────────────
  // /start es el único comando que funciona sin autorización (para que el admin
  // pueda ver el Telegram ID del socio y autorizarlo desde el panel)
  const esStart = texto === "/start";
  if (!esStart) {
    const autorizado = await db.esSocioAutorizado(telegramId).catch(() => false);
    if (!autorizado) {
      return tg.sendMessage(chatId, MSG_NO_AUTORIZADO);
    }
  }

  // Obtener o crear sesión
  const session = getOrCreateSession(telegramId, nombre);

  // ─── COMANDOS ────────────────────────────────────────────────────────────────
  if (texto.startsWith("/")) {
    return handleComando(chatId, texto, telegramId, nombre, session);
  }

  // ─── FLUJO DE PEDIDO (estados intermedios) ───────────────────────────────────
  if (session.state === "waiting_gramos") {
    return handleGramos(chatId, texto, telegramId, session);
  }

  // ─── CONVERSACIÓN LIBRE CON IA ───────────────────────────────────────────────
  const intencion = detectarIntencion(texto);

  if (intencion === "cancelar" && session.state !== "idle") {
    resetState(telegramId);
    return tg.sendMessage(chatId, "Perfecto, pedido cancelado ✋ ¿En qué más te puedo ayudar?");
  }

  if (intencion === "pedido" || intencion === "stock") {
    return iniciarFluijoPedido(chatId, telegramId);
  }

  if (intencion === "saludo") {
    return tg.sendButtons(chatId,
      `¡Hola ${nombre}! 🌿 Bienvenido a *Melodys Farm*.\n¿En qué te puedo ayudar hoy?`,
      [
        [{ text: "📦 Ver stock", callback_data: "ver_stock" }],
        [{ text: "🛒 Hacer un pedido", callback_data: "iniciar_pedido" }],
        [{ text: "🎁 Promociones", callback_data: "ver_promos" }],
      ]
    );
  }

  if (intencion === "promos") {
    return mostrarPromociones(chatId);
  }

  if (intencion === "ayuda") {
    return mostrarMenu(chatId, nombre);
  }

  // Para todo lo demás, la IA genera una respuesta contextual
  await tg.sendTyping(chatId);
  const geneticas = await db.getGeneticasDisponibles().catch(() => []);
  addToHistory(telegramId, "user", texto);
  const respuesta = await generarRespuesta(session.history, geneticas);
  addToHistory(telegramId, "assistant", respuesta);
  return tg.sendMessage(chatId, respuesta);
}

// ─── CALLBACKS DE BOTONES INLINE ─────────────────────────────────────────────

async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const telegramId = query.from.id;
  const nombre = query.from?.first_name || "socio";

  // Siempre responder el callback para quitar el loading de Telegram
  await tg.answerCallback(query.id);

  // Chequeo de autorización para callbacks también
  const autorizado = await db.esSocioAutorizado(telegramId).catch(() => false);
  if (!autorizado) {
    return tg.sendMessage(chatId, MSG_NO_AUTORIZADO);
  }

  const session = getOrCreateSession(telegramId, nombre);

  // ─── Menú principal
  if (data === "ver_stock") return mostrarStock(chatId);
  if (data === "iniciar_pedido") return iniciarFluijoPedido(chatId, telegramId);
  if (data === "ver_promos") return mostrarPromociones(chatId);
  if (data === "cancelar_pedido") {
    resetState(telegramId);
    return tg.editMessage(chatId, messageId, "Pedido cancelado ✋ Cuando quieras podés hacer uno nuevo.");
  }

  // ─── Selección de genética
  if (data.startsWith("genetica_")) {
    const geneticaId = parseInt(data.replace("genetica_", ""));
    return handleSeleccionGenetica(chatId, telegramId, geneticaId, messageId);
  }

  // ─── Selección de día de retiro
  if (data.startsWith("dia_")) {
    const dia = data.replace("dia_", "");
    return handleSeleccionDia(chatId, telegramId, dia, messageId);
  }

  // ─── Confirmar pedido
  if (data === "confirmar_pedido") {
    return confirmarPedido(chatId, telegramId, messageId);
  }
}

// ─── COMANDOS DE TELEGRAM ─────────────────────────────────────────────────────

async function handleComando(chatId, texto, telegramId, nombre, session) {
  const comando = texto.split(" ")[0].toLowerCase();

  switch (comando) {
    case "/start": {
      const autorizado = await db.esSocioAutorizado(telegramId).catch(() => false);
      if (!autorizado) {
        return tg.sendMessage(chatId,
          `¡Hola ${nombre}! 🌿 Bienvenido a *Melodys Farm*.\n\n` +
          `⛔ Tu acceso todavía no está habilitado.\n\n` +
          `Enviá este número a tu admin para que te active:\n` +
          `\`${telegramId}\`\n\n` +
          `Una vez que te habiliten, escribí /start de nuevo.`
        );
      }
      return tg.sendButtons(chatId,
        `¡Hola ${nombre}! 🌿 Soy *Melody*, el asistente de *Melodys Farm*.\n\nPuedo ayudarte a ver el stock disponible, contarte sobre nuestras genéticas y tomar tu pedido. ¿Qué querés hacer?`,
        [
          [{ text: "📦 Ver stock", callback_data: "ver_stock" }],
          [{ text: "🛒 Hacer un pedido", callback_data: "iniciar_pedido" }],
          [{ text: "🎁 Promociones", callback_data: "ver_promos" }],
        ]
      );
    }

    case "/menu":
      return mostrarMenu(chatId, nombre);

    case "/stock":
      return mostrarStock(chatId);

    case "/pedido":
      return iniciarFluijoPedido(chatId, telegramId);

    case "/promos":
      return mostrarPromociones(chatId);

    case "/cancelar":
      if (session.state !== "idle") {
        resetState(telegramId);
        return tg.sendMessage(chatId, "Pedido cancelado ✋");
      }
      return tg.sendMessage(chatId, "No hay ningún pedido en curso.");

    default:
      return tg.sendMessage(chatId, "No conozco ese comando. Escribí /menu para ver las opciones.");
  }
}

// ─── FUNCIONES DE FLUJO ───────────────────────────────────────────────────────

async function mostrarMenu(chatId, nombre) {
  return tg.sendButtons(chatId,
    `*Menú de ${nombre}*\n\n¿Qué querés hacer?`,
    [
      [{ text: "📦 Ver stock disponible", callback_data: "ver_stock" }],
      [{ text: "🛒 Hacer un pedido", callback_data: "iniciar_pedido" }],
      [{ text: "🎁 Ver promociones", callback_data: "ver_promos" }],
    ]
  );
}

async function mostrarStock(chatId) {
  const geneticas = await db.getGeneticasDisponibles().catch(() => []);

  if (geneticas.length === 0) {
    return tg.sendMessage(chatId, "😔 No hay stock disponible en este momento. Consultá más tarde o hablá con el admin.");
  }

  const lineas = geneticas.map(g => {
    let texto = `🌿 *${g.nombre}* (${g.tipo})\n`;
    texto += `   💰 $${g.precio_por_gramo}/gr`;
    if (g.thc) texto += ` | THC: ${g.thc}%`;
    if (g.cbd) texto += ` | CBD: ${g.cbd}%`;
    if (g.descripcion) texto += `\n   ${g.descripcion}`;
    return texto;
  });

  return tg.sendButtons(chatId,
    `*Stock disponible* 📦\n\n${lineas.join("\n\n")}`,
    [[{ text: "🛒 Hacer un pedido", callback_data: "iniciar_pedido" }]]
  );
}

async function mostrarPromociones(chatId) {
  const promos = await db.getPromocionesActivas().catch(() => []);

  if (promos.length === 0) {
    return tg.sendMessage(chatId, "No hay promociones activas por ahora. ¡Seguí atento!");
  }

  const lineas = promos.map(p => `🎁 *${p.titulo}*\n   ${p.descripcion}`);
  return tg.sendMessage(chatId, `*Promociones activas*\n\n${lineas.join("\n\n")}`);
}

async function iniciarFluijoPedido(chatId, telegramId) {
  const geneticas = await db.getGeneticasDisponibles().catch(() => []);

  if (geneticas.length === 0) {
    return tg.sendMessage(chatId, "😔 No hay stock disponible en este momento. Consultá más tarde.");
  }

  // Crear botones con cada genética disponible
  const botones = geneticas.map(g => ([
    {
      text: `${g.nombre} — $${g.precio_por_gramo}/gr`,
      callback_data: `genetica_${g.id}`,
    }
  ]));
  botones.push([{ text: "❌ Cancelar", callback_data: "cancelar_pedido" }]);

  setState(telegramId, "waiting_genetica");

  return tg.sendButtons(chatId,
    "🛒 *Nuevo pedido*\n\n¿Qué genética querés pedir?",
    botones
  );
}

async function handleSeleccionGenetica(chatId, telegramId, geneticaId, messageId) {
  const genetica = await db.getGeneticaById(geneticaId).catch(() => null);

  if (!genetica || !genetica.disponible) {
    return tg.sendMessage(chatId, "Esa genética ya no está disponible. Hacé /stock para ver el stock actual.");
  }

  // Guardar la genética seleccionada en la sesión
  setData(telegramId, { genetica });
  setState(telegramId, "waiting_gramos");

  await tg.editMessage(chatId, messageId,
    `Elegiste *${genetica.nombre}*\n💰 $${genetica.precio_por_gramo} por gramo\n\n¿Cuántos gramos querés pedir? (Escribí solo el número, ej: 3)`
  );
}

async function handleGramos(chatId, texto, telegramId, session) {
  const gramos = parseFloat(texto.replace(",", "."));

  if (isNaN(gramos) || gramos <= 0) {
    return tg.sendMessage(chatId, "Escribí la cantidad en números, por ejemplo: *3* o *0.5*");
  }

  if (gramos > 50) {
    return tg.sendMessage(chatId, "La cantidad máxima por pedido es 50g. Escribí una cantidad menor.");
  }

  const { genetica } = session.data;
  const total = (gramos * genetica.precio_por_gramo).toFixed(2);

  setData(telegramId, { gramos, total: parseFloat(total) });
  setState(telegramId, "waiting_confirmacion");

  return tg.sendButtons(chatId,
    `📋 *Resumen del pedido*\n\n` +
    `🌿 Genética: *${genetica.nombre}*\n` +
    `⚖️ Cantidad: *${gramos}g*\n` +
    `💰 Total: *$${total}*\n\n` +
    `¿Confirmás el pedido?`,
    [
      [
        { text: "✅ Confirmar", callback_data: "confirmar_pedido" },
        { text: "❌ Cancelar", callback_data: "cancelar_pedido" },
      ]
    ]
  );
}

async function confirmarPedido(chatId, telegramId, messageId) {
  const session = getOrCreateSession(telegramId);
  const { genetica, gramos, total } = session.data;

  setState(telegramId, "waiting_dia_retiro");

  const botonesDias = DIAS_RETIRO.map(dia => ([
    { text: dia, callback_data: `dia_${dia}` }
  ]));
  botonesDias.push([{ text: "❌ Cancelar", callback_data: "cancelar_pedido" }]);

  await tg.editMessage(chatId, messageId,
    `✅ Pedido registrado!\n\n` +
    `*${genetica.nombre}* — ${gramos}g — $${total}\n\n` +
    `¿Qué día preferís retirar?`
  );

  return tg.sendButtons(chatId, "Elegí el día de retiro:", botonesDias);
}

async function handleSeleccionDia(chatId, telegramId, dia, messageId) {
  const session = getOrCreateSession(telegramId);
  const { genetica, gramos, total } = session.data;

  if (!DIAS_RETIRO.includes(dia)) {
    return tg.sendMessage(chatId, "Día no válido. Elegí entre: Martes, Jueves o Sábado.");
  }

  // Guardar el pedido en Supabase
  const pedidoDatos = {
    telegram_id: String(telegramId),
    nombre_socio: session.nombre,
    genetica_id: genetica.id,
    gramos: parseFloat(gramos),
    total: parseFloat(total),
    dia_retiro: dia,
    estado: "pendiente",
  };

  const pedido = await db.crearPedido(pedidoDatos).catch(err => {
    console.error("[Handler] Error creando pedido:", err);
    return null;
  });

  if (!pedido) {
    resetState(telegramId);
    return tg.sendMessage(chatId, "Hubo un error guardando el pedido 😔 Escribí /pedido para intentar de nuevo.");
  }

  // Pedido exitoso — resetear estado
  resetState(telegramId);

  return tg.editMessage(chatId, messageId,
    `🎉 *¡Pedido confirmado!*\n\n` +
    `🌿 ${genetica.nombre} — ${gramos}g\n` +
    `💰 Total a pagar: *$${total}*\n` +
    `📅 Día de retiro: *${dia}*\n\n` +
    `El admin del club te va a confirmar el horario exacto. ¡Gracias! 🙏`
  );
}

module.exports = { handleMessage, handleCallback };
