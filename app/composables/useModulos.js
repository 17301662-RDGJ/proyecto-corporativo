import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import { usePermisos } from "~/composables/usePermisos";

const { modulos } = usePermisos();
export const useModulos = () => {

const supabase = useSupabaseClient();
const modulos = ref([]);

const cargarModulos = async () => {

const { data, error } = await supabase
.from("modulo")
.select("*")
.order("id");

if (error) {
console.error(error);
return;
}

modulos.value = data;

};

return {
modulos,
cargarModulos
};

};