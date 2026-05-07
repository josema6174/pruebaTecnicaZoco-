"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Restaurant, Filters } from "@/app/types/restaurant";
import { supabase } from "@/app/lib/supabase";

import HeroSection from "@/app/components/hero-section";
import SearchFilters from "@/app/components/search-filters";
import RestaurantTable from "@/app/components/restaurant-table";
import EditModal from "@/app/components/edit-modal";
import DeleteDialog from "@/app/components/delete-dialog";
import Footer from "@/app/components/footer";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 15;

export default function Home() {
  // Data state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "",
    locality: "",
    minRating: 0,
  });
  const [page, setPage] = useState(1);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null
  );
  const [deletingRestaurant, setDeletingRestaurant] =
    useState<Restaurant | null>(null);

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from("restaurantes")
          .select("*")
          .order("nombre", { ascending: true });

        if (dbError) throw dbError;

        setRestaurants((data as Restaurant[]) || []);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
        setError("No se pudieron cargar los restaurantes. Verificá la conexión.");
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurants();
  }, []);

  // Derive unique categories and localities from real data
  const allCategories = useMemo(
    () =>
      [...new Set(restaurants.map((r) => r.categoría).filter(Boolean))].sort(),
    [restaurants]
  );

  const allLocalities = useMemo(
    () =>
      [...new Set(restaurants.map((r) => r.localidad).filter(Boolean))].sort(),
    [restaurants]
  );

  // Filter logic
  const filtered = useMemo(() => {
    let results = restaurants;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.nombre?.toLowerCase().includes(q) ||
          r.direccion?.toLowerCase().includes(q) ||
          r.categoría?.toLowerCase().includes(q) ||
          r.localidad?.toLowerCase().includes(q)
      );
    }

    if (filters.category) {
      results = results.filter((r) => r.categoría === filters.category);
    }

    if (filters.locality) {
      results = results.filter((r) => r.localidad === filters.locality);
    }

    if (filters.minRating > 0) {
      results = results.filter((r) => (r.rating || 0) >= filters.minRating);
    }

    return results;
  }, [restaurants, filters]);

  // Reset page when filters change
  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  // CRUD handlers
  const handleEdit = useCallback((restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
  }, []);

  const handleSave = useCallback(
    async (updated: Restaurant) => {
      // Update in Supabase
      const { error: dbError } = await supabase
        .from("restaurantes")
        .update({
          nombre: updated.nombre,
          direccion: updated.direccion,
          localidad: updated.localidad,
          "categoría": updated.categoría,
          rating: updated.rating,
          resumen_ia: updated.resumen_ia,
          estado: updated.estado,
        })
        .eq("id", updated.id);

      if (dbError) {
        console.error("Error updating restaurant:", dbError);
        alert("Error al guardar: " + dbError.message);
        return;
      }

      // Update local state
      setRestaurants((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    },
    []
  );

  const handleDelete = useCallback((restaurant: Restaurant) => {
    setDeletingRestaurant(restaurant);
  }, []);

  const handleConfirmDelete = useCallback(async (restaurant: Restaurant) => {
    // Delete from Supabase
    const { error: dbError } = await supabase
      .from("restaurantes")
      .delete()
      .eq("id", restaurant.id);

    if (dbError) {
      console.error("Error deleting restaurant:", dbError);
      alert("Error al eliminar: " + dbError.message);
      return;
    }

    // Remove from local state
    setRestaurants((prev) => prev.filter((r) => r.id !== restaurant.id));
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">
            Cargando restaurantes desde Supabase...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-light)] transition-all duration-150"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Hero */}
        <HeroSection restaurants={restaurants} />

        {/* Search & Filters */}
        <div className="mt-8 sm:mt-10">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={allCategories}
            localities={allLocalities}
            resultCount={filtered.length}
          />
        </div>

        {/* Table */}
        <div className="mt-5 sm:mt-6">
          <RestaurantTable
            restaurants={filtered}
            page={page}
            pageSize={PAGE_SIZE}
            totalFiltered={filtered.length}
            onPageChange={setPage}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* Modals */}
      <EditModal
        restaurant={editingRestaurant}
        categories={allCategories}
        localities={allLocalities}
        onClose={() => setEditingRestaurant(null)}
        onSave={handleSave}
      />
      <DeleteDialog
        restaurant={deletingRestaurant}
        onClose={() => setDeletingRestaurant(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
