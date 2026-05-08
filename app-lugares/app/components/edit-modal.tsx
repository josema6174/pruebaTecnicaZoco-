"use client";

import { useEffect, useRef, useState } from "react";
import { X, Save } from "lucide-react";
import { Restaurant } from "@/app/types/restaurant";

interface EditModalProps {
  restaurant: Restaurant | null;
  categories: string[];
  localities: string[];
  onClose: () => void;
  onSave: (updated: Restaurant) => void;
}

export default function EditModal({
  restaurant,
  categories,
  localities,
  onClose,
  onSave,
}: EditModalProps) {
  const [form, setForm] = useState<Restaurant | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (restaurant) {
      setForm({ ...restaurant });
    }
  }, [restaurant]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!restaurant || !form) return null;

  const update = (field: keyof Restaurant, value: string | number) =>
    setForm({ ...form, [field]: value });

  const handleSave = () => {
    const finalForm = { ...form };
    if (finalForm.rating === "" || isNaN(finalForm.rating as any)) {
      finalForm.rating = 0;
    }
    onSave(finalForm);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] transition-all duration-200 hover:border-[var(--border-medium)]";

  const labelClass =
    "block text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-1.5";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-fadeIn"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-medium)] shadow-[var(--shadow-modal)] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {form.id ? "Editar restaurante" : "Nuevo restaurante"}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {form.id ? form.nombre : "Completá los datos básicos"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              className={inputClass}
              placeholder="Ej. La Gran Taberna"
            />
          </div>

          {/* Photo URL */}
          <div>
            <label className={labelClass}>URL de la Imagen</label>
            <input
              type="text"
              value={form.foto_url || ""}
              onChange={(e) => update("foto_url", e.target.value)}
              className={inputClass}
              placeholder="https://ejemplo.com/foto.jpg"
            />
          </div>

          {/* Address */}
          <div>
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => update("direccion", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Category + Locality */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoría</label>
              <select
                value={form.categoría}
                onChange={(e) => update("categoría", e.target.value)}
                className={inputClass + " cursor-pointer"}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Localidad</label>
              <select
                value={form.localidad}
                onChange={(e) => update("localidad", e.target.value)}
                className={inputClass + " cursor-pointer"}
              >
                {localities.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Rating</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    update("rating", "");
                  } else if (/^[0-5](\.\d?)?$/.test(val)) {
                    const num = parseFloat(val);
                    if (num <= 5) {
                      update("rating", val);
                    }
                  }
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => update("estado", e.target.value)}
                className={inputClass + " cursor-pointer"}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>
          </div>

          {/* Resumen */}
          <div>
            <label className={labelClass}>Resumen</label>
            <textarea
              rows={2}
              value={form.resumen_ia}
              onChange={(e) => update("resumen_ia", e.target.value)}
              className={inputClass + " resize-none"}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-all duration-150"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-light)] transition-all duration-150"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
