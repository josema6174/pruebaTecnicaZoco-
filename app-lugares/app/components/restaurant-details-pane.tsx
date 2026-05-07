import { Restaurant } from "@/app/types/restaurant";
import { X, MapPin, Star, Edit2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { OpenStatusBadge } from "./restaurant-table";

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
  onEdit?: (restaurant: Restaurant) => void;
  onDelete?: (restaurant: Restaurant) => void;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            rating >= star
              ? "fill-[var(--accent)] text-[var(--accent)]"
              : rating >= star - 0.5
              ? "fill-[var(--accent)] text-[var(--accent)] opacity-50"
              : "text-[var(--border-strong)]"
          }`}
        />
      ))}
      <span className="text-xs font-medium text-[var(--text-primary)] ml-1.5">{rating}</span>
    </div>
  );
}

export default function RestaurantDetailsPane({ restaurant, onClose, onEdit, onDelete }: Props) {
  if (!restaurant) return null;

  return (
    <div className="relative flex flex-col h-[calc(100vh-120px)] sticky top-6 bg-[var(--bg-primary)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] animate-fadeIn">
        
        {/* Header / Photo */}
        <div className="relative h-64 w-full bg-[var(--bg-surface)] shrink-0 group rounded-t-[var(--radius-lg)] overflow-hidden">
          {restaurant.foto_url ? (
            <img 
              src={restaurant.foto_url} 
              alt={restaurant.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-dim)] bg-[var(--bg-elevated)]">
              Sin imagen disponible
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/20 to-black/30" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {onEdit && (
              <button
                onClick={() => onEdit(restaurant)}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-[var(--accent)] transition-colors backdrop-blur-md shadow-sm"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(restaurant)}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-red-500/80 transition-colors backdrop-blur-md shadow-sm"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/80 transition-colors backdrop-blur-md shadow-sm ml-2"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <span className="inline-block px-2.5 py-1 mb-3 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-[10px] font-bold tracking-wider uppercase shadow-lg">
              {restaurant.categoría}
            </span>
            <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-md">
              {restaurant.nombre}
            </h2>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-[var(--bg-primary)]">
          
          {/* Quick Info */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <RatingStars rating={restaurant.rating || 0} />
              <OpenStatusBadge horarios={restaurant.horarios} />
            </div>

            <div className="flex items-start gap-3 text-[var(--text-secondary)]">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-dim)]" />
              <p className="text-sm leading-relaxed">{restaurant.direccion}, {restaurant.localidad}</p>
            </div>
          </div>

          {/* AI Summary */}
          {restaurant.resumen_ia && restaurant.resumen_ia !== "Sin resumen" && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-light)]" />
              <p className="text-sm italic text-[var(--text-secondary)]">
                "{restaurant.resumen_ia}"
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] mt-3 font-semibold">
                Resumen de Inteligencia Artificial
              </p>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-[0.1em] border-b border-[var(--border-subtle)] pb-2">
              Reseñas Destacadas
            </h3>
            
            {restaurant.reseñas && restaurant.reseñas.length > 0 ? (
              <div className="space-y-4">
                {restaurant.reseñas.map((review, idx) => (
                  <div key={idx} className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {review.autor}
                      </span>
                      <RatingStars rating={review.rating} />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4">
                      {review.texto}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-dim)] italic">No hay reseñas disponibles.</p>
            )}
          </div>

        </div>
    </div>
  );
}
