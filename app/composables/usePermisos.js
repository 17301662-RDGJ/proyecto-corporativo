import { useSupabaseClient } from "#imports";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { watch } from "vue";

export const usePermisos = () => {
  const permisos = useState("permisos", () => []);
  const usuario = useState("usuario", () => null);
  const modulos = useState("modulos", () => []);
  const supabase = useSupabaseClient();
  const route = useRoute();

  let cargando = false;

  watch(usuario, async (nuevo) => {
    if (nuevo?.idperfil && !cargando) {
      cargando = true;
      await cargarPermisos(nuevo.idperfil);
      cargando = false;
    }
  });

  /* ================================
      DETECTAR ADMIN (FIX REAL)
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
      VALIDAR RUTA
     ================================ */
  const validarRuta = async (ruta) => {
    if (ruta === "/dashboard") return true;

    if (esAdmin.value) return true;

    if (!ruta) return true;

    const { data, error } = await supabase
      .from("modulo")
      .select("id")
      .eq("ruta", ruta)
      .maybeSingle();

    if (error) {
      console.error("Error validando ruta:", error);
      return false;
    }

    if (!data) {
      console.warn("⚠️ Ruta sin módulo:", ruta);
      return true;
    }

    return puedeConsultar(data.id);
  };

  /* ================================
     📦 CARGAR MODULOS
     ================================ */
  const cargarTodosModulos = async () => {
    const { data, error } = await supabase.from("modulo").select("*");

    if (error) {
      console.error("❌ Error cargando módulos:", error);
      return;
    }

    modulos.value = data || [];
  };

  /* ================================
     👤 USUARIO
     ================================ */
  const cargarUsuario = () => {
    if (process.client) {
      const usr = JSON.parse(localStorage.getItem("usuario"));
      if (usr) usuario.value = usr;
    }
  };

  /* ================================
     🔐 PERMISOS
     ================================ */
  const cargarPermisos = async (perfilId) => {
    if (!perfilId) return;

    const { data, error } = await supabase
      .from("permisos_perfil")
      .select("*, modulo(*)")
      .eq("idperfil", perfilId);

    if (error) {
      console.error("❌ Error cargando permisos:", error);
      return;
    }

    permisos.value = data || [];

    if (process.client) {
      localStorage.setItem("permisos", JSON.stringify(permisos.value));
    }
    console.log("Permisos cargados:", permisos.value);
  };

  /* ================================
     📦 MODULOS PARA NAVBAR
     ================================ */
  const modulosPermitidos = computed(() => {
    if (esAdmin.value) {
      return modulos.value;
    }

    return permisos.value
      .filter((p) => p.consultar === true || p.consultar === 1)
      .map((p) => p.modulo);
  });

  /* ================================
     🔐 VALIDACIONES
     ================================ */
  const tienePermiso = (moduloId, tipo) => {
    if (esAdmin.value) return true;

    return permisos.value.some((p) => {
      if (p.idmodulo?.toString() !== moduloId?.toString()) return false;
      return p[tipo] === true || p[tipo] === 1;
    });
  };

  const puedeConsultar = (moduloId) => tienePermiso(moduloId, "consultar");
  const puedeAgregar = (moduloId) => tienePermiso(moduloId, "agregar");
  const puedeEditar = (moduloId) => tienePermiso(moduloId, "editar");
  const puedeEliminar = (moduloId) => tienePermiso(moduloId, "eliminar");
  const puedeImprimir = (moduloId) => tienePermiso(moduloId, "imprimir");
  const puedeBitacora = (moduloId) => tienePermiso(moduloId, "bitacora");

  /* ================================
     NUEVO: MODULO ACTUAL POR RUTA
     ================================ */
  const moduloActual = computed(() => {
    return modulos.value.find((m) => m.ruta === route.path);
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

    console.log("Usuario cargado:", usuario.value);
    console.log("Es admin:", esAdmin.value);

    // SIEMPRE cargar módulos
    await cargarTodosModulos();

    // SI ES ADMIN → NO NECESITA PERMISOS
    if (esAdmin.value) {
      permisos.value = [];
      return;
    }

    // LOCAL STORAGE
    /*if (process.client) {
      const permisosStorage = JSON.parse(localStorage.getItem("permisos"));
      if (permisosStorage) {
        permisos.value = permisosStorage;
      }
    }*/
    if (usuario.value?.idperfil) {
      await cargarPermisos(usuario.value.idperfil);
    }

    // BD
    if (usuario.value?.idperfil) {
      await cargarPermisos(usuario.value.idperfil);
    }
  };

  return {
    usuario,
    permisos,
    modulos,

    cargarPermisos,
    modulosPermitidos,

    puedeConsultar,
    puedeAgregar,
    puedeEditar,
    puedeEliminar,
    puedeImprimir,
    puedeBitacora,
    validarRuta,

    // NUEVOS
    moduloActual,
    puedeConsultarRuta,

    init,
  };
};
