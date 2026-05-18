# 🌿 Melodys Farm — Sistema de Bot Telegram
**Guía de instalación completa · Desarrollado por YG Studio**

---

## ¿Qué vas a instalar?

Al terminar esta guía vas a tener:
- **Un bot de Telegram** que atiende a los socios del club 24/7
- **Una base de datos** con todo el stock, pedidos y socios
- **Un panel de administración web** para gestionar todo sin saber programar

---

## Lo que necesitás conseguir (son 4 servicios, todos gratuitos)

| Servicio | Para qué sirve | Costo |
|---|---|---|
| **BotFather** (Telegram) | Crear el bot | Gratis |
| **Supabase** | Base de datos | Gratis |
| **Railway** | Servidor donde corre el bot | Gratis |
| **GitHub** | Guardar el código | Gratis |

---

---

# PASO 1 — Crear el bot en Telegram (BotFather)

BotFather es el bot oficial de Telegram para crear otros bots. Funciona con comandos de texto.

### 1. Abrí Telegram (en el celu o en telegram.org en la PC)

### 2. Buscá "BotFather"
En el buscador de Telegram escribí `@BotFather` y abrí el chat oficial (tiene un tilde azul de verificado).

### 3. Empezá con /newbot
Escribí `/newbot` y mandalo. BotFather te va a preguntar:

**a) Nombre del bot** (el que ven los usuarios):
```
Melodys Farm
```

**b) Username del bot** (tiene que terminar en "bot", sin espacios):
```
MelodysFarmBot
```
*(si ese nombre ya existe, probá con MelodysFarm_Bot o MelodysFarmClub_Bot)*

### 4. Guardá el token
BotFather te responde algo así:
```
Done! Congratulations on your new bot. You will find it at t.me/MelodysFarmBot.
Use this token to access the HTTP API:
7123456789:AAGabc123def456ghi789jkl...
```

Copiá ese token y guardalo en el Bloc de Notas:
```
=== CLAVES MELODYS FARM ===

TELEGRAM_TOKEN: 7123456789:AAGabc123def456...
```

---

---

# PASO 2 — Crear la base de datos en Supabase

Supabase es como un Excel en la nube pero mucho más potente. Acá guardamos el stock, los pedidos y los socios.

### 1. Crear cuenta
Andá a: **https://supabase.com**
Hacé clic en **"Start your project"** → login con GitHub (recomendado) o con email.

### 2. Crear un proyecto nuevo
- Hacé clic en **"New project"**
- Nombre del proyecto: `melodys-farm`
- Database Password: creá una contraseña segura y guardala (la necesitás más adelante)
- Region: elegí **South America (São Paulo)** para menor latencia desde Argentina
- Hacé clic en **"Create new project"**

Supabase tarda 1-2 minutos en crear el proyecto.

### 3. Crear las tablas (copiar y pegar el SQL)

Una vez que el proyecto esté listo:
- En el menú de la izquierda, hacé clic en **"SQL Editor"** (ícono de pantalla con código)
- Hacé clic en **"New query"**
- Abrí el archivo `supabase-schema.sql` de este proyecto
- Copiá **todo** el contenido del archivo
- Pegalo en el editor de Supabase
- Hacé clic en **"Run"** (botón verde abajo a la derecha)

Si todo salió bien, vas a ver un mensaje de éxito y las tablas aparecen en **"Table editor"** del menú izquierdo.

### 4. Obtener las credenciales de Supabase

En el menú izquierdo, hacé clic en el ícono de engranaje ⚙️ → **"API"**.

Vas a ver:
- **Project URL**: algo como `https://abcdefgh.supabase.co` → copialo
- **anon public key**: una clave larga → copiala
- **service_role key**: otra clave larga (hacé clic en "Reveal") → copiala

Agregá al Bloc de Notas:
```
SUPABASE_URL: https://abcdefgh.supabase.co
SUPABASE_KEY: eyJhbGci... (la anon key)
SUPABASE_SERVICE_KEY: eyJhbGci... (la service_role key)
```

> ⚠️ La service_role key tiene acceso total a la base de datos. No la compartas.

---

---

# PASO 3 — Subir el código a GitHub

GitHub guarda el código del bot. Railway lo lee desde ahí.

### 1. Crear cuenta en GitHub
Andá a: **https://github.com**
Hacé clic en **"Sign up"** → usá el mismo email que en Supabase.

### 2. Crear un repositorio
- Una vez adentro, hacé clic en el botón verde **"New"**
- Nombre del repositorio: `melodys-farm-telegram`
- Dejalo en **Public**
- **No** actives ninguna de las opciones de README, .gitignore ni licencia
- Hacé clic en **"Create repository"**

### 3. Subir los archivos
En la página del repositorio recién creado, vas a ver un link que dice **"uploading an existing file"**. Hacé clic ahí.

Arrastrá estos archivos y carpetas desde tu computadora (están en la carpeta `melodys-telegram`):
```
📁 src/
📁 admin/
server.js
package.json
supabase-schema.sql
.env.example
```

> ⚠️ **NO subas** el archivo `.env` (si lo creaste) — tiene tus claves secretas.

Abajo de la página, en el campo "Commit changes", escribí: `Sistema bot Melodys Farm`
Hacé clic en **"Commit changes"**.

