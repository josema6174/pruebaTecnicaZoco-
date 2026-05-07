"""
scraper.py — Consulta la Places API (New) de Google mediante Text Search,
             enriquece los datos con Google Gemini (IA) e inserta los
             resultados en una tabla de Supabase.

Pipeline:
    1. Extraer restaurantes de Google Places (Text Search).
    2. Para cada restaurante, enviar nombre + dirección + reseñas a Gemini
       para obtener: localidad real, categoría y resumen IA.
    3. Persistir los datos enriquecidos en Supabase (upsert).

Uso:
    python scraper.py
"""

from __future__ import annotations

import json
import os
import sys
import time

from openai import OpenAI
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Configuración ────────────────────────────────────────────────────────────

# Cargamos las variables de entorno desde el archivo apis.env del proyecto.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, "apis.env")
load_dotenv(env_path, override=True)

# Google Places API
API_KEY: str | None = os.getenv("GOOGLE_PLACES_API_KEY")

# Supabase
SUPABASE_URL: str | None = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str | None = os.getenv("SUPABASE_KEY")

# OpenAI
OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")

# Endpoint de Text Search (Places API New).
TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

# Campos que solicitamos a la API para optimizar la respuesta.
FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.rating",
        "places.userRatingCount",
        "places.regularOpeningHours",
        "places.reviews",
        "places.photos",
    ]
)

# Máximo de resultados por localidad (20 × 10 localidades = 200 restaurantes).
MAX_RESULTS = 20

# Nombre de la tabla en Supabase.
TABLE_NAME = "restaurantes"


# ── Funciones: Google Places ─────────────────────────────────────────────────


def get_places(query: str) -> list[dict]:
    """Realiza una búsqueda textual en Google Places y devuelve los resultados.

    Args:
        query: Texto de búsqueda (p.ej. "los mejores restaurantes en Tafí Viejo, Tucumán").

    Returns:
        Lista de diccionarios con los campos esenciales de cada lugar.

    Raises:
        SystemExit: Si la API Key no está configurada.
        requests.exceptions.RequestException: Si ocurre un error de red.
        requests.exceptions.HTTPError: Si la API responde con un código 4xx/5xx.
    """
    if not API_KEY:
        sys.exit(
            "[ERROR] La variable GOOGLE_PLACES_API_KEY no está definida en el archivo .env."
        )

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }

    body = {
        "textQuery": query,
        "languageCode": "es",
    }

    try:
        response = requests.post(TEXT_SEARCH_URL, headers=headers, json=body, timeout=10)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        sys.exit("[ERROR] La solicitud excedió el tiempo de espera (timeout).")
    except requests.exceptions.ConnectionError:
        sys.exit("[ERROR] No se pudo conectar con la API de Google Places. Verificá tu conexión a internet.")
    except requests.exceptions.HTTPError as http_err:
        sys.exit(f"[ERROR] La API respondió con un error HTTP {response.status_code}: {http_err}")
    except requests.exceptions.RequestException as req_err:
        sys.exit(f"[ERROR] Ocurrió un error inesperado en la solicitud: {req_err}")

    data = response.json()
    places_raw = data.get("places", [])

    # Mapeamos cada resultado a un diccionario plano con los campos esenciales.
    results: list[dict] = []
    for place in places_raw[:MAX_RESULTS]:
        # Horarios.
        opening_hours = place.get("regularOpeningHours", {})
        horarios = opening_hours.get("weekdayDescriptions", [])

        # Reseñas: lista de diccionarios (máximo 5)
        reviews_raw = place.get("reviews", [])[:5]
        reseñas = [
            {
                "autor": rev.get("authorAttribution", {}).get("displayName", "Anónimo"),
                "texto": rev.get("originalText", {}).get("text", ""),
                "rating": rev.get("rating"),
            }
            for rev in reviews_raw
            if rev.get("originalText", {}).get("text")
        ]

        # Foto: extraemos el nombre de la primera foto y construimos la URL
        photos = place.get("photos", [])
        foto_url = ""
        if photos:
            photo_name = photos[0].get("name")
            if photo_name:
                foto_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=400&maxWidthPx=400&key={API_KEY}"

        results.append(
            {
                "id": place.get("id"),
                "nombre": place.get("displayName", {}).get("text"),
                "direccion": place.get("formattedAddress"),
                "calificacion": place.get("rating"),
                "cantidad_resenas": place.get("userRatingCount"),
                "horarios": horarios,
                "foto_url": foto_url,
                "reseñas": reseñas,
            }
        )

    return results


