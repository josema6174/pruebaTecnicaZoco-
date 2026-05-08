# Gestor de establecimientos gastronómicos de Tucumán - Prueba Técnica

**Demo en vivo:** [https://prueba-tecnica-zoco-mocha.vercel.app]

## Descripción del Proyecto

El proyecto consiste en una aplicación web que muestra en una tabla distintos establecimientos gastronómicos de Tucumán. A su vez, permite agregar nuevos establecimientos a la tabla, editar los que ya existen y eliminarlos. Además, el proyecto también cuenta con un chat con IA, el cual está entrenado con los establecimientos cargados en la tabla, y un historial de cambios.

## Arquitectura y Tecnologías

### 1. Frontend (Visualización)
- **Framework:** Next.js (App Router) con TypeScript para un tipado seguro.
- **Estilos:** Tailwind CSS para una interfaz completamente responsiva.
- **Despliegue:** Vercel.

### 2. Backend & Motor de Datos (Extracción y Procesamiento)
- **Lenguaje:** Python 3.10
- **Extracción:** Google Places API (New) para obtener restaurantes, detalles, fotos y reseñas de usuarios reales.
- **Aseguramiento de Calidad (QA) con IA:** OpenAI API (modelo `gpt-4o-mini`) implementado mediante *Batch Processing*. La IA evalúa lotes de datos para eliminar duplicados semánticos, categorizar locales y generar un resumen del ambiente, garantizando que la base de datos se mantenga limpia.

### 3. Base de Datos
- **Motor:** PostgreSQL alojado en Supabase.
- **Estructura:** Se utilizan columnas estructuradas y soporte `JSONB` para almacenar las reseñas de forma nativa sin romper la normalización.

### 4. Automatización (CI/CD)
- **Herramienta:** GitHub Actions para automatizar el funcionamiento del scraper.

## Funcionamiento del Proyecto

Lo primero que se ejecuta es el `scraper.py`, que se encarga de obtener los datos de los establecimientos gastronómicos de Tucumán a través de la API de Google Places. Una vez obtenidos los datos, estos son procesados por la IA de OpenAI para ser categorizados y se les genera un resumen del ambiente, además de eliminar los duplicados y corregir algunos errores que puedan tener los datos de la API. Una vez están limpios, son enviados a la base de datos en Supabase, a la tabla de restaurantes.

El frontend, por su parte, es una aplicación web que muestra en una tabla los establecimientos gastronómicos, permite agregar nuevos establecimientos a la tabla, editar los que ya existen y eliminarlos. Cada vez que un restaurante es manipulado o creado, se inserta un nuevo registro en la tabla de historial en Supabase, así los cambios pueden ser vistos en el historial de cambios implementado en la aplicación. Por último, cuenta con un chat con IA, el cual está entrenado con los establecimientos de la tabla de restaurantes y puede responder preguntas sobre ellos; este usa la API de OpenAI para funcionar.

Por último, el sistema es automatizado a través de una automatización en GitHub Actions en el flujo de trabajo configurado (`.github/workflows/scraper.yml`), que se encarga de ejecutar el `scraper.py` cada cierto tiempo para mantener la base de datos actualizada.

## Preguntas de Criterio Técnico

### ¿Cómo evitás duplicados?

La prevención de duplicados se maneja en dos capas distintas para maximizar la integridad de los datos:
    
En la base de datos, los restaurantes no pueden tener un mismo ID de Google Places dos veces, por cómo está configurada la tabla de restaurantes.
    
A nivel semántico, para evitar que el mismo lugar con ligeras variaciones (ej: Irlanda, Bar Irlanda) se registre como dos entidades distintas, el script agrupa los datos en lotes antes de procesarlos. OpenAI analiza el lote completo en contexto, detecta similitudes semánticas y purga los duplicados lógicos antes de intentar la inserción en la base de datos.

### ¿Cómo escalarías este sistema?

En el momento que el sistema quiera procesar más datos (si quiere cubrir otra provincia, por ejemplo), se puede encontrar con un cuello de botella. Por ello, se puede cambiar el script síncrono actual por una arquitectura basada en colas de mensajes (RabbitMQ o similar). Un proceso "Productor" encolaría las regiones a procesar, y múltiples "Consumidores" ejecutarían el scraping en paralelo. También se podría implementar caché en Redis en el frontend para reducir la latencia y el consumo.

### ¿Qué problemas puede tener este flujo?

Los principales problemas que puede tener el sistema pueden ser, primero, los límites de tiempo en GitHub Actions, ya que las automatizaciones en GitHub Actions tienen un tiempo de ejecución limitado, por lo que si el scraper requiere de mucho tiempo no podrá terminar su tarea y su ejecución será interrumpida. Otro problema puede ser las alucinaciones y errores que puede cometer la IA al procesar datos (categorías mal puestas, por ejemplo). Y por último, otra cosa en la que el proyecto puede verse afectado es por su dependencia externa a las APIs de OpenAI y Google Places, lo que hace que se tenga que estar atento a las actualizaciones de las estructuras de ambas APIs para prevenir problemas con costos.

### ¿Cómo mejorarías la calidad de los datos?

Para mejorar la integridad de los datos, agregaría otra capa de procesamiento en la que implementaría librerías de Python como Pydantic para forzar una validación de datos estricta antes de la inserción y durante la lectura, para asegurar que ningún dato malformado llegue a la base de datos.