---

---

# PASO 4 — Deployar en Railway (el servidor)

Railway es la computadora en la nube que mantiene el bot funcionando 24/7.

### 1. Crear cuenta
Andá a: **https://railway.app**
Hacé clic en **"Login"** → elegí **"Login with GitHub"** para usar la misma cuenta.

### 2. Crear nuevo proyecto
- Hacé clic en **"New Project"**
- Elegí **"Deploy from GitHub repo"**
- Buscá y seleccioná `melodys-farm-telegram`
- Railway empieza a preparar el deploy (tarda 2-3 minutos)

### 3. Agregar las variables de entorno

Este es el paso más importante. Las claves que guardaste en el Bloc de Notas van acá.

- En Railway, hacé clic en el proyecto → luego en el servicio que creó automáticamente
- Hacé clic en la pestaña **"Variables"**
- Hacé clic en **"New Variable"** y agregá estas (una por una):

| Variable | Valor |
|---|---|
| `TELEGRAM_TOKEN` | El token del BotFather |
| `GROQ_API_KEY` | Tu API Key de Groq |
| `SUPABASE_URL` | El URL de Supabase |
| `SUPABASE_KEY` | La anon key de Supabase |
| `SUPABASE_SERVICE_KEY` | La service_role key de Supabase |
| `ADMIN_PASSWORD` | La contraseña que quieras para el panel |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

Después de agregar todas, Railway hace el redeploy automáticamente.

### 4. Obtener la URL del servidor

Una vez que el deploy termina, Railway te muestra la URL del servicio. Se ve así:
```
https://melodys-farm-telegram-production.up.railway.app
```

Para verla: en Railway → tu servicio → pestaña **"Settings"** → sección "Domains" → "Generate Domain".

Guardala en el Bloc de Notas:
```
WEBHOOK_URL: https://melodys-farm-telegram-production.up.railway.app
```

### 5. Agregar la variable WEBHOOK_URL

Volvé a la pestaña **Variables** de Railway y agregá:

| Variable | Valor |
|---|---|
| `WEBHOOK_URL` | La URL que obtuviste recién |

Railway hace otro redeploy automático. Esta vez, al iniciar, el bot registra el webhook con Telegram automáticamente.

---

---

# PASO 5 — Verificar que todo funciona

### 1. Verificar el bot en Telegram
Buscá tu bot en Telegram por el username que elegiste (ej: `@MelodysFarmBot`) y mandá `/start`.

El bot debería responder con un menú de bienvenida.

### 2. Verificar el panel admin
Abrí en el navegador:
```
https://tu-url-de-railway.up.railway.app/admin
```

Vas a ver una pantalla de login. Ingresá la contraseña que configuraste en `ADMIN_PASSWORD`.

### 3. Verificar los logs en Railway
Si algo no funciona, podés ver los errores en Railway:
- En tu proyecto → tu servicio → pestaña **"Logs"**
- Los errores aparecen en rojo con un mensaje descriptivo

---

---

# PASO 6 — Configurar el panel admin

Antes de que los socios empiecen a usar el bot, configurá las genéticas:

### En el panel admin → sección "Genéticas":
- Revisá las genéticas que se cargaron de ejemplo
- Editá los nombres, precios, THC, CBD y descripciones con los datos reales del club
- Desactivá (toggle) las genéticas que no tenés en stock
- Agregá las genéticas que falten con el botón "+ Nueva genética"

### En el panel admin → sección "Promociones":
- Las promociones activas aparecen en el bot cuando el socio escribe `/promos`
- Podés activarlas o desactivarlas en cualquier momento

---

---

# RESUMEN — El orden completo

```
1. BotFather → crear bot → guardar TELEGRAM_TOKEN
2. Supabase → crear proyecto → ejecutar SQL → guardar URL y keys
3. GitHub → crear repo → subir archivos del código
4. Railway → conectar GitHub → agregar variables → obtener URL
5. Railway → agregar WEBHOOK_URL → esperar redeploy
6. Telegram → buscar el bot → mandar /start → verificar que responde
7. Panel admin → abrir /admin → configurar genéticas reales
```

---

# Problemas frecuentes

**El bot no responde:**
- Verificar que `WEBHOOK_URL` esté bien configurada en Railway (sin barra al final)
- En Railway → Logs, buscar mensajes de error al iniciar
- Verificar que el `TELEGRAM_TOKEN` esté copiado completo

**El panel admin no muestra datos:**
- Verificar que el SQL se ejecutó correctamente en Supabase
- En el archivo `admin/index.html`, las líneas con `SUPABASE_URL` y `SUPABASE_KEY` tienen que tener tus datos reales (esto se hace una sola vez cuando lo configurás)

**Error "relation does not exist":**
- El SQL no se ejecutó. Ir a Supabase → SQL Editor → pegar y correr el script `supabase-schema.sql`

**Bot responde lento:**
- Normal los primeros días en el plan gratuito de Railway (puede "dormirse" si no hay actividad)
- Para que no se duerma: en Railway → tu servicio → Settings → activar "Always On" (requiere plan pago, USD 5/mes)

---

*Sistema desarrollado por **YG Studio** · hola@ygstudio.ar*
