import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    console.log("📩 BODY:", body);

    if (!body.email) {
      return { error: "El correo es obligatorio" };
    }

    // Instancia limpia y sin leer configuraciones a mano
    const supabase = await serverSupabaseClient(event);

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: "http://localhost:3000/cambiar-password",
    });

    if (error) {
      console.log("❌ ERROR SUPABASE:", error.message);
      return { error: error.message };
    }

    console.log("✅ CORREO ENVIADO");

    return { ok: true };
  } catch (err) {
    console.log("💥 ERROR SERVER:", err);
    return { error: "Error interno del servidor" };
  }
});