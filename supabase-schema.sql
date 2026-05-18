-- ─────────────────────────────────────────────────────────────────────────────
-- ESQUEMA DE BASE DE DATOS — Melodys Farm
-- Copiar y pegar en el SQL Editor de Supabase (supabase.com → SQL Editor)
-- Ejecutar TODO de una vez
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── TABLA: geneticas ────────────────────────────────────────────────────────
-- Almacena las variedades de cannabis disponibles en el club

CREATE TABLE IF NOT EXISTS geneticas (
  id                BIGSERIAL PRIMARY KEY,
  nombre            TEXT NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('sativa', 'indica', 'hibrida')),
  descripcion       TEXT,
  thc               DECIMAL(5,2),       -- porcentaje, ej: 22.5
  cbd               DECIMAL(5,2),       -- porcentaje, ej: 0.3
  terpenos          TEXT,               -- descripción libre, ej: "limoneno, mirceno"
  precio_por_gramo  DECIMAL(10,2) NOT NULL,
  disponible        BOOLEAN NOT NULL DEFAULT true,
  foto_url          TEXT,               -- URL opcional de imagen
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios para claridad
COMMENT ON TABLE geneticas IS 'Variedades de cannabis del club';
COMMENT ON COLUMN geneticas.disponible IS 'false = oculta del bot (sin stock)';


-- ─── TABLA: pedidos ──────────────────────────────────────────────────────────
-- Registra cada pedido que hace un socio a través del bot

CREATE TABLE IF NOT EXISTS pedidos (
  id              BIGSERIAL PRIMARY KEY,
  telegram_id     TEXT NOT NULL,        -- ID de Telegram del socio
  nombre_socio    TEXT NOT NULL,
  genetica_id     BIGINT REFERENCES geneticas(id),
  gramos          DECIMAL(6,2) NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  dia_retiro      TEXT NOT NULL,        -- "Martes", "Jueves" o "Sábado"
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'confirmado', 'entregado', 'cancelado')),
  notas           TEXT,                 -- notas internas del admin
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pedidos IS 'Pedidos realizados por socios vía el bot de Telegram';
COMMENT ON COLUMN pedidos.estado IS 'pendiente → confirmado → entregado (o cancelado)';


-- ─── TABLA: promociones ──────────────────────────────────────────────────────
-- Promociones y descuentos que el admin puede activar/desactivar

CREATE TABLE IF NOT EXISTS promociones (
  id          BIGSERIAL PRIMARY KEY,
  titulo      TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE promociones IS 'Promociones activas que se muestran en el bot';


-- ─── TABLA: socios ────────────────────────────────────────────────────────────
-- Registro de socios que interactuaron con el bot

CREATE TABLE IF NOT EXISTS socios (
  id              BIGSERIAL PRIMARY KEY,
  telegram_id     TEXT UNIQUE NOT NULL,
  nombre          TEXT,
  username        TEXT,                 -- @username de Telegram (puede ser null)
  ultimo_contacto TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE socios IS 'Socios registrados que usaron el bot';


-- ─── ÍNDICES ──────────────────────────────────────────────────────────────────
-- Para que las consultas frecuentes sean más rápidas

CREATE INDEX IF NOT EXISTS idx_pedidos_estado       ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_telegram_id  ON pedidos(telegram_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at   ON pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_socios_telegram_id   ON socios(telegram_id);
CREATE INDEX IF NOT EXISTS idx_geneticas_disponible ON geneticas(disponible);


-- ─── SEGURIDAD (Row Level Security) ──────────────────────────────────────────
-- El bot usa la SERVICE KEY que bypasea RLS.
-- El panel admin también usa SERVICE KEY.
-- RLS está desactivado intencionalmente para simplificar.
-- Si en el futuro se expone una API pública, revisar esto.

ALTER TABLE geneticas   DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE promociones DISABLE ROW LEVEL SECURITY;
ALTER TABLE socios      DISABLE ROW LEVEL SECURITY;


-- ─── DATOS DE EJEMPLO ────────────────────────────────────────────────────────
-- Genéticas de muestra para empezar. Editalas desde el panel admin.

INSERT INTO geneticas (nombre, tipo, descripcion, thc, cbd, terpenos, precio_por_gramo, disponible)
VALUES
  (
    'Purple Punch',
    'indica',
    'Sabor dulce a uva con efecto relajante. Ideal para la noche.',
    22.0, 0.3,
    'Limoneno, Mirceno, Cariofileno',
    1800.00,
    true
  ),
  (
    'Blue Dream',
    'hibrida',
    'Equilibrada y versátil. Efecto creativo sin aletargar.',
    20.5, 0.5,
    'Mirceno, Pineno, Cariofileno',
    2000.00,
    true
  ),
  (
    'Gorilla Glue #4',
    'hibrida',
    'Alta potencia. Relajación profunda, aroma a tierra y chocolate.',
    27.0, 0.2,
    'Cariofileno, Limoneno, Mirceno',
    2200.00,
    true
  ),
  (
    'OG Kush',
    'indica',
    'Clásica. Aroma a pino y tierra, efecto potente y duradero.',
    24.5, 0.4,
    'Mirceno, Limoneno, Cariofileno',
    2100.00,
    false  -- sin stock por ahora
  );


-- ─── PROMOCIÓN DE EJEMPLO ────────────────────────────────────────────────────

INSERT INTO promociones (titulo, descripcion, activa)
VALUES (
  'Descuento de bienvenida',
  '10% off en tu primer pedido del mes. Mencionalo al retirar.',
  true
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ¡Listo! Ejecutá este script completo en el SQL Editor de Supabase.
-- Después configurá las variables SUPABASE_URL y SUPABASE_SERVICE_KEY en Railway.
-- ─────────────────────────────────────────────────────────────────────────────
