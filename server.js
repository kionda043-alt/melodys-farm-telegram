// ─────────────────────────────────────────────────────────────────────────────
// SERVIDOR PRINCIPAL — Melodys Farm · Bot Telegram
// Desarrollado por YG Studio
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { handleMessage, handleCallback } = require("./src/handler");
const { setWebhook, getMe, sendMessage } = require("./src/telegram");
const db = require("./src/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── WEBHOOK DE TELEGRAM ──────────────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const update = req.body;

  try {
    if (update.message) {
      await handleMessage(update.message);
    }
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    console.error("[Webhook] Error procesando update:", err.message, "\nUpdate:", JSON.stringify(update, null, 2));
  }
});

// ─── API: CONFIRMAR ENVÍO (llamado desde el panel admin) ──────────────────────
// El admin ingresa día y horario → se guarda en DB y se notifica al socio por Telegram

app.post("/api/confirmar-envio", async (req, res) => {
  try {
    const { pedido_id, dia_envio, horario_envio } = req.body;

    if (!pedido_id || !dia_envio || !horario_envio) {
      return res.status(400).json({ error: "Faltan datos: pedido_id, dia_envio, horario_envio" });
    }

    // Obtener el pedido para conocer el telegram_id del socio
    const pedido = await db.getPedidoById(pedido_id);
    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // Guardar día y horario, cambiar estado a "confirmado"
    await db.confirmarEnvio(pedido_id, dia_envio, horario_envio);

    // Armar resumen de ítems para el mensaje
    let itemsText = "";
    if (pedido.items && Array.isArray(pedido.items)) {
      itemsText = pedido.items.map(item =>
        `• ${item.nombre} — ${item.gramos}g`
      ).join("\n");
    }

    // Notificar al socio por Telegram
    await sendMessage(pedido.telegram_id,
      `📦 *¡Tu pedido está confirmado!*\n\n` +
      `${itemsText}\n\n` +
      `📅 Día de entrega: *${dia_envio}*\n` +
      `🕐 Horario: *${horario_envio}*\n\n` +
      `¡Nos vemos pronto! 🌿`
    );

    console.log(`[API] Envío confirmado — Pedido #${pedido_id} → ${dia_envio} ${horario_envio}`);
    res.json({ ok: true });

  } catch (err) {
    console.error("[API] Error confirmando envío:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Melodys Farm Bot",
    timestamp: new Date().toISOString(),
  });
});

// ─── PANEL ADMIN ──────────────────────────────────────────────────────────────

const path = require("path");
app.use("/admin", express.static(path.join(__dirname, "admin")));

// ─── INICIO ───────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`\n🌿 Melodys Farm Bot corriendo en puerto ${PORT}`);

  const botInfo = await getMe();
  if (botInfo) {
    console.log(`🤖 Bot conectado: @${botInfo.username} (${botInfo.first_name})`);
  } else {
    console.error("❌ Error conectando con Telegram. Verificá el TELEGRAM_TOKEN en el .env");
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    await setWebhook(`${webhookUrl}/webhook`);
  } else {
    console.warn("⚠️  WEBHOOK_URL no está configurada. El bot no va a recibir mensajes.");
    console.warn("   Configurá WEBHOOK_URL en las variables de entorno de Railway.");
  }

  console.log(`\n📊 Panel admin disponible en: ${webhookUrl || "http://localhost:" + PORT}/admin`);
  console.log(`💚 Health check en: ${webhookUrl || "http://localhost:" + PORT}/health\n`);
});
