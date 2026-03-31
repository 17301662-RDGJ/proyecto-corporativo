export default defineNuxtRouteMiddleware(async (to) => {
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

    // Si no existe módulo, negar acceso
    if (error) {
      console.error("Error buscando módulo:", error);
      return navigateTo("/sin-acceso");
    }

    if (!modulo) {
      console.warn("Módulo no encontrado para la ruta:", to.path);
      return navigateTo("/sin-acceso");
    }

    // Buscar permiso del perfil para ese módulo
    const { data: permiso, error: errorPermiso } = await supabase
      .from("permisos_perfil") // ✅ corregido
      .select("*")
      .eq("idperfil", usuario.value.idperfil)
      .eq("idmodulo", modulo.id)
      .maybeSingle();

    if (errorPermiso) {
      console.error("Error buscando permiso:", errorPermiso);
      return navigateTo("/sin-acceso");
    }

    // Validar permiso de consultar
    if (!permiso || !(permiso.consultar === true || permiso.consultar === 1)) {
      console.warn("Sin permiso para consultar esta ruta");
      return navigateTo("/sin-acceso");
    }
  }
});