# ── Funciones: OpenAI (IA) ───────────────────────────────────────────────────


def enrich_batch_with_openai(places_data: list[dict], localidad_original: str) -> dict:
    """Envía la lista completa de restaurantes de una localidad a OpenAI.

    Para evitar exceder el límite de tokens (lo que causa JSONs cortados),
    solo envía los campos esenciales a la IA y pide que devuelva únicamente
    el ID y los campos calculados. Luego hace el merge localmente.
    """
    if not OPENAI_API_KEY:
        print("  [WARN] OPENAI_API_KEY no configurada. Usando valores por defecto.")
        for p in places_data:
            p["localidad_real"] = localidad_original
            p["categoria"] = "Sin categoría"
            p["resumen_ia"] = "Sin resumen"
        return {"restaurantes_limpios": places_data}

    system_msg = (
        "Eres un analista QA de datos. Recibes un JSON con una lista de restaurantes "
        "extraídos de Google Maps.\n"
        "1. Identifica duplicados semánticos (mismo lugar, variaciones de nombre/dirección).\n"
        "2. A los registros únicos, asígnales: 'localidad_real', 'categoria' "
        "(una sola palabra), y 'resumen_ia' (máx 15 palabras).\n"
        "Devuelve un JSON estrictamente con este formato:\n"
        "{\n"
        '  "analisis": [\n'
        "    {\n"
        '      "id": "el_id_original",\n'
        '      "es_duplicado": false,\n'
        '      "localidad_real": "Ciudad",\n'
        '      "categoria": "Categoría",\n'
        '      "resumen_ia": "Resumen breve..."\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    # Enviamos una versión reducida para no gastar tantos tokens
    slim_data = []
    for p in places_data:
        slim_data.append({
            "id": p["id"],
            "nombre": p["nombre"],
            "direccion": p["direccion"],
            "resenas": [r["texto"] for r in p.get("reseñas", [])[:3]]
        })

    user_msg = json.dumps(slim_data, ensure_ascii=False)

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        result = json.loads(response.choices[0].message.content)
        analisis = result.get("analisis", [])
        
        # Mapeamos los resultados por ID
        ai_map = {item["id"]: item for item in analisis if "id" in item}
        
        restaurantes_limpios = []
        for p in places_data:
            pid = p.get("id")
            ai_data = ai_map.get(pid, {})
            
            # Si la IA dice que es duplicado, lo saltamos
            if ai_data.get("es_duplicado", False):
                continue
                
            p["localidad_real"] = ai_data.get("localidad_real", localidad_original)
            p["categoria"] = ai_data.get("categoria", "Sin categoría")
            p["resumen_ia"] = ai_data.get("resumen_ia", "Sin resumen")
            
            restaurantes_limpios.append(p)
            
        return {"restaurantes_limpios": restaurantes_limpios}

    except Exception as err:
        print(f"  [WARN] Error de OpenAI procesando lote: {err}. Usando defaults.")
        for p in places_data:
            p["localidad_real"] = localidad_original
            p["categoria"] = "Sin categoría"
            p["resumen_ia"] = "Sin resumen"
        return {"restaurantes_limpios": places_data}


# ── Funciones: Supabase ──────────────────────────────────────────────────────


def _get_supabase_client() -> Client:
    """Crea y devuelve un cliente autenticado de Supabase.

    Raises:
        SystemExit: Si las variables SUPABASE_URL o SUPABASE_KEY no están configuradas.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit(
            "[ERROR] Las variables SUPABASE_URL y/o SUPABASE_KEY no están definidas "
            "en el archivo .env."
        )

    return create_client(SUPABASE_URL, SUPABASE_KEY)


def save_to_supabase(places_data: list[dict], localidad: str) -> None:
    """Enriquece el lote con Gemini e inserta/actualiza en Supabase.

    Utiliza ``upsert`` con ``google_place_id`` como columna de conflicto
    para evitar registros duplicados: si el restaurante ya existe se
    actualizan sus datos; si es nuevo se inserta.

    Args:
        places_data: Lista de diccionarios devueltos por ``get_places()``.
        localidad: Nombre de la localidad (fallback si Gemini falla).
    """
    if not places_data:
        print("[INFO] No hay datos para guardar en Supabase.")
        return

    supabase = _get_supabase_client()

    print("🤖 Procesando lote con OpenAI (gpt-4o-mini) para de-duplicar y enriquecer...\n")
    ai_response = enrich_batch_with_openai(places_data, localidad)
    restaurantes_limpios = ai_response.get("restaurantes_limpios", [])
    
    print(f"  ✔ De {len(places_data)} originales, quedaron {len(restaurantes_limpios)} únicos.")

    records = []
    for place in restaurantes_limpios:
        records.append(
            {
                "google_place_id": place.get("id"),
                "nombre": place.get("nombre"),
                "direccion": place.get("direccion"),
                "localidad": place.get("localidad_real", localidad),
                "horarios": place.get("horarios", []),
                "rating": place.get("calificacion"),
                "categoría": place.get("categoria", "Sin categoría"),
                "resumen_ia": place.get("resumen_ia", "Sin resumen"),
                "foto_url": place.get("foto_url", ""),
                "reseñas": place.get("reseñas", []),
                "estado": "borrador",
            }
        )

    print()

    try:
        # Upsert: inserta o actualiza si google_place_id ya existe.
        response = (
            supabase.table(TABLE_NAME)
            .upsert(records, on_conflict="google_place_id")
            .execute()
        )

        inserted_count = len(response.data) if response.data else 0
        print(f"[OK] {inserted_count} registro(s) insertados/actualizados en '{TABLE_NAME}'.")

        # Log detallado de cada registro procesado.
        for record in response.data or []:
            print(f"     ✔ {record.get('nombre', 'N/A')} (ID: {record.get('google_place_id', 'N/A')})")

    except Exception as db_err:
        print(f"[ERROR] Falló la operación de upsert en Supabase: {db_err}")
        sys.exit(1)


# ── Funciones: Presentación ──────────────────────────────────────────────────


def print_results(places: list[dict]) -> None:
    """Imprime la lista de lugares en la consola de forma legible."""
    if not places:
        print("No se encontraron resultados para la búsqueda.")
        return

    print(f"\n{'=' * 60}")
    print(f"  Se encontraron {len(places)} lugar(es)")
    print(f"{'=' * 60}\n")

    for i, place in enumerate(places, start=1):
        print(f"  [{i}] {place['nombre']}")
        print(f"      ID:       {place['id']}")
        print(f"      Dirección: {place['direccion']}")
        print(f"      Rating:   {place['calificacion']} ⭐  ({place['cantidad_resenas']} reseñas)")
        if place.get("horarios"):
            print(f"      Horarios:")
            for dia in place["horarios"]:
                print(f"        • {dia}")
        else:
            print(f"      Horarios: Sin datos")
        if place.get("resenas_texto"):
            print(f"      Reseñas:  {len(place['resenas_texto'])} extraída(s)")
        print(f"      {'─' * 50}")

    print()


# ── Punto de entrada ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    LOCALIDADES = [
        "San Miguel de Tucumán",
        "Yerba Buena",
        "Tafí Viejo",
        "Concepción",
        "Banda del Río Salí",
        "Aguilares",
        "Lules",
        "Monteros",
        "Famaillá",
        "Tafí del Valle",
    ]

    total_insertados = 0

    for i, localidad in enumerate(LOCALIDADES, start=1):
        query = f"los mejores restaurantes en {localidad}, Tucumán"

        print(f"\n{'=' * 60}")
        print(f"  🏙️  [{i}/{len(LOCALIDADES)}] {localidad.upper()}")
        print(f"{'=' * 60}")
        print(f"\n🔎 Buscando: \"{query}\"...\n")

        # 1. Extraer datos de Google Places.
        places = get_places(query)

        if not places:
            print(f"  [INFO] No se encontraron resultados para {localidad}. Saltando...")
            continue

        print(f"  ✔ {len(places)} restaurante(s) encontrados.")

        # 2. Enriquecer con OpenAI y persistir en Supabase.
        print(f"\n💾 Guardando resultados en Supabase...\n")
        save_to_supabase(places, localidad)
        total_insertados += len(places)

        # 3. Pausa entre ciudades para no saturar las APIs.
        if i < len(LOCALIDADES):
            print(f"\n  ⏳ Esperando 5s antes de la siguiente ciudad...")
            time.sleep(5)

    # Resumen final.
    print(f"\n{'=' * 60}")
    print(f"  🎉 PROCESO FINALIZADO")
    print(f"  Total de restaurantes procesados: {total_insertados}")
    print(f"  Localidades cubiertas: {len(LOCALIDADES)}")
    print(f"{'=' * 60}")

