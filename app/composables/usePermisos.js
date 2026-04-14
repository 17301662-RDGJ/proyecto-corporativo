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

  watch(() => usuario.value?.idperfil, async (idperfil) => {
    if (idperfil && !cargando) {
      cargando = true;
      await cargarPermisos(idperfil);
      cargando = false;
    }
  });

  /*ADMIN*/
  const esAdmin = computed(() => {
    return (
      usuario.value?.bitadministrador === true ||
      usuario.value?.bitadministrador === 1 ||
      usuario.value?.bitadministrador === "1" ||
      usuario.value?.bitadministrador === "true" ||
      usuario.value?.idperfil === "21dde214-a4f0-4d75-99d7-a2f569cc13a8"
    );
  });

  /*MODULOS*/
  const cargarTodosModulos = async () => {
    const { data } = await supabase.from("modulo").select("*");
    modulos.value = data || [];
  };

  /*USUARIO LOCAL*/
  const cargarUsuario = () => {
    if (process.client) {
      const usr = JSON.parse(localStorage.getItem("usuario"));
      if (usr) usuario.value = usr;
    }
  };

  /*PERMISOS BD*/
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
        eliminados,
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

  /*REFRESH GLOBAL*/
  const refrescarPermisos = async () => {
    if (!usuario.value?.idperfil) return;
    await cargarPermisos(usuario.value.idperfil);
  };

  /* MODULOS PERMITIDOS (FIX REAL) */
const modulosPermitidos = computed(() => {
  if (esAdmin.value) return modulos.value;

  const idsPermitidos = permisos.value
    .filter(p =>
      p.consultar === true ||
      p.consultar === 1 ||
      p.consultar === "true"
    )
    .map(p => p.modulo?.id?.toString()) // 🔥 AQUÍ EL FIX REAL
    .filter(Boolean);

  return modulos.value.filter(m =>
    idsPermitidos.includes(m.id?.toString())
  );
});

  /*PERMISOS HELPERS*/
  const tienePermiso = (moduloId, tipo) => {
  if (esAdmin.value) return true;

  return permisos.value.some((p) => {
    const id = p.modulo?.id || p.idmodulo; // 🔥 FIX
    if (id?.toString() !== moduloId?.toString()) return false;

    return (
      p[tipo] === true ||
      p[tipo] === 1 ||
      p[tipo] === "true"
    );
  });
};
  const puedeConsultar = (id) => tienePermiso(id, "consultar");
  const puedeEditar = (id) => tienePermiso(id, "editar");
  const puedeEliminar = (id) => tienePermiso(id, "eliminar");
  const puedeAgregar = (id) => tienePermiso(id, "agregar");
  const puedeImprimir = (id) => tienePermiso(id, "imprimir");
  const puedeBitacora = (id) => tienePermiso(id, "bitacora");

  /*MODULO ACTUAL*/
  const moduloActual = computed(() => {
    let modulo = modulos.value.find((m) => {
      if (!m.ruta) return false;

      const cleanRuta = m.ruta.replace(/\/$/, "");
      const cleanPath = route.path.replace(/\/$/, "");

      return (
        cleanPath === cleanRuta ||
        cleanPath.startsWith(cleanRuta + "/")
      );
    });

    if (!modulo && modulos.value.length > 0) {
      console.warn("Módulo no encontrado para la ruta:", route.path);
      modulo =
        modulos.value.find(m => m.ruta && m.ruta !== "/") ||
        modulos.value[0];
    }

    return modulo;
  });

  const puedeConsultarRuta = computed(() => {
    if (esAdmin.value) return true;
    if (!moduloActual.value) return true;
    return puedeConsultar(moduloActual.value.id);
  });

  /*INIT*/
  const init = async () => {
    cargarUsuario();

    await cargarTodosModulos();

    if (esAdmin.value) {
      permisos.value = [];
      return;
    }

    if (!usuario.value?.idperfil) return;

    if (process.client) {
      await cargarPermisos(usuario.value.idperfil);
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