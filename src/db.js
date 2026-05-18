// ─────────────────────────────────────────────────────────────────────────────
// BASE DE DATOS — Supabase
// Todas las operaciones de lectura y escritura pasan por acá
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

// ─── GENÉTICAS ────────────────────────────────────────────────────────────────

async function getGeneticasDisponibles() {
  const { data, error } = await supabase
    .from("geneticas")
    .select("*")
    .eq("disponible", true)
    .order("nombre");
  if (error) throw error;
  return data;
}

async function getTodasGeneticas() {
  const { data, error } = await supabase
    .from("geneticas")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return data;
}

async function getGeneticaById(id) {
  const { data, error } = await supabase
    .from("geneticas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function buscarGenetica(nombre) {
  const { data, error } = await supabase
    .from("geneticas")
    .select("*")
    .ilike("nombre", `%${nombre}%`)
    .eq("disponible", true);
  if (error) throw error;
  return data?.[0] || null;
}

async function crearGenetica(datos) {
  const { data, error } = await supabase
    .from("geneticas")
    .insert([datos])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function actualizarGenetica(id, datos) {
  const { data, error } = await supabase
    .from("geneticas")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function toggleDisponibilidad(id, disponible) {
  return actualizarGenetica(id, { disponible });
}

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────

async function crearPedido(datos) {
  const { data, error } = await supabase
    .from("pedidos")
    .insert([datos])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getPedidosPendientes() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, geneticas(nombre)")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function getPedidosHoy() {
  const hoy = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .gte("created_at", hoy)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function actualizarEstadoPedido(id, estado) {
  const { data, error } = await supabase
    .from("pedidos")
    .update({ estado })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── PROMOCIONES ──────────────────────────────────────────────────────────────

async function getPromocionesActivas() {
  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("activa", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function crearPromocion(datos) {
  const { data, error } = await supabase
    .from("promociones")
    .insert([datos])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function togglePromocion(id, activa) {
  const { data, error } = await supabase
    .from("promociones")
    .update({ activa })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── SOCIOS ───────────────────────────────────────────────────────────────────

async function registrarSocio(telegramId, nombre, username) {
  // Al registrar, NO pisamos el campo "autorizado" si el socio ya existe
  const key = String(telegramId);

  // Verificar si ya existe
  const { data: existente } = await supabase
    .from("socios")
    .select("id, autorizado")
    .eq("telegram_id", key)
    .single();

  if (existente) {
    // Ya existe — solo actualizar último contacto y nombre
    const { data, error } = await supabase
      .from("socios")
      .update({ nombre, username, ultimo_contacto: new Date().toISOString() })
      .eq("telegram_id", key)
      .select()
      .single();
    if (error) console.error("Error actualizando socio:", error);
    return data;
  } else {
    // Nuevo socio — insertar con autorizado = false
    const { data, error } = await supabase
      .from("socios")
      .insert([{ telegram_id: key, nombre, username, autorizado: false, ultimo_contacto: new Date().toISOString() }])
      .select()
      .single();
    if (error) console.error("Error registrando socio:", error);
    return data;
  }
}

async function esSocioAutorizado(telegramId) {
  const { data, error } = await supabase
    .from("socios")
    .select("autorizado")
    .eq("telegram_id", String(telegramId))
    .single();
  if (error || !data) return false;
  return data.autorizado === true;
}

async function toggleAutorizacion(telegramId, autorizado) {
  const { data, error } = await supabase
    .from("socios")
    .update({ autorizado })
    .eq("telegram_id", String(telegramId))
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  getGeneticasDisponibles,
  getTodasGeneticas,
  getGeneticaById,
  buscarGenetica,
  crearGenetica,
  actualizarGenetica,
  toggleDisponibilidad,
  crearPedido,
  getPedidosPendientes,
  getPedidosHoy,
  actualizarEstadoPedido,
  getPromocionesActivas,
  crearPromocion,
  togglePromocion,
  registrarSocio,
  esSocioAutorizado,
  toggleAutorizacion,
};
