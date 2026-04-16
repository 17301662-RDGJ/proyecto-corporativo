import { defineEventHandler, readBody } from "h3";
import { serverSupabaseClient } from '#supabase/server';
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { nombreusuario, password } = body;

  if (!nombreusuario || !password) {
    return { success: false, message: "Faltan datos" };
  }

  // Ahora se inicializa DE FORMA SEGURA, adentro de la petición
  const supabase = await serverSupabaseClient(event);

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

  return {
    success: true,
    user: { id: user.id, nombreusuario: user.nombreusuario },
  };
});