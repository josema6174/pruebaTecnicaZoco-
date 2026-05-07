"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Restaurant } from "@/app/types/restaurant";

interface DeleteDialogProps {
  restaurant: Restaurant | null;
  onClose: () => void;
  onConfirm: (restaurant: Restaurant) => void;
}

export default function DeleteDialog({
  restaurant,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!restaurant) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-fadeIn"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-medium)] shadow-[var(--shadow-modal)] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
            Eliminar restaurante
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            ¿Estás seguro que querés eliminar{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {restaurant.nombre}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-all duration-150"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm(restaurant);
              onClose();
            }}
            className="px-4 py-2 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--danger)] text-white hover:bg-red-500 transition-all duration-150"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
