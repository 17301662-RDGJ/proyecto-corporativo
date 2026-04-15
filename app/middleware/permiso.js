export default defineNuxtRouteMiddleware(async (to) => {
  // 1. Permitir acceso al login siempre para evitar bucles infinitos
  if (to.path === "/login") return;

  if (process.client) {
    const usuario = useState("usuario");

    // 2. Intentar recuperar la sesión del localStorage si el estado está vacío (F5)
    if (!usuario.value) {
      const stored = localStorage.getItem("usuario");
      if (stored) {
        usuario.value = JSON.parse(stored);
      }
    }

    // 3. Si no hay usuario después de intentar recuperar, redirigir a login
    if (!usuario.value) {
      return navigateTo("/login");
    }

    // 4. El Dashboard suele ser la zona común permitida
    if (to.path === "/dashboard") return;

    const supabase = useSupabaseClient();

    /** * 5. BUSCAR MÓDULO (Optimizado)
     * Normalizamos la ruta: quitamos la barra diagonal final y convertimos a minúsculas
     * Usamos .ilike para que la búsqueda en la base de datos sea insensible a mayúsculas
     */
    const rutaBusqueda = to.path.replace(/\/$/, "");

    const { data: modulo, error: errorMod } = await supabase
      .from("modulo")
      .select("id, strnombremodulo")
      .ilike("ruta", rutaBusqueda)
      .maybeSingle();

    if (errorMod || !modulo) {
      console.warn("Ruta no registrada en la tabla de módulos:", to.path);
      // Según el requerimiento: si no tiene permiso (o no existe el módulo), va a login
      return navigateTo("/login");
    }

    /**
     * 6. VERIFICAR PERMISO DE CONSULTA
     * El PDF exige que si no tiene permiso para la URL, se redireccione.
     * Validamos que el bit de 'consultar' sea true.
     */
    const { data: permiso, error: errorPerm } = await supabase
      .from("permisos_perfil")
      .select("consultar")
      .eq("idperfil", usuario.value.idperfil)
      .eq("idmodulo", modulo.id)
      .maybeSingle();

    if (errorPerm) {
      console.error("Error técnico al validar permisos");
      return navigateTo("/login");
    }

    // 7. SI NO HAY REGISTRO O EL BIT 'CONSULTAR' ES FALSO
    if (!permiso || permiso.consultar !== true) {
      console.warn(`Acceso denegado al módulo: ${modulo.strnombremodulo}`);

      // Limpiamos los datos de sesión para cumplir con el redireccionamiento estricto
      localStorage.removeItem("usuario");
      localStorage.removeItem("permisos");
      usuario.value = null;

      return navigateTo("/login");
    }

    // Si pasa todas las validaciones, el usuario puede ver la página
    console.log(`Acceso concedido a: ${modulo.strnombremodulo}`);
  }
});