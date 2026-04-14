<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router"; 
import Swal from "sweetalert2";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";
import Pagination from "@/components/Pagination.vue";

// EXCEL
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const route = useRoute(); // NUEVO
const supabase = useSupabaseClient();

/* DATA */
const usuarios = ref([]);
const perfiles = ref([]);
const modulos = ref([]);

/* FILTROS */
const filtroUsuario = ref("");
const filtroPerfil = ref("");
const filtroEstado = ref("");

/* PAGINADO */
const paginaActual = ref(1);
const porPagina = 5;
const totalPaginas = ref(1);

/* MODAL */
const modal = ref(false);
const editando = ref(false);
const imagen = ref(null);
const preview = ref("");

/* NOTIFICACIONES */
const notificacion = ref({ mostrar: false, mensaje: "", tipo: "success" });

const mostrarNotificacion = (mensaje, tipo = "success") => {
  notificacion.value = { mostrar: true, mensaje, tipo };
  setTimeout(() => (notificacion.value.mostrar = false), 3000);
};

/* LIMPIAR */
const limpiar = () => {
  filtroUsuario.value = "";
  filtroPerfil.value = "";
  filtroEstado.value = "";
};

/* FORM */
const usuario = ref({
  id: null,
  strnombreusuario: "",
  idperfil: "",
  strpwd: "",
  idestadousuario: 1,
  strcorreo: "",
  strnumerocelular: "",
  strfoto: "",
});

/* PERMISOS */
const { init, puedeConsultar, puedeAgregar, puedeEditar, puedeEliminar } =
  usePermisos();

/* MODULO POR RUTA  */
const moduloActual = computed(() => {
  return modulos.value.find(
    (m) => m.ruta && m.ruta.trim().replace(/\/$/, "") === route.path,
  );
});

const tienePermisoConsultar = computed(() => {
  return moduloActual.value && puedeConsultar(moduloActual.value.id);
});

/* EXPORTAR */
const exportarExcel = () => {
  if (!usuariosFiltrados.value.length) {
    mostrarNotificacion("No hay datos para exportar", "error");
    return;
  }

  const fecha = new Date().toLocaleDateString();

  // Datos limpios (como en imprimir)
  const data = usuariosFiltrados.value.map((u) => ({
    Usuario: u.strnombreusuario,
    Perfil:
      perfiles.value.find((p) => p.id === u.idperfil)?.strnombreperfil || "",
    Estado: u.idestadousuario === 1 ? "Activo" : "Inactivo",
    Correo: u.strcorreo,
    Celular: u.strnumerocelular,
  }));

  // Crear hoja
  const worksheet = XLSX.utils.json_to_sheet(data, { origin: "A4" });

  // ENCABEZADO TIPO REPORTE
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      ["Reporte de Usuarios"],
      [`Fecha: ${fecha}`],
      [], // espacio
    ],
    { origin: "A1" },
  );

  // Combinar celdas para el título
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // fecha
  ];

  // Ancho de columnas
  worksheet["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 12 },
    { wch: 30 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const fileData = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  saveAs(fileData, `usuarios_${new Date().toISOString().split("T")[0]}.xlsx`);

  mostrarNotificacion("Excel generado correctamente");
};
/*IMPRIMIR*/
const imprimir = () => {
  if (!usuariosFiltrados.value.length) {
    mostrarNotificacion("No hay datos para imprimir", "error");
    return;
  }

  const fecha = new Date().toLocaleString();

  // Construimos tabla limpia (SIN botones)
  const filas = usuariosFiltrados.value
    .map((u) => {
      const perfil =
        perfiles.value.find((p) => p.id === u.idperfil)?.strnombreperfil || "";

      const estado = u.idestadousuario === 1 ? "Activo" : "Inactivo";

      return `
        <tr>
          <td>${u.strnombreusuario}</td>
          <td>${perfil}</td>
          <td>${estado}</td>
          <td>${u.strcorreo}</td>
          <td>${u.strnumerocelular}</td>
        </tr>
      `;
    })
    .join("");

  const tabla = `
    <table>
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Perfil</th>
          <th>Estado</th>
          <th>Correo</th>
          <th>Celular</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `;

  const ventana = window.open("", "_blank");

  ventana.document.write(`
  <html>
    <head>
      <title>Reporte de Usuarios</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .logo {
          height: 50px;
        }

        .titulo {
          text-align: center;
          flex: 1;
          font-size: 22px;
          font-weight: bold;
        }

        .fecha {
          font-size: 12px;
          color: #555;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        th {
          background: #1e3a5f;
          color: white;
          padding: 10px;
        }

        td {
          padding: 10px;
          border: 1px solid #ccc;
          text-align: center;
        }
      </style>
    </head>

    <body>
      <div class="header">
        <img
          id="logo"
          src="https://nuxt.com/assets/design-kit/logo-green-black.svg"
          class="logo"
        />

        <div class="titulo">Reporte de Usuarios</div>

        <div class="fecha">
          ${fecha}
        </div>
      </div>

      ${tabla}
    </body>
  </html>
`);

  ventana.document.close();

  // ESPERAR A QUE EL LOGO CARGUE
  const logo = ventana.document.getElementById("logo");

  logo.onload = () => {
    ventana.focus();
    ventana.print();
  };

  // fallback por si tarda o falla
  setTimeout(() => {
    ventana.focus();
    ventana.print();
  }, 800);

  /* IMAGEN */
  const seleccionarImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      mostrarNotificacion("Solo se permiten imágenes", "error");
      return;
    }

    imagen.value = file;
    preview.value = URL.createObjectURL(file);
  };
};
/* IMAGEN */
const seleccionarImagen = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    mostrarNotificacion("Solo se permiten imágenes", "error");
    return;
  }

  imagen.value = file;
  preview.value = URL.createObjectURL(file);
};

/* GUARDAR */
const guardar = async () => {
  let urlImagen = usuario.value.strfoto;

  try {
    // SUBIR IMAGEN
    if (imagen.value) {
      const nombre = Date.now() + "_" + imagen.value.name;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("usuario")
        .upload(nombre, imagen.value);

      if (uploadError) {
        console.error("Error subiendo imagen:", uploadError);
        return mostrarNotificacion("Error al subir imagen", "error");
      }

      console.log("Imagen subida:", uploadData);

      const { data: publicUrlData } = supabase.storage
        .from("usuario")
        .getPublicUrl(nombre);

      urlImagen = publicUrlData.publicUrl;
    }

    let datos = { ...usuario.value, strfoto: urlImagen };

    // IMPORTANTE
    if (!editando.value) {
      delete datos.id;
    }

    const res = editando.value
      ? await supabase.from("usuario").update(datos).eq("id", usuario.value.id)
      : await supabase.from("usuario").insert(datos);

    if (res.error) {
      console.error("Error DB:", res.error);
      return mostrarNotificacion("Error al guardar", "error");
    }

    mostrarNotificacion("Guardado correctamente");
    modal.value = false;
    cargarUsuarios();
  } catch (err) {
    console.error("Error general:", err);
    mostrarNotificacion("Error inesperado", "error");
  }
};

/* CARGAR */
const cargarPerfiles = async () => {
  const { data } = await supabase.from("perfil").select("*");
  perfiles.value = data || [];
};

const cargarUsuarios = async () => {
  const { data } = await supabase.from("usuario").select("*");
  usuarios.value = data || [];
  paginaActual.value = 1;
};

const cargarModulos = async () => {
  const { data } = await supabase.from("modulo").select("*");
  modulos.value = data || [];
};

/* FILTROS */
const usuariosFiltrados = computed(() => {
  return usuarios.value.filter((u) => {
    return (
      u.strnombreusuario
        .toLowerCase()
        .includes(filtroUsuario.value.toLowerCase()) &&
      (!filtroPerfil.value || u.idperfil == filtroPerfil.value) &&
      (!filtroEstado.value || u.idestadousuario == filtroEstado.value)
    );
  });
});

/* PAGINADO */
const usuariosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  totalPaginas.value = Math.ceil(usuariosFiltrados.value.length / porPagina);
  return usuariosFiltrados.value.slice(start, start + porPagina);
});

/* NUEVO */
const nuevo = () => {
  usuario.value = {
    id: null,
    strnombreusuario: "",
    idperfil: "",
    strpwd: "",
    idestadousuario: 1,
    strcorreo: "",
    strnumerocelular: "",
    strfoto: "",
  };
  preview.value = "";
  imagen.value = null;
  editando.value = false;
  modal.value = true;
};

/* EDITAR */
const editar = (u) => {
  usuario.value = { ...u };
  preview.value = u.strfoto;
  editando.value = true;
  modal.value = true;
};

/* ELIMINAR */
const eliminar = async (id) => {
  const result = await Swal.fire({
    title: "¿Eliminar usuario?",
    icon: "warning",
    showCancelButton: true,
  });

  if (!result.isConfirmed) return;

  await supabase.from("usuario").delete().eq("id", id);
  mostrarNotificacion("Eliminado");
  cargarUsuarios();
};

/* INIT */
onMounted(async () => {
  await init();
  await cargarModulos();

  console.log("Ruta actual:", route.path);
  console.log("Modulo encontrado:", moduloActual.value);

  if (!moduloActual.value) {
    console.warn("Módulo no encontrado");
    return;
  }

  if (!puedeConsultar(moduloActual.value.id)) {
    console.warn("No tiene permisos");
    return;
  }

  await cargarPerfiles();
  await cargarUsuarios();
});
</script>

<template>
  <div
    v-if="notificacion.mostrar"
    class="notificacion"
    :class="notificacion.tipo"
  >
    {{ notificacion.mensaje }}
  </div>

  <div class="container">
    <Breadcrumbs />

    <!-- SIN PERMISO -->
    <div v-if="!tienePermisoConsultar">
      <h3>No tienes permiso para consultar este módulo</h3>
    </div>

    <!-- CON PERMISO -->
    <div v-else>
      <h2>Usuario</h2>

      <!-- FILTROS + BOTONES -->
      <div class="filtros">
        <div class="filtros-izq">
          <input v-model="filtroUsuario" placeholder="Buscar Usuario" />

          <select v-model="filtroPerfil">
            <option value="">Perfil</option>
            <option v-for="p in perfiles" :key="p.id" :value="p.id">
              {{ p.strnombreperfil }}
            </option>
          </select>

          <select v-model="filtroEstado">
            <option value="">Estado</option>
            <option :value="1">Activo</option>
            <option :value="0">Inactivo</option>
          </select>

          <button @click="limpiar">Limpiar</button>
        </div>

        <!-- BOTONES -->
        <div class="filtros-der">
          <!-- NUEVO -->
          <button
            class="icon-btn nuevo"
            @click="nuevo"
            v-if="moduloActual && puedeAgregar(moduloActual.id)"
            title="Nuevo Usuario"
          >
            ➕
          </button>

          <!-- EXCEL -->
          <button
            class="icon-btn excel"
            @click="exportarExcel"
            v-if="moduloActual && puedeConsultar(moduloActual.id)"
            title="Exportar Excel"
          >
            📊
          </button>

          <!-- IMPRIMIR -->
          <button
            class="icon-btn imprimir"
            @click="imprimir"
            v-if="moduloActual && puedeConsultar(moduloActual.id)"
            title="Imprimir"
          >
            🖨️
          </button>
        </div>
      </div>

      <!-- TABLA -->
      <table>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Usuario</th>
            <th>Perfil</th>
            <th>Estado</th>
            <th>Correo</th>
            <th>Celular</th>
            <th>Editar</th>
            <th>Eliminar</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="u in usuariosPaginados" :key="u.id">
            <td>
              <img
                v-if="u.strfoto"
                :src="u.strfoto"
                width="50"
                style="border-radius: 50%"
              />
            </td>

            <td>{{ u.strnombreusuario }}</td>

            <td>
              {{ perfiles.find((p) => p.id === u.idperfil)?.strnombreperfil }}
            </td>

            <td>{{ u.idestadousuario === 1 ? "Activo" : "Inactivo" }}</td>

            <td>{{ u.strcorreo }}</td>

            <td>{{ u.strnumerocelular }}</td>

            <td>
              <button
                @click="editar(u)"
                v-if="moduloActual && puedeEditar(moduloActual.id)"
              >
                ✏️
              </button>
            </td>

            <td>
              <button
                @click="eliminar(u.id)"
                v-if="moduloActual && puedeEliminar(moduloActual.id)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINACIÓN -->
      <Pagination
        :paginaActual="paginaActual"
        :totalPaginas="totalPaginas"
        @cambiar="paginaActual = $event"
      />

      <!-- MODAL -->
      <div v-if="modal" class="modal">
        <div class="modal-body">
          <h3 v-if="!editando">Nuevo Usuario</h3>
          <h3 v-else>Editar Usuario</h3>

          <input
            v-model="usuario.strnombreusuario"
            placeholder="Nombre Usuario"
          />

          <select v-model="usuario.idperfil">
            <option value="">Seleccione Perfil</option>
            <option v-for="p in perfiles" :key="p.id" :value="p.id">
              {{ p.strnombreperfil }}
            </option>
          </select>

          <input v-model="usuario.strpwd" placeholder="Contraseña" />

          <select v-model="usuario.idestadousuario">
            <option :value="1">Activo</option>
            <option :value="0">Inactivo</option>
          </select>

          <input v-model="usuario.strcorreo" placeholder="Correo" />

          <input v-model="usuario.strnumerocelular" placeholder="Celular" />

          <input type="file" @change="seleccionarImagen" />

          <img
            v-if="preview"
            :src="preview"
            width="120"
            style="border-radius: 50%"
          />

          <div class="acciones">
            <button @click="guardar">Guardar</button>
            <button @click="modal = false">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 30px;
  background: #f5f7fb;
  min-height: 100vh;
}

h2 {
  margin-bottom: 20px;
  color: #1e3a5f;
}

.filtros {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.filtros input,
.filtros select {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

button {
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  transform: scale(1.05);
}

.filtros button:first-of-type {
  background: #1976d2;
  color: white;
}

.filtros button:last-of-type {
  background: #9e9e9e;
  color: white;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
}

th {
  background: #1e3a5f;
  color: white;
  padding: 12px;
}

td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  text-align: center;
}

td button:first-child {
  background: #ffc107;
}

td button:last-child {
  background: #e53935;
  color: white;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-body {
  background: white;
  padding: 30px;
  width: 420px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.acciones {
  display: flex;
  justify-content: space-between;
}

.notificacion {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 14px 22px;
  border-radius: 8px;
  color: white;
  font-weight: bold;
}

.success {
  background: #4caf50;
}

.error {
  background: #e53935;
}
.busqueda {
  display: flex;
  gap: 20px; /* espacio entre botón y input */
  flex-wrap: wrap; /* que se adapte a pantallas pequeñas */
  margin-bottom: 15px;
}

.busqueda input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  /* ocupa el resto del espacio disponible */
}
.filtros {
  display: flex;
  justify-content: space-between; /* separa izquierda y derecha */
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.filtros-izq {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filtros-der {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.filtros-der button {
  height: 42px; /* misma altura */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px; /* espacio entre icono y texto */
  font-weight: 600;
}
.icon-btn {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 18px;
  padding: 0;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}
.icon-btn.nuevo {
  background: #4caf50;
  color: white;
}
.icon-btn.excel {
  background: #2e7d32;
  color: white;
}
.icon-btn.imprimir {
  background: #1976d2;
  color: white;
}
</style>
