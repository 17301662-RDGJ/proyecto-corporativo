<script setup>
import { ref, onMounted, computed } from "vue";
import Swal from "sweetalert2";
import { useSupabaseClient } from "#imports";
import Pagination from "@/components/Pagination.vue";
import { usePermisos } from "~/composables/usePermisos";
import { useRoute } from "vue-router";

// EXCEL
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const client = useSupabaseClient();
const route = useRoute();

/* 🔐 PERMISOS */
//const { init, validarRuta, cargarPermisos } = usePermisos();
const { init, puedeConsultarRuta } = usePermisos();
/* DATA */
const modulos = ref([]);
const modal = ref(false);
const editando = ref(false);
const filtroModulo = ref("");

const modulo = ref({
  id: null,
  strnombremodulo: "",
  tipo: "menu",
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
  if (!modulosFiltrados.value.length) {
    mostrarNotificacion("No hay datos para exportar", "error");
    return;
  }

  const data = modulosFiltrados.value.map((m) => ({
    Nombre: m.strnombremodulo,
    Ruta: m.ruta || "",
    Tipo: m.tipo || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Modulos");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const fileData = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  const fecha = new Date().toISOString().split("T")[0];
  saveAs(fileData, `modulos_${fecha}.xlsx`);

  mostrarNotificacion("Excel descargado correctamente");
};

/* 🖨️ IMPRIMIR */
const imprimir = () => {
  if (!modulosFiltrados.value.length) {
    mostrarNotificacion("No hay datos para imprimir", "error");
    return;
  }

  const fecha = new Date().toLocaleString();

  // Filas limpias (SIN botones)
  const filas = modulosFiltrados.value
    .map((m) => {
      return `
        <tr>
          <td>${m.strnombremodulo}</td>
        </tr>
      `;
    })
    .join("");

  const tabla = `
    <table>
      <thead>
        <tr>
          <th>Nombre del Módulo</th>
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
        <title>Reporte de Módulos</title>
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

          <div class="titulo">Reporte de Módulos</div>

          <div class="fecha">
            ${fecha}
          </div>
        </div>

        ${tabla}
      </body>
    </html>
  `);

  ventana.document.close();

  // Esperar a que cargue el logo
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

/* GENERAR RUTA */
const generarRuta = (nombre) => {
  const limpio = nombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");

  return `/seguridad/dynamic/${limpio}`;
};

/* FILTRO = CONSULTAR */
const modulosFiltrados = computed(() => {
  if (!filtroModulo.value) return modulos.value;

  return modulos.value.filter((m) =>
    m.strnombremodulo.toLowerCase().includes(filtroModulo.value.toLowerCase()),
  );
});

/* PAGINADO */
const modulosPaginados = computed(() => {
  const start = (paginaActual.value - 1) * porPagina;
  totalPaginas.value = Math.ceil(modulosFiltrados.value.length / porPagina);
  return modulosFiltrados.value.slice(start, start + porPagina);
});

/* CARGAR */
const obtenerModulos = async () => {
  const { data, error } = await client.from("modulo").select("*").order("id");

  if (error) {
    console.log(error);
    mostrarNotificacion("Error al obtener módulos", "error");
    return;
  }

  modulos.value = data || [];
};

/* NUEVO */
const nuevo = () => {
  modulo.value = { id: null, strnombremodulo: "", tipo: "menu" };
  editando.value = false;
  modal.value = true;
};

/* EDITAR */
const editar = (m) => {
  modulo.value = { ...m };
  editando.value = true;
  modal.value = true;
};

/* VALIDAR */
const validarModulo = () => {
  const nombre = modulo.value.strnombremodulo.trim();

  if (!nombre) {
    mostrarNotificacion("El nombre es obligatorio", "error");
    return false;
  }

  if (nombre.length < 3) {
    mostrarNotificacion("Mínimo 3 caracteres", "error");
    return false;
  }

  const duplicado = modulos.value.find(
    (m) =>
      m.strnombremodulo.toLowerCase() === nombre.toLowerCase() &&
      m.id !== modulo.value.id,
  );

  if (duplicado) {
    mostrarNotificacion("El módulo ya existe", "error");
    return false;
  }

  return true;
};

/* GUARDAR */
const guardar = async () => {
  if (!validarModulo()) return;

  let error;
  const nombre = modulo.value.strnombremodulo.trim();
  const ruta = generarRuta(nombre);

  if (editando.value) {
    const res = await client
      .from("modulo")
      .update({ strnombremodulo: nombre, ruta })
      .eq("id", modulo.value.id);

    error = res.error;
  } else {
    const res = await client.from("modulo").insert({
      strnombremodulo: nombre,
      ruta,
    });

    error = res.error;
  }

  if (error) {
    mostrarNotificacion("Error al guardar", "error");
    return;
  }

  mostrarNotificacion("Guardado correctamente");
  modal.value = false;
  await obtenerModulos();
};

/* ELIMINAR */
const eliminar = async (id) => {
  const result = await Swal.fire({
    title: "¿Eliminar Módulo?",
    icon: "warning",
    showCancelButton: true,
  });

  if (!result.isConfirmed) return;

  // BORRAR RELACIONES PRIMERO
  await client
    .from("permisos_perfil")
    .delete()
    .eq("idmodulo", id); // <-- ajusta el nombre del campo

  // AHORA SÍ BORRAR MÓDULO
  const { error } = await client
    .from("modulo")
    .delete()
    .eq("id", id);

  if (error) {
    console.log("ERROR ELIMINAR:", error);
    mostrarNotificacion(error.message || "No se pudo eliminar", "error");
    return;
  }

  mostrarNotificacion("Eliminado correctamente");
  await obtenerModulos();
};

/* INIT */
onMounted(async () => {
  const usr = process.client ? JSON.parse(localStorage.getItem("usuario")) : null;
  
  if (usr) {
    // 1. Cargamos permisos y módulos al mismo tiempo para no perder tiempo
    await init(usr); 

    // 2. Cargamos los datos de la tabla INMEDIATAMENTE
    // No esperes a la validación para traer los datos, 
    // tráelos y luego decides si lo sacas de la página.
    await obtenerModulos();

    // 3. Ahora sí validamos la seguridad
    if (!puedeConsultarRuta.value) {
      mostrarNotificacion("Acceso denegado", "error");
      setTimeout(() => {
        useRouter().push("/dashboard");
      }, 1500);
      return;
    }
  } else {
    window.location.href = "/login";
  }
});
</script>

<template>
  <div v-if="notificacion.mostrar" :class="['notificacion', notificacion.tipo]">
    {{ notificacion.mensaje }}
  </div>

  <div class="container">
    <Breadcrumbs pagina="Modulo" />
    <h2>Módulo</h2>

    <!-- FILTRO + BOTONES -->
    <div class="filtros">
      <div class="filtros-izq">
        <input v-model="filtroModulo" placeholder="Buscar módulo..." />
      </div>

      <div class="filtros-der">
        <button class="btn nuevo" @click="nuevo">➕ Nuevo</button>
        <button class="btn imprimir" @click="imprimir">🖨️ Imprimir</button>
        <button class="btn excel" @click="exportarExcel">📊 Excel</button>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Editar</th>
          <th>Eliminar</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="m in modulosPaginados" :key="m.id">
          <td>{{ m.strnombremodulo }}</td>
          <td>
            <button class="btn editar" @click="editar(m)">✏️</button>
          </td>
          <td>
            <button class="btn eliminar" @click="eliminar(m.id)">🗑️</button>
          </td>
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
        <h3>{{ editando ? "Editar" : "Nuevo" }} Módulo</h3>

        <input v-model="modulo.strnombremodulo" placeholder="Nombre módulo" />

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

/* FILTRO */
.filtros {
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.filtros input {
  width: 300px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
/* TABLA */
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th {
  background: #1e3a5f;
  color: white;
  padding: 10px;
}

td {
  padding: 10px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

/* BOTONES */
.acciones-tabla {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn.nuevo {
  background: #4caf50;
  color: white;
}

.btn.imprimir {
  background: #1976d2;
  color: white;
}

.btn.excel {
  background: #2e7d32;
  color: white;
}

.btn.editar {
  background: #ffc107;
}

.btn.eliminar {
  background: #e53935;
  color: white;
}

/* MODAL */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-body {
  background: white;
  padding: 25px;
  width: 350px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acciones {
  display: flex;
  justify-content: space-between;
}

/* NOTIFICACIONES */
.notificacion {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 14px 22px;
  border-radius: 8px;
  color: white;
}

.success {
  background: #4caf50;
}

.error {
  background: #e53935;
}
.filtros {
  display: flex;
  justify-content: space-between;
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
}

.filtros input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.filtros-der {
  display: flex;
  gap: 10px;
}
</style>
