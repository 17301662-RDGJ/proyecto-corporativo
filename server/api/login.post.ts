import { defineEventHandler, readBody } from "h3";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.NUXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { nombreusuario, password } = body;

  if (!nombreusuario || !password) {
    return { success: false, message: "Faltan datos" };
  }

  const { data: user, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("nombreusuario", nombreusuario)
    .single();

  if (error || !user) {
    return { success: false, message: "Usuario no encontrado" };
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return { success: false, message: "Contraseña incorrecta" };

  // Retornamos solo datos necesarios
  return {
    success: true,
    user: { id: user.id, nombreusuario: user.nombreusuario },
  };
});
