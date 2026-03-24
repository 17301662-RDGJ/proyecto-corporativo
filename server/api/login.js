import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig();

  const supabase = createClient(config.supabaseUrl, config.supabaseKey);

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

  //const token = jwt.sign({ id: user.id, perfil: user.idperfil }, "secret", {
  //expiresIn: "2h",
  const token = jwt.sign({ id: user.id }, "secret", { expiresIn: "2h" });

  return {
    token,
    usuario: user, // 👈 MUY IMPORTANTE
  };
});
