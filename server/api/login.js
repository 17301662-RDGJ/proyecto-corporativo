import jwt from "jsonwebtoken";
import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // Así se llama a Supabase correctamente en Nuxt 3
  const supabase = await serverSupabaseClient(event);

  const { data: user, error } = await supabase
    .from("usuario")
    .select("*")
    .eq("strnombreusuario", body.username)
    .maybeSingle();

  if (error) {
    console.error(error);
    return { message: "Error en base de datos" };
  }

  if (!user) {
    return { message: "Usuario no existe" };
  }

  if (user.strpwd !== body.password) {
    return { message: "Contraseña incorrecta" };
  }

  if (user.idestadousuario !== 1) {
    return { message: "Usuario inactivo" };
  }

  const token = jwt.sign({ id: user.id }, "secret", { expiresIn: "2h" });

  return {
    token,
    usuario: user, 
  };
});