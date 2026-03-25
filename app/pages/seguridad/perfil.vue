<script setup>
import { ref, onMounted, computed } from "vue";
import Swal from "sweetalert2";
import { useSupabaseClient } from "#imports";
import Pagination from "@/components/Pagination.vue";
import { usePermisos } from "~/composables/usePermisos";

// EXCEL
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const supabase = useSupabaseClient();

/* 🔐 PERMISOS */
const { permisos, init } = usePermisos();

/* DATA */
const perfiles = ref([]);
const modal = ref(false);
const editando = ref(false);
const filtroPerfil = ref("");

const perfil = ref({
  id: null,
  strnombreperfil: "",
  bitadministrador: false,
});

/* PAGINADO */
const paginaActual = ref(1);
const porPagina = 5;
const totalPaginas = ref(1);

/* NOTIFICACIONES */
const notificacion = ref({ mostrar: false, mensaje: "", tipo: "success" });

const mostrarNotificacion = (mensaje, tipo = "success") => {
  notificacion.value = { mostrar: true, mensaje, tipo };
  setTimeout(() => (notificacion.value.mostrar = false), 3000);
};

/* EXPORTAR EXCEL */
const exportarExcel = () => {
  if (!perfilesFiltrados.value.length) {
    mostrarNotificacion("No hay datos para exportar", "error");
    return;
  }

  const data = perfilesFiltrados.value.map((p) => ({
    "Nombre Perfil": p.strnombreperfil,
    Administrador: p.bitadministrador ? "Sí" : "No",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [{ wch: 30 }, { wch: 15 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Perfiles");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const fileData = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  const fecha = new Date().toISOString().split("T")[0];
  saveAs(fileData, `perfiles_${fecha}.xlsx`);

  mostrarNotificacion("Excel descargado correctamente");
};

/*Imprimir*/
const imprimir = () => {
  if (!perfilesFiltrados.value.length) {
    mostrarNotificacion("No hay datos para imprimir", "error");
    return;
  }

  const fecha = new Date().toLocaleString();

  // 🔥 Tabla limpia SIN botones
  const filas = perfilesFiltrados.value
    .map((p) => {
      const admin = p.bitadministrador ? "Sí" : "No";

      return `
        <tr>
          <td>${p.strnombreperfil}</td>
          <td>${admin}</td>
        </tr>
      `;
    })
    .join("");

  const tabla = `
    <table>
      <thead>
        <tr>
          <th>Nombre Perfil</th>
          <th>Administrador</th>
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
        <title>Reporte de Perfiles</title>
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

          <div class="titulo">Reporte de Perfiles</div>

          <div class="fecha">
            ${fecha}
          </div>
        </div>

        ${tabla}
      </body>
    </html>
  `);

  ventana.document.close();

  //  Esperar logo antes de imprimir
  const logo = ventana.document.getElementById("logo");

  logo.onload = () => {
    ventana.focus();
    ventana.print();
  };

  setTimeout(() => {
    ventana.focus();
    ventana.print();
  }, 800);
};
/* FILTRO */
const perfilesFiltrados = computed(() => {
  if (!filtroPerfil.value) return perfiles.value;

  return perfiles.value.filter((p) =>
    p.strnombreperfil.toLowerCase().includes(filtroPerfil.value.toLowerCase()),
  );
});

/* PAGINADO */
const perfilesPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  totalPaginas.value = Math.ceil(perfilesFiltrados.value.length / porPagina);
  return perfilesFiltrados.value.slice(start, start + porPagina);
});

/* CARGAR */
const cargarPerfiles = async () => {
  const { data, error } = await supabase.from("perfil").select("*").order("id");

  if (error) {
    console.log(error);
    mostrarNotificacion("Error al obtener perfiles", "error");
    return;
  }

  console.log("Perfiles BD:", data); // 🔥 DEBUG
  perfiles.value = data || [];
};

/* NUEVO */
const nuevo = () => {
  perfil.value = { id: null, strnombreperfil: "", bitadministrador: false };
  editando.value = false;
  modal.value = true;
};

/* EDITAR */
const editar = (p) => {
  perfil.value = { ...p };
  editando.value = true;
  modal.value = true;
};

/* VALIDAR */
const validarPerfil = () => {
  const nombre = perfil.value.strnombreperfil.trim();

  if (!nombre) {
    mostrarNotificacion("El nombre es obligatorio", "error");
    return false;
  }

  if (nombre.length < 3) {
    mostrarNotificacion("Mínimo 3 caracteres", "error");
    return false;
  }

  const duplicado = perfiles.value.find(
    (p) =>
      p.strnombreperfil.toLowerCase() === nombre.toLowerCase() &&
      p.id !== perfil.value.id,
  );

  if (duplicado) {
    mostrarNotificacion("El perfil ya existe", "error");
    return false;
  }

  return true;
};

/* GUARDAR */
const guardar = async () => {
  if (!validarPerfil()) return;

  let error;

  if (editando.value) {
    const res = await supabase
      .from("perfil")
      .update({
        strnombreperfil: perfil.value.strnombreperfil.trim(),
        bitadministrador: perfil.value.bitadministrador,
      })
      .eq("id", perfil.value.id);

    error = res.error;
  } else {
    const res = await supabase.from("perfil").insert({
      strnombreperfil: perfil.value.strnombreperfil.trim(),
      bitadministrador: perfil.value.bitadministrador,
    });

    error = res.error;
  }

  if (error) {
    console.log(error);
    mostrarNotificacion("Error al guardar", "error");
    return;
  }

  mostrarNotificacion("Guardado correctamente");
  modal.value = false;
  cargarPerfiles();
};

/* ELIMINAR */
const eliminar = async (id) => {
  const result = await Swal.fire({
    title: "¿Eliminar Perfil?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
  });

  if (!result.isConfirmed) return;

  const { error } = await supabase.from("perfil").delete().eq("id", id);

  if (error) {
    mostrarNotificacion("Error al eliminar", "error");
    return;
  }

  mostrarNotificacion("Eliminado correctamente");
  cargarPerfiles();
};

/* INIT */
onMounted(async () => {
  await init();
  await cargarPerfiles(); // YA SIEMPRE SE EJECUTA
});
</script>

<template>
  <div v-if="notificacion.mostrar" :class="['notificacion', notificacion.tipo]">
    {{ notificacion.mensaje }}
  </div>

  <div class="container">
    <Breadcrumbs />

    <h2>Perfil</h2>

    <!-- FILTRO + BOTONES -->
    <div class="filtros-container">
      <!-- IZQUIERDA -->
      <div class="filtros-izquierda">
        <input v-model="filtroPerfil" placeholder="Buscar perfil..." />
      </div>

      <!-- DERECHA -->
      <div class="acciones-derecha">
        <button class="btn-icon nuevo" @click="nuevo" title="Nuevo">➕</button>
        <button class="btn-icon imprimir" @click="imprimir" title="Imprimir">
          🖨️
        </button>
        <button class="btn-icon excel" @click="exportarExcel" title="Exportar">
          📊
        </button>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nombre Perfil</th>
          <th>Administrador</th>
          <th>Editar</th>
          <th>Eliminar</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in perfilesPaginados" :key="p.id">
          <td>{{ p.strnombreperfil }}</td>
          <td>
            <span v-if="p.bitadministrador">Sí</span>
            <span v-else>No</span>
          </td>
          <td><button @click="editar(p)">✏️</button></td>
          <td><button @click="eliminar(p.id)">🗑️</button></td>
        </tr>
      </tbody>
    </table>

    <Pagination
      :paginaActual="paginaActual"
      :totalPaginas="totalPaginas"
      @cambiar="paginaActual = $event"
    />

    <!-- MODAL -->
    <div v-if="modal" class="modal">
      <div class="modal-body">
        <h3 v-if="!editando">Nuevo Perfil</h3>
        <h3 v-else>Editar Perfil</h3>

        <input
          v-model="perfil.strnombreperfil"
          placeholder="Nombre del perfil"
        />

        <label>
          <input type="checkbox" v-model="perfil.bitadministrador" />
          Administrador
        </label>

        <div class="acciones">
          <button @click="guardar">Guardar</button>
          <button @click="modal = false">Cancelar</button>
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

button {
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  transform: scale(1.05);
}

.nuevo {
  background: #4caf50;
  color: white;
  padding: 10px 18px;
  margin-bottom: 15px;
  font-weight: bold;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
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

tr:hover {
  background: #f2f6ff;
}

td button:first-child {
  background: #ffc107;
}

td button:last-child {
  background: #e53935;
  color: white;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-body {
  background: white;
  padding: 30px;
  width: 380px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-body h3 {
  text-align: center;
}

.modal-body input {
  padding: 9px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.acciones {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.acciones button:first-child {
  background: #4caf50;
  color: white;
}

.acciones button:last-child {
  background: #e53935;
  color: white;
}

/* NOTIFICACIONES */

.notificacion {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 14px 22px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 999;
  animation: fadein 0.3s;
}

.success {
  background: #4caf50;
}

.error {
  background: #e53935;
}

@keyframes fadein {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 700px) {
  table {
    font-size: 14px;
  }

  .modal-body {
    width: 90%;
  }
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
.excel {
  background: #2e7d32;
  color: white;
  padding: 10px 18px;
  border-radius: 6px;
  margin-left: 10px;
}
/* CONTENEDOR GENERAL */
.filtros-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

/* IZQUIERDA */
.filtros-izquierda {
  flex: 1;
}

.filtros-izquierda input {
  width: 100%;
  max-width: 300px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

/* DERECHA */
.acciones-derecha {
  display: flex;
  gap: 10px;
}

/* BOTONES ICONO */
.btn-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  color: white;
  transition: 0.2s;
}

.btn-icon:hover {
  transform: scale(1.1);
}

/* COLORES */
.nuevo {
  background: #4caf50;
}

.excel {
  background: #2e7d32;
}
.imprimir {
  background: #1976d2;
}
</style>
