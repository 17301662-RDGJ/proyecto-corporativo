export default defineNuxtRouteMiddleware(async (to) => {
  // ✅ Permitir login siempre
  if (to.path === "/login") return;

  if (process.client) {
    const usuario = useState("usuario");

    // Recuperar usuario desde localStorage
    if (!usuario.value) {
      const stored = localStorage.getItem("usuario");
      if (stored) {
        usuario.value = JSON.parse(stored);
      }
    }

    // Si no hay usuario, auth.js se encarga
    if (!usuario.value) return;

    const supabase = useSupabaseClient();

    // Permitir dashboard siempre
    if (to.path === "/dashboard") return;

    // Buscar módulo por la ruta actual
    const { data: modulo, error } = await supabase
      .from("modulo")
      .select("*")
      .eq("ruta", to.path)
      .maybeSingle();

    if (error) {
      console.error("Error buscando módulo:", error);
      return navigateTo("/login");
    }

    // Si no existe módulo → login
    if (!modulo) {
      console.warn("Módulo no encontrado para la ruta:", to.path);
      return navigateTo("/login");
    }

    // Buscar permiso del perfil
    const { data: permiso, error: errorPermiso } = await supabase
      .from("permisos_perfil")
      .select("*")
      .eq("idperfil", usuario.value.idperfil)
      .eq("idmodulo", modulo.id)
      .maybeSingle();

    if (errorPermiso) {
      console.error("Error buscando permiso:", errorPermiso);
      return navigateTo("/login");
    }

    // Si no tiene permiso → limpiar sesión + login
    if (!permiso || !(permiso.consultar === true || permiso.consultar === 1)) {
      console.warn("Sin permiso para esta ruta");

      localStorage.removeItem("usuario");
      localStorage.removeItem("permisos");
      usuario.value = null;

      return navigateTo("/login");
    }
  }
});
