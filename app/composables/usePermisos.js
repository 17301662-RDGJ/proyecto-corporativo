import { useSupabaseClient } from "#imports";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";

export const usePermisos = () => {
  const permisos = useState("permisos", () => []);
  const usuario = useState("usuario", () => null);
  const modulos = useState("modulos", () => []);
  const supabase = useSupabaseClient();
  const route = useRoute();

  let cargando = false;

  /* ================================
     WATCH USUARIO
  ================================ */
  watch(usuario, async (nuevo) => {
    if (nuevo?.idperfil && !cargando) {
      cargando = true;
      await cargarPermisos(nuevo.idperfil);
      cargando = false;
    }
  });

  /* ================================
     ADMIN
  ================================ */
  const esAdmin = computed(() => {
    return (
      usuario.value?.bitadministrador === true ||
      usuario.value?.bitadministrador === 1 ||
      usuario.value?.bitadministrador === "1" ||
      usuario.value?.bitadministrador === "true" ||
      usuario.value?.idperfil === "21dde214-a4f0-4d75-99d7-a2f569cc13a8"
    );
  });

  /* ================================
     MODULOS
  ================================ */
  const cargarTodosModulos = async () => {
    const { data } = await supabase.from("modulo").select("*");
    modulos.value = data || [];
  };

  /* ================================
     USUARIO LOCAL
  ================================ */
  const cargarUsuario = () => {
    if (process.client) {
      const usr = JSON.parse(localStorage.getItem("usuario"));
      if (usr) usuario.value = usr;
    }
  };

  /* ================================
     PERMISOS BD
  ================================ */
  const cargarPermisos = async (idperfil) => {
    if (!idperfil) return;

    const { data, error } = await supabase
      .from("permisos_perfil")
      .select(`
        idmodulo,
        consultar,
        agregar,
        editar,
        eliminar,
        imprimir,
        bitacora,
        modulo (
          id,
  strnombremodulo,
  ruta,
  parent_id,
  tipo
        )
      `)
      .eq("idperfil", idperfil);

    if (error) {
      console.error("Error cargando permisos:", error);
      return;
    }

    permisos.value = data || [];

    if (process.client) {
      localStorage.setItem("permisos", JSON.stringify(permisos.value));
      localStorage.setItem("permisos_timestamp", Date.now());
    }

    console.log("PERMISOS DESDE BD:", data);
  };

  /* ================================
     REFRESH GLOBAL (IMPORTANTE)
  ================================ */
  const refrescarPermisos = async () => {
    if (!usuario.value?.idperfil) return;
    await cargarPermisos(usuario.value.idperfil);
  };

  /* ================================
     MODULOS PERMITIDOS
  ================================ 
  const modulosPermitidos = computed(() => {
    if (esAdmin.value) return modulos.value;

    return permisos.value
      .filter((p) => p.consultar === true || p.consultar === 1)
      .map((p) => p.modulo);
  });*/
const modulosPermitidos = computed(() => {
  if (esAdmin.value) return modulos.value;

  return modulos.value.filter((m) =>
    permisos.value.some(
      (p) =>
        p.idmodulo?.toString() === m.id?.toString() &&
        (p.consultar === true || p.consultar === 1)
    )
  );
});
  /* ================================
     PERMISOS HELPERS
  ================================ */
  const tienePermiso = (moduloId, tipo) => {
    if (esAdmin.value) return true;

    return permisos.value.some((p) => {
      if (p.idmodulo?.toString() !== moduloId?.toString()) return false;
      return p[tipo] === true || p[tipo] === 1;
    });
  };

  const puedeConsultar = (id) => tienePermiso(id, "consultar");
  const puedeEditar = (id) => tienePermiso(id, "editar");
  const puedeEliminar = (id) => tienePermiso(id, "eliminar");
  const puedeAgregar = (id) => tienePermiso(id, "agregar");
  const puedeImprimir = (id) => tienePermiso(id, "imprimir");
  const puedeBitacora = (id) => tienePermiso(id, "bitacora");

  /* ================================
     MODULO ACTUAL
  ================================ 
  const moduloActual = computed(() => {
    return modulos.value.find((m) => m.ruta === route.path);
  });*/
const moduloActual = computed(() => {
  let modulo = modulos.value.find((m) => m.ruta === route.path);

  // FIX: fallback si no encuentra
  if (!modulo && modulos.value.length > 0) {
    console.warn("Módulo no encontrado para la ruta:", route.path);
     modulo = modulos.value.find(m => m.ruta && m.ruta !== "/") || modulos.value[0];
  }

  return modulo;
});


  const puedeConsultarRuta = computed(() => {
    if (esAdmin.value) return true;
    if (!moduloActual.value) return true;
    return puedeConsultar(moduloActual.value.id);
  });

  /* ================================
     INIT
  ================================ */
  const init = async () => {
    cargarUsuario();

    await cargarTodosModulos();

    if (esAdmin.value) {
      permisos.value = [];
      return;
    }

    if (!usuario.value?.idperfil) return;

    if (process.client) {
      const lastUpdate = localStorage.getItem("permisos_timestamp");

      if (!lastUpdate || Date.now() - lastUpdate > 30000) {
        await cargarPermisos(usuario.value.idperfil);
      } else {
        const cache = localStorage.getItem("permisos");
        if (cache) permisos.value = JSON.parse(cache);
      }
    }
  };

  return {
    usuario,
    permisos,
    modulos,

    refrescarPermisos,
    cargarPermisos,
    modulosPermitidos,

    puedeConsultar,
    puedeAgregar,
    puedeEditar,
    puedeEliminar,
    puedeImprimir,
    puedeBitacora,
    puedeConsultarRuta,

    moduloActual,
    init,
  };
};