"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Loader2, History, CheckCircle, Edit, Trash, PlusCircle } from "lucide-react";
import { Restaurant } from "@/app/types/restaurant";

interface AuditLog {
  id: string;
  accion: string;
  campo_modificado?: string;
  valor_anterior?: any;
  valor_nuevo?: any;
  creado_en: string;
}

export default function AuditTimeline({ restaurants }: { restaurants: Restaurant[] }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("historial_cambios")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(50); // Limitamos a los últimos 50 para rendimiento global

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    }
    
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-[var(--text-dim)] italic">No hay historial de cambios registrado.</p>
      </div>
    );
  }

  const getActionIcon = (accion: string) => {
    switch (accion) {
      case "CREACIÓN": return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case "EDICIÓN": return <Edit className="w-4 h-4 text-blue-500" />;
      case "ELIMINACIÓN": return <Trash className="w-4 h-4 text-red-500" />;
      case "APROBACIÓN": return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <History className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(new Date(dateString));
  };

  return (
    <div className="mt-2">
      
      <div className="relative border-l border-[var(--border-medium)] ml-3 space-y-6">
        {logs.map((log) => (
          <div key={log.id} className="relative pl-6">
            <span className="absolute -left-[9px] top-1 bg-[var(--bg-primary)] p-0.5 rounded-full border border-[var(--border-medium)]">
              {getActionIcon(log.accion)}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-medium">
                {formatDate(log.creado_en)}
              </span>
              <p className="text-xs font-bold text-[var(--accent)]">
                {restaurants?.find(r => r.id === log.restaurante_id)?.nombre || log.valor_nuevo?.nombre || log.valor_anterior?.nombre || "Restaurante Desconocido"}
              </p>
              <p className="text-sm text-[var(--text-primary)] font-medium">
                {log.accion}
              </p>
              
              {/* Diff view */}
              {(log.valor_anterior || log.valor_nuevo) && (
                <div className="mt-2 bg-[var(--bg-surface)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3 text-xs overflow-x-auto custom-scrollbar">
                  {log.valor_anterior && Object.keys(log.valor_anterior).length > 0 && (
                    <div className="text-red-400 opacity-80 mb-1">
                      - {JSON.stringify(log.valor_anterior)}
                    </div>
                  )}
                  {log.valor_nuevo && Object.keys(log.valor_nuevo).length > 0 && (
                    <div className="text-emerald-400 opacity-80">
                      + {JSON.stringify(log.valor_nuevo)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
