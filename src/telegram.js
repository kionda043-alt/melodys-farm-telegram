// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE TELEGRAM BOT API
// Todas las llamadas a la API de Telegram pasan por acá
// Documentación oficial: https://core.telegram.org/bots/api
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const axios = require("axios");

const TOKEN = process.env.TELEGRAM_TOKEN;
const BASE = `https://api.telegram.org/bot${TOKEN}`;

// Helper interno — hace el request y maneja errores de forma consistente
async function call(method, params = {}) {
  try {
    const { data } = await axios.post(`${BASE}/${method}`, params);
    if (!data.ok) {
      console.error(`[Telegram] Error en ${method}:`, data.description);
      return null;
    }
    return data.result;
  } catch (err) {
    console.error(`[Telegram] Excepción en ${method}:`, err.message);
    return null;
  }
}

// ─── MENSAJES ─────────────────────────────────────────────────────────────────

/**
 * Enviar mensaje de texto simple
 * @param {number|string} chatId
 * @param {string} text — soporta Markdown básico
 * @param {object} extra — opciones adicionales (reply_markup, etc.)
 */
async function sendMessage(chatId, text, extra = {}) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...extra,
  });
}

/**
 * Enviar mensaje con botones inline (filas de botones bajo el mensaje)
 * @param {number|string} chatId
 * @param {string} text
 * @param {Array} buttons — array de arrays: [[{text, callback_data}]]
 */
async function sendButtons(chatId, text, buttons) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

/**
 * Enviar teclado personalizado (aparece como teclado del usuario)
 * @param {number|string} chatId
 * @param {string} text
 * @param {Array} keys — array de arrays de strings: [["Opción A", "Opción B"]]
 * @param {boolean} oneTime — si el teclado desaparece después de usarlo
 */
async function sendKeyboard(chatId, text, keys, oneTime = true) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: keys,
      resize_keyboard: true,
      one_time_keyboard: oneTime,
    },
  });
}

/**
 * Quitar teclado personalizado
 */
async function removeKeyboard(chatId, text) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: { remove_keyboard: true },
  });
}

/**
 * Editar un mensaje ya enviado (para actualizar botones o texto)
 * @param {number|string} chatId
 * @param {number} messageId
 * @param {string} text
 * @param {Array|null} buttons
 */
async function editMessage(chatId, messageId, text, buttons = null) {
  const params = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
  };
  if (buttons) {
    params.reply_markup = { inline_keyboard: buttons };
  }
  return call("editMessageText", params);
}

/**
 * Responder a un callback_query (cuando el usuario toca un botón inline)
 * Hay que responderlo siempre o Telegram muestra un loading spinner infinito
 */
async function answerCallback(callbackQueryId, text = "") {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

/**
 * Indicar al usuario que el bot está "escribiendo..."
 */
async function sendTyping(chatId) {
  return call("sendChatAction", {
    chat_id: chatId,
    action: "typing",
  });
}

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────

/**
 * Registrar la URL del webhook en Telegram
 * Telegram va a mandar todos los mensajes a esa URL mediante POST
 * @param {string} url — la URL pública del servidor (ej: https://tu-app.railway.app/webhook)
 */
async function setWebhook(url) {
  const result = await call("setWebhook", {
    url,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  if (result) {
    console.log("[Telegram] Webhook configurado en:", url);
  }
  return result;
}

/**
 * Ver info del webhook actual (útil para debugging)
 */
async function getWebhookInfo() {
  return call("getWebhookInfo");
}

/**
 * Información del bot (nombre, username, etc.)
 */
async function getMe() {
  return call("getMe");
}

module.exports = {
  sendMessage,
  sendButtons,
  sendKeyboard,
  removeKeyboard,
  editMessage,
  answerCallback,
  sendTyping,
  setWebhook,
  getWebhookInfo,
  getMe,
};
