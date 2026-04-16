<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { usePermisos } from "~/composables/usePermisos";

definePageMeta({
  middleware: ["auth", "permiso"],
});

const route = useRoute();
const { init, modulos, obtenerPermisosModulo } = usePermisos();
const cargando = ref(true);

// 1. Detectamos qué módulo es
const moduloDetectado = computed(() => {
  return modulos.value.find((m) => m.ruta === route.path);
});

// 2. Extraemos sus permisos
const permisosDelModulo = computed(() => {
  if (!moduloDetectado.value) {
    return { consultar: false, agregar: false, editar: false, eliminar: false, imprimir: false };
  }
  return obtenerPermisosModulo(moduloDetectado.value.id);
});

onMounted(async () => {
  const usr = process.client ? JSON.parse(localStorage.getItem("usuario")) : null;
  if (usr) {
    await init(usr); 
  }
  cargando.value = false;
});
</script>

<template>
  <div class="pagina-completa">
    
    <div class="container">
      <Breadcrumbs />

      <div v-if="cargando" class="msg-box">
        <p>Cargando módulo dinámico...</p>
      </div>

      <div v-else-if="!moduloDetectado" class="msg-box error">
        <h2>⚠️ Error 404</h2>
        <p>La ruta <b>{{ route.path }}</b> no está registrada en el sistema.</p>
      </div>

      <div v-else-if="!permisosDelModulo.consultar" class="msg-box error">
        <h2>🚫 Acceso Denegado</h2>
        <p>No tienes permiso para ver el módulo: <b>{{ moduloDetectado.strnombremodulo }}</b></p>
      </div>

      <div v-else>
        <h2>Módulo: {{ moduloDetectado.strnombremodulo }}</h2>
        <p class="subtitulo">Ruta dinámica: {{ route.path }}</p>

        <div class="toolbar">
          <button v-if="permisosDelModulo.agregar" class="btn nuevo">➕ Nuevo Registro</button>
          <button v-if="permisosDelModulo.imprimir" class="btn imprimir">🖨️ Imprimir</button>
        </div>

        <div class="contenedor-tabla">
          <table class="tabla-generica">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Información</th>
                <th v-if="permisosDelModulo.editar">Editar</th>
                <th v-if="permisosDelModulo.eliminar">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" class="vacio">
                  Módulo en construcción. Vista general automática activada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Estilos blindados */
.pagina-completa { width: 100%; min-height: 100vh; background: #f5f7fb; }
.container { padding: 30px; }
.msg-box { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-top: 20px; }
.error h2 { color: #d32f2f; margin-bottom: 10px; }
.subtitulo { color: #666; margin-bottom: 20px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 15px; }
.btn { border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; color: white; transition: 0.2s; }
.btn:hover { transform: scale(1.05); }
.nuevo { background: #4caf50; }
.imprimir { background: #1e88e5; }
.tabla-generica { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 3px 8px rgba(0,0,0,0.1); }
th { background: #1e3a5f; color: white; padding: 12px; }
td { padding: 15px; text-align: center; border-bottom: 1px solid #eee; }
.vacio { color: #888; font-style: italic; padding: 40px; }
</style>