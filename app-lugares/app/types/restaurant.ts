export interface Restaurant {
  id: number;
  google_place_id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  categoría: string;
  rating: number;
  horarios: string[];
  foto_url?: string;
  reseñas?: { autor: string; texto: string; rating: number }[];
  resumen_ia: string;
  estado: "activo" | "inactivo" | "borrador";
  created_at?: string;
}

export type SortField = "nombre" | "rating" | "localidad" | "categoría";
export type SortDirection = "asc" | "desc";

export interface Filters {
  search: string;
  category: string;
  locality: string;
  minRating: number;
}
