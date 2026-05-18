// ─────────────────────────────────────────────────────────────────────────────
// SERVIDOR PRINCIPAL — Melodys Farm · Bot Telegram
// Desarrollado por YG Studio
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { handleMessage, handleCallback } = require("./src/handler");
const { setWebhook, getMe } = require("./src/telegram");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── WEBHOOK DE TELEGRAM ──────────────────────────────────────────────────────
// Telegram envía todos los mensajes/callbacks a este endpoint mediante POST

app.post("/webhook", async (req, res) => {
  // Responder 200 inmediatamente para que Telegram no reintente el envío
  res.sendStatus(200);

  const update = req.body;

  try {
    // Mensaje de texto normal
    if (update.message) {
      await handleMessage(update.message);
    }

    // Callback de botón inline (cuando el usuario toca un botón)
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    console.error("[Webhook] Error procesando update:", err.message, "\nUpdate:", JSON.stringify(update, null, 2));
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
// Railway y otros servicios de hosting usan este endpoint para saber si el bot está vivo

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Melodys Farm Bot",
    timestamp: new Date().toISOString(),
  });
});

// ─── PANEL ADMIN ──────────────────────────────────────────────────────────────
// Sirve el panel de administración como archivo estático

const path = require("path");
app.use("/admin", express.static(path.join(__dirname, "admin")));

// ─── INICIO ───────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`\n🌿 Melodys Farm Bot corriendo en puerto ${PORT}`);

  // Verificar que la API Key de Telegram funciona
  const botInfo = await getMe();
  if (botInfo) {
    console.log(`🤖 Bot conectado: @${botInfo.username} (${botInfo.first_name})`);
  } else {
    console.error("❌ Error conectando con Telegram. Verificá el TELEGRAM_TOKEN en el .env");
  }

  // Registrar el webhook automáticamente al iniciar
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
