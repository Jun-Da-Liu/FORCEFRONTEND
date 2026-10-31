<template>
  <div class="page-container volume-no-mapping-page">
    <el-collapse v-model="activeSections" class="master-collapse">
      <el-collapse-item title="Master Data Maintenance" name="master">
        <el-row :gutter="16">
          <el-col v-for="section in sections" :key="section.key" :xs="24" :lg="8">
            <el-card shadow="never" class="master-card">
              <template #header>{{ section.title }}</template>
              <el-form label-position="top" @submit.prevent="save(section.key)">
                <el-form-item v-for="field in section.fields" :key="field.key" :label="field.label">
                  <el-select
                    v-if="field.key === 'corporation' && section.key !== 'corporations'"
                    v-model="forms[section.key][field.key]"
                    filterable
                    clearable
                    class="full-width"
                  >
                    <el-option
                      v-for="item in corporationOptions"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                  <el-input v-else v-model="forms[section.key][field.key]" clearable />
                </el-form-item>
                <el-button native-type="submit" type="primary" :loading="saving">Add</el-button>
              </el-form>
              <dynamic-table
                :table="data[section.tableKey]"
                :loading="loading"
                :delete-entity="section.key"
                @delete="remove"
              />
            </el-card>
          </el-col>
        </el-row>
      </el-collapse-item>
    </el-collapse>

    <el-card shadow="never" class="mapping-card">
      <template #header>VolumeNo Mapping</template>
      <dynamic-table :table="data.mappings" :loading="loading" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from "vue";
import { ElButton, ElMessage, ElMessageBox, ElTable, ElTableColumn } from "element-plus";
import VolumeNoMappingAPI from "@/api/group-id/volume-no-mapping";

defineOptions({ name: "VolumeNoMapping" });

const emptyTable = () => ({ columns: [], rows: [], rowCount: 0 });
const loading = ref(false);
const saving = ref(false);
const activeSections = ref([]);
const data = reactive({
  corporations: emptyTable(),
  volumes: emptyTable(),
  businessUnits: emptyTable(),
  mappings: emptyTable(),
});
const forms = reactive({
  corporations: { corporation: "" },
  volumes: { volumeNo: "", corporation: "" },
  "business-units": { businessUnit: "", corporation: "", customsCode: "" },
});
const sections = [
  {
    key: "corporations",
    title: "Corporation",
    tableKey: "corporations",
    fields: [{ key: "corporation", label: "Corporation" }],
  },
  {
    key: "volumes",
    title: "VolumeNo",
    tableKey: "volumes",
    fields: [
      { key: "volumeNo", label: "VolumeNo" },
      { key: "corporation", label: "Corporation" },
    ],
  },
  {
    key: "business-units",
    title: "Business Unit",
    tableKey: "businessUnits",
    fields: [
      { key: "businessUnit", label: "BU" },
      { key: "corporation", label: "Corporation" },
      { key: "customsCode", label: "CustomsCode" },
    ],
  },
];

function getValue(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

const corporationOptions = computed(() =>
  data.corporations.rows.map((row) => String(getValue(row, "Corporation"))).filter(Boolean)
);

const DynamicTable = defineComponent({
  name: "DynamicTable",
  props: {
    table: { type: Object, required: true },
    loading: Boolean,
    deleteEntity: { type: String, default: "" },
  },
  emits: ["delete"],
  setup(props, { emit }) {
    return () =>
      h(
        ElTable,
        {
          data: props.table.rows,
          border: true,
          stripe: true,
          loading: props.loading,
          class: "data-table",
        },
        () => [
          ...props.table.columns
            .filter((column) => column.toLowerCase() !== "id")
            .map((column) =>
              h(ElTableColumn, { key: column, prop: column, label: column, minWidth: 120 })
            ),
          ...(props.deleteEntity
            ? [
                h(
                  ElTableColumn,
                  { label: "Del", width: 72, fixed: "right", align: "center" },
                  {
                    default: ({ row }) =>
                      h(
                        ElButton,
                        {
                          link: true,
                          type: "danger",
                          onClick: () => emit("delete", props.deleteEntity, row),
                        },
                        () => "Del"
                      ),
                  }
                ),
              ]
            : []),
        ]
      );
  },
});

async function load() {
  loading.value = true;
  try {
    const result = await VolumeNoMappingAPI.getAll();
    Object.assign(data, result);
  } catch (error) {
    ElMessage.error(error.message || "Unable to load VolumeNo mappings.");
  } finally {
    loading.value = false;
  }
}

function normalize(value) {
  return String(value || "")
    .trim()
    .replaceAll("'", "");
}

async function save(entity) {
  if (saving.value) return;
  const source = forms[entity];
  const payload = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, normalize(value)])
  );
  const required = Object.values(payload);
  if (required.some((value) => !value)) {
    ElMessage.warning("Please complete all required fields.");
    return;
  }
  saving.value = true;
  try {
    if (entity === "corporations") await VolumeNoMappingAPI.createCorporation(payload);
    if (entity === "volumes") await VolumeNoMappingAPI.createVolume(payload);
    if (entity === "business-units") await VolumeNoMappingAPI.createBusinessUnit(payload);
    Object.keys(source).forEach((key) => (source[key] = ""));
    ElMessage.success("Saved OK!");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to save the record.");
  } finally {
    saving.value = false;
  }
}

async function remove(entity, row) {
  const id = Number(getValue(row, "ID"));
  if (!id) return;
  try {
    await ElMessageBox.confirm(
      "Are you sure you want to delete this record?",
      "Delete confirmation",
      {
        type: "warning",
        confirmButtonText: "Delete",
      }
    );
    await VolumeNoMappingAPI.remove(entity, id);
    ElMessage.success("Deleted OK!");
    await load();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the record.");
    }
  }
}

onMounted(load);
</script>

<style scoped>
.master-collapse,
.mapping-card {
  margin-bottom: 16px;
}
.master-card {
  margin-bottom: 12px;
}
.full-width {
  width: 100%;
}
.data-table {
  margin-top: 16px;
}
</style>
