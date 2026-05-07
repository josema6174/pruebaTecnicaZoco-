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

# Cargamos las variables de entorno desde el archivo .env del proyecto.
load_dotenv("apis.env", override=True)

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

        # Reseñas: extraemos solo el texto de cada review.
        reviews_raw = place.get("reviews", [])
        resenas_texto = [
            rev.get("text", {}).get("text", "")
            for rev in reviews_raw
            if rev.get("text", {}).get("text")
        ]

        results.append(
            {
                "id": place.get("id"),
                "nombre": place.get("displayName", {}).get("text"),
                "direccion": place.get("formattedAddress"),
                "calificacion": place.get("rating"),
                "cantidad_resenas": place.get("userRatingCount"),
                "horarios": horarios,
                "resenas_texto": resenas_texto,
            }
        )

    return results


# ── Funciones: OpenAI (IA) ───────────────────────────────────────────────────


def enrich_with_openai(place: dict, localidad_original: str) -> dict:
    """Envía los datos de un restaurante a OpenAI para extraer metadatos.

    GPT-4o-mini analiza el nombre, la dirección y las reseñas para devolver:
    - ``localidad_real``: la ciudad real extraída de la dirección.
    - ``categoria``: tipo de restaurante en una sola palabra.
    - ``resumen_ia``: resumen del ambiente en máximo 15 palabras.

    Si OpenAI falla por cualquier motivo, devuelve valores por defecto
    para no interrumpir la ejecución del pipeline principal.

    Args:
        place: Diccionario con los datos del restaurante.
        localidad_original: Localidad usada en la búsqueda (fallback).

    Returns:
        Diccionario con las claves ``localidad_real``, ``categoria`` y ``resumen_ia``.
    """
    defaults = {
        "localidad_real": localidad_original,
        "categoria": "Sin categoría",
        "resumen_ia": "Sin resumen",
    }

    if not OPENAI_API_KEY:
        print("  [WARN] OPENAI_API_KEY no configurada. Usando valores por defecto.")
        return defaults

    # Preparamos el texto de reseñas (limitado para no exceder tokens).
    resenas = " | ".join(place.get("resenas_texto", [])[:5]) or "Sin reseñas disponibles"

    system_msg = (
        "Eres un experto procesador de datos. Devuelve estrictamente un JSON con 3 claves: "
        "'localidad_real' (extrae la ciudad real de la dirección corrigiendo discrepancias), "
        "'categoria' (asigna una sola palabra como Parrilla, Pizzería, Cafetería, etc.), "
        "y 'resumen_ia' (un resumen del ambiente de máximo 15 palabras)."
    )

    user_msg = f"Nombre: {place['nombre']}, Dirección: {place['direccion']}, Reseñas: {resenas}"

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

        # Validamos que las 3 claves estén presentes.
        return {
            "localidad_real": result.get("localidad_real", localidad_original),
            "categoria": result.get("categoria", "Sin categoría"),
            "resumen_ia": result.get("resumen_ia", "Sin resumen"),
        }

    except json.JSONDecodeError:
        print(f"  [WARN] OpenAI devolvió un JSON inválido para '{place['nombre']}'. Usando defaults.")
        return defaults
    except Exception as err:
        print(f"  [WARN] Error de OpenAI para '{place['nombre']}': {err}. Usando defaults.")
        return defaults


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
    """Enriquece cada restaurante con Gemini e inserta/actualiza en Supabase.

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

    # Enriquecemos cada restaurante con OpenAI antes de insertar.
    print("🤖 Procesando datos con OpenAI (gpt-4o-mini)...\n")
    records = []
    for place in places_data:
        ai_data = enrich_with_openai(place, localidad)
        print(f"  ✔ {place['nombre']}: {ai_data['categoria']} | {ai_data['resumen_ia']}")
        time.sleep(2)  # Pausa de 2s entre peticiones para evitar rate limits.

        records.append(
            {
                "google_place_id": place["id"],
                "nombre": place["nombre"],
                "direccion": place["direccion"],
                "localidad": ai_data["localidad_real"],
                "horarios": place["horarios"],
                "rating": place["calificacion"],
                "categoría": ai_data["categoria"],
                "resumen_ia": ai_data["resumen_ia"],
                # "review": place["cantidad_resenas"],  # ← descomentar cuando exista la columna
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

