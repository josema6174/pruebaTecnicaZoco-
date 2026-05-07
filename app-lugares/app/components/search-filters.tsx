"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { Filters } from "@/app/types/restaurant";

interface SearchFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categories: string[];
  localities: string[];
  resultCount: number;
}

export default function SearchFilters({
  filters,
  onFiltersChange,
  categories,
  localities,
  resultCount,
}: SearchFiltersProps) {
  const update = (partial: Partial<Filters>) =>
    onFiltersChange({ ...filters, ...partial });

  const hasActiveFilters =
    filters.search || filters.category || filters.locality || filters.minRating > 0;

  const clearAll = () =>
    onFiltersChange({ search: "", category: "", locality: "", minRating: 0 });

  const ratingOptions = [0, 3, 3.5, 4, 4.5];

  return (
    <section className="animate-slideUp space-y-4 sm:space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Buscar restaurantes por nombre, dirección o categoría..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full pl-12 pr-12 py-3.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] transition-all duration-200 hover:border-[var(--border-medium)]"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: "" })}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-xs font-medium tracking-wide uppercase">Filtros</span>
        </div>

        {/* Category Select */}
        <select
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-secondary)] cursor-pointer transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Locality Select */}
        <select
          value={filters.locality}
          onChange={(e) => update({ locality: e.target.value })}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-secondary)] cursor-pointer transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
        >
          <option value="">Todas las localidades</option>
          {localities.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        {/* Rating Filter */}
        <select
          value={filters.minRating}
          onChange={(e) => update({ minRating: parseFloat(e.target.value) })}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-secondary)] cursor-pointer transition-all duration-200 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
        >
          {ratingOptions.map((r) => (
            <option key={r} value={r}>
              {r === 0 ? "Cualquier rating" : `≥ ${r} ★`}
            </option>
          ))}
        </select>

        {/* Clear */}
        <div className="flex items-center gap-3 ml-auto">
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-[var(--accent-light)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
