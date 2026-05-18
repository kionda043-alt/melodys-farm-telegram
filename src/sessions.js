// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE SESIONES
// Cada usuario de Telegram tiene su propia sesión en memoria.
// La sesión guarda el contexto de la conversación: historial, estado del flujo
// de pedido, etc. Se resetea automáticamente después de 30 minutos de inactividad.
// ─────────────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

// Map: telegramId (string) → { history, state, data, lastActivity }
const sessions = new Map();

/**
 * Obtener la sesión de un usuario, creándola si no existe
 * @param {number|string} telegramId
 * @param {string} nombre — nombre del usuario para mensajes
 */
function getOrCreateSession(telegramId, nombre = "socio") {
  const key = String(telegramId);

  if (sessions.has(key)) {
    const session = sessions.get(key);
    session.lastActivity = Date.now();
    return session;
  }

  const session = {
    telegramId: key,
    nombre,
    history: [],       // historial de mensajes para la IA
    state: "idle",     // estado del flujo de pedido
    data: {},          // datos temporales del pedido en curso
    lastActivity: Date.now(),
  };

  sessions.set(key, session);
  return session;
}

/**
 * Agregar un mensaje al historial de la sesión (para contexto de la IA)
 * @param {string} telegramId
 * @param {"user"|"assistant"} role
 * @param {string} content
 */
function addToHistory(telegramId, role, content) {
  const session = sessions.get(String(telegramId));
  if (!session) return;

  session.history.push({ role, content });
  session.lastActivity = Date.now();

  // Mantener solo los últimos 20 mensajes para no exceder el límite de tokens
  if (session.history.length > 20) {
    session.history = session.history.slice(-20);
  }
}

/**
 * Cambiar el estado del flujo de pedido
 * Estados posibles:
 *   "idle"                    — conversación libre
 *   "waiting_genetica"        — esperando que elija una genética
 *   "waiting_gramos"          — esperando la cantidad en gramos
 *   "waiting_confirmacion"    — mostrando resumen, esperando confirmar/cancelar
 *   "waiting_dia_retiro"      — esperando que elija el día de retiro
 */
function setState(telegramId, state) {
  const session = sessions.get(String(telegramId));
  if (session) {
    session.state = state;
    session.lastActivity = Date.now();
  }
}

/**
 * Guardar datos temporales del pedido en curso
 * @param {string} telegramId
 * @param {object} datos — se hace merge con los datos existentes
 */
function setData(telegramId, datos) {
  const session = sessions.get(String(telegramId));
  if (session) {
    session.data = { ...session.data, ...datos };
    session.lastActivity = Date.now();
  }
}

/**
 * Resetear la sesión a estado inicial (mantiene el historial)
 */
function resetState(telegramId) {
  const session = sessions.get(String(telegramId));
  if (session) {
    session.state = "idle";
    session.data = {};
    session.lastActivity = Date.now();
  }
}

/**
 * Borrar completamente la sesión de un usuario
 */
function clearSession(telegramId) {
  sessions.delete(String(telegramId));
}

// ─── LIMPIEZA AUTOMÁTICA ──────────────────────────────────────────────────────
// Cada 10 minutos, borra las sesiones que llevan más de 30 minutos inactivas
// para que no se acumule memoria indefinidamente

setInterval(() => {
  const ahora = Date.now();
  let borradas = 0;

  for (const [key, session] of sessions.entries()) {
    if (ahora - session.lastActivity > TIMEOUT_MS) {
      sessions.delete(key);
      borradas++;
    }
  }

  if (borradas > 0) {
    console.log(`[Sesiones] Se limpiaron ${borradas} sesiones inactivas. Activas: ${sessions.size}`);
  }
}, 10 * 60 * 1000); // cada 10 minutos

module.exports = {
  getOrCreateSession,
  addToHistory,
  setState,
  setData,
  resetState,
  clearSession,
};
