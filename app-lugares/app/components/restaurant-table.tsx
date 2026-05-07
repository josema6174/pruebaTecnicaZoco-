"use client";

import { Edit2, Trash2, Star, ChevronLeft, ChevronRight, MapPin, Inbox } from "lucide-react";
import { Restaurant } from "@/app/types/restaurant";
import clsx from "clsx";

interface RestaurantTableProps {
  restaurants: Restaurant[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (restaurant: Restaurant) => void;
  onRowClick?: (restaurant: Restaurant) => void;
  isCompact?: boolean;
}

export function getOpenStatus(horarios?: string[]): "Abierto" | "Cerrado" | "Desconocido" {
  if (!horarios || horarios.length === 0) return "Desconocido";

  const now = new Date();

  // Helper to format date in Argentina timezone
  const options = { timeZone: "America/Argentina/Tucuman" };
  const getDay = (date: Date) => date.toLocaleDateString("en-US", { ...options, weekday: "long" });

  const dayMap: Record<string, string> = {
    Monday: "lunes", Tuesday: "martes", Wednesday: "miércoles",
    Thursday: "jueves", Friday: "viernes", Saturday: "sábado", Sunday: "domingo"
  };

  const todayStr = getDay(now);
  const todayEs = dayMap[todayStr];

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getDay(yesterday);
  const yesterdayEs = dayMap[yesterdayStr];

  const hourParts = new Intl.DateTimeFormat("en-US", {
    ...options, hour: "numeric", minute: "numeric", hour12: false
  }).formatToParts(now);

  let currentHour = 0;
  let currentMinute = 0;
  for (const part of hourParts) {
    if (part.type === "hour") currentHour = parseInt(part.value, 10);
    if (part.type === "minute") currentMinute = parseInt(part.value, 10);
  }
  if (currentHour === 24) currentHour = 0; // Intl sometimes returns 24 instead of 0

  const currentTime = currentHour + currentMinute / 60;

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h + (m || 0) / 60;
  };

  const checkSchedule = (dayEs: string, timeToCheck: number, isYesterday: boolean): boolean | null => {
    const scheduleStr = horarios.find(h => h.toLowerCase().startsWith(dayEs));
    if (!scheduleStr) return null;

    const timePart = scheduleStr.substring(scheduleStr.indexOf(':') + 1).trim(); // correccion  
    if (!timePart || timePart.toLowerCase() === "cerrado") return false;
    if (timePart.toLowerCase().includes("abierto 24 horas")) return true;

    const ranges = timePart.split(",").map(r => r.trim());
    for (const range of ranges) {
      const parts = range.split(/[-–]/).map(s => s.trim());
      if (parts.length < 2) continue;

      const start = parseTime(parts[0]);
      let end = parseTime(parts[1]);

      if (end <= start) {
        end += 24; // Crosses midnight
      }

      if (isYesterday) {
        if (end > 24) {
          const overnightEnd = end - 24;
          if (timeToCheck >= 0 && timeToCheck <= overnightEnd) return true;
        }
      } else {
        if (timeToCheck >= start && timeToCheck <= end) return true;
      }
    }
    return false;
  };

  // Check if still open from yesterday's late shift
  if (checkSchedule(yesterdayEs, currentTime, true)) return "Abierto";

  // Check today's schedule
  const openToday = checkSchedule(todayEs, currentTime, false);
  if (openToday === true) return "Abierto";
  if (openToday === false) return "Cerrado";

  return "Desconocido";
}

export function OpenStatusBadge({ horarios }: { horarios?: string[] }) {
  const status = getOpenStatus(horarios);

  const styles = {
    Abierto: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
    Cerrado: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
    Desconocido: "bg-[var(--text-dim)]/10 text-[var(--text-muted)] border-[var(--text-dim)]/20",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border tracking-wide uppercase",
        styles[status]
      )}
      title={status === "Desconocido" ? "Horario no disponible" : `Basado en horario de Supabase`}
    >
      {status}
    </span>
  );
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Star className="w-3.5 h-3.5 text-[var(--warning)] fill-[var(--warning)]" />
      <span className="text-sm font-medium tabular-nums">{rating}</span>
    </div>
  );
}

export default function RestaurantTable({
  restaurants,
  page,
  pageSize,
  totalFiltered,
  onPageChange,
  onEdit,
  onDelete,
  onRowClick,
  isCompact,
}: RestaurantTableProps) {
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const showing = restaurants.slice(start, end);

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
          <Inbox className="w-7 h-7 text-[var(--text-dim)]" />
        </div>
        <p className="text-[var(--text-secondary)] text-sm mb-1">
          No se encontraron restaurantes
        </p>
        <p className="text-[var(--text-muted)] text-xs">
          Intentá con otros filtros de búsqueda
        </p>
      </div>
    );
  }

  return (
    <section className="animate-slideUp" style={{ animationDelay: "150ms" }}>
      {/* Table Container */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-card)]">
        {/* Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)]">
                  Nombre
                </th>
                <th className={clsx("text-left px-5 py-3.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] hidden md:table-cell", isCompact && "!hidden")}>
                  Localidad
                </th>
                <th className={clsx("text-left px-5 py-3.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] hidden lg:table-cell", isCompact && "!hidden")}>
                  Categoría
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)]">
                  Rating
                </th>
                <th className={clsx("text-left px-5 py-3.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] hidden sm:table-cell", isCompact && "!hidden")}>
                  Estado
                </th>
                <th className={clsx("text-right px-5 py-3.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)]", isCompact && "hidden")}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {showing.map((restaurant, idx) => (
                <tr
                  key={restaurant.id}
                  onClick={() => onRowClick?.(restaurant)}
                  className={clsx(
                    "group border-b border-[var(--border-subtle)] last:border-b-0 transition-colors duration-150",
                    "hover:bg-[var(--bg-hover)]",
                    onRowClick && "cursor-pointer"
                  )}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Name + Address */}
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-light)] transition-colors truncate max-w-[240px]">
                        {restaurant.nombre}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-[240px]">
                        {restaurant.direccion}
                      </p>
                    </div>
                  </td>

                  {/* Locality */}
                  <td className={clsx("px-5 py-4 hidden md:table-cell", isCompact && "!hidden")}>
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <MapPin className="w-3 h-3 text-[var(--text-dim)]" />
                      <span className="text-xs">{restaurant.localidad}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className={clsx("px-5 py-4 hidden lg:table-cell", isCompact && "!hidden")}>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                      {restaurant.categoría}
                    </span>
                  </td>

                  {/* Rating */}
                  <td className="px-5 py-4">
                    <RatingDisplay rating={restaurant.rating} />
                  </td>

                  {/* Status */}
                  <td className={clsx("px-5 py-4 hidden sm:table-cell", isCompact && "!hidden")}>
                    <OpenStatusBadge horarios={restaurant.horarios} />
                  </td>

                  {/* Actions */}
                  <td className={clsx("px-5 py-4 text-right", isCompact && "hidden")}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(restaurant); }}
                        className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all duration-150"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(restaurant); }}
                        className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-500/10 transition-all duration-150"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className={clsx(
                "p-1.5 rounded-[var(--radius-sm)] transition-all duration-150",
                page <= 1
                  ? "text-[var(--text-dim)] cursor-not-allowed"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={clsx(
                    "w-8 h-8 rounded-[var(--radius-sm)] text-xs font-medium transition-all duration-150",
                    page === pageNum
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className={clsx(
                "p-1.5 rounded-[var(--radius-sm)] transition-all duration-150",
                page >= totalPages
                  ? "text-[var(--text-dim)] cursor-not-allowed"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
