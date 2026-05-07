import { supabase } from "./supabase";

export interface CambioRegistro {
  restaurante_id: string;
  accion: "CREACIÓN" | "EDICIÓN" | "ELIMINACIÓN" | "APROBACIÓN";
  campo_modificado?: string;
  valor_anterior?: any;
  valor_nuevo?: any;
}

export async function registrarCambio({
  restaurante_id,
  accion,
  campo_modificado,
  valor_anterior,
  valor_nuevo,
}: CambioRegistro) {
  try {
    const { error } = await supabase.from("historial_cambios").insert([
      {
        restaurante_id,
        accion,
        campo_modificado,
        valor_anterior,
        valor_nuevo,
      },
    ]);

    if (error) {
      console.error("[Audit Log Error] No se pudo registrar el cambio:", JSON.stringify(error, null, 2));
    }
  } catch (err) {
    console.error("[Audit Log Exception]", err);
  }
}
