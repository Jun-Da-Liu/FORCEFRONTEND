<template>
  <div class="page-container warehouse-code-mapping-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="form" label-position="top" @submit.prevent="handleAdd">
        <el-row :gutter="16" align="bottom">
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="SAP Warehouse Code">
              <el-input v-model="form.sapWarehouseCode" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="HFJ Warehouse Code">
              <el-input v-model="form.hfjWarehouseCode" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="4" :lg="8">
            <el-form-item>
              <el-button native-type="submit" type="primary" :loading="saving" :disabled="loading">
                Add
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ rowCount.toLocaleString() }} records</div>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No records found">
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="150"
        >
          <template #default="scope">
            {{ displayValue(scope.row, column) }}
          </template>
        </el-table-column>
        <el-table-column label="Edit" width="90" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openEdit(scope.row)">Edit</el-button>
          </template>
        </el-table-column>
        <el-table-column label="Del" width="90" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="danger" @click="handleDelete(scope.row)">Del</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="rows.length"
        :page-sizes="[20]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>

    <el-dialog
      v-model="editVisible"
      title="Edit Warehouse Code Mapping"
      width="520px"
      destroy-on-close
    >
      <el-form label-position="top" @submit.prevent="handleUpdate">
        <el-form-item label="SAP Warehouse Code">
          <el-input v-model="editForm.sapWarehouseCode" :maxlength="20" />
        </el-form-item>
        <el-form-item label="HFJ Warehouse Code">
          <el-input v-model="editForm.hfjWarehouseCode" :maxlength="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="editVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="handleUpdate">OK</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import WarehouseCodeMappingAPI from "@/api/report-search/warehouse-code-mapping";

defineOptions({ name: "WarehouseCodeMapping" });

const form = reactive({ sapWarehouseCode: "", hfjWarehouseCode: "" });
const editForm = reactive({ id: 0, sapWarehouseCode: "", hfjWarehouseCode: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);
const editVisible = ref(false);
const errorMessage = ref("");

const hiddenColumns = new Set(["id"]);
const visibleColumns = computed(() =>
  columns.value.filter((column) => !hiddenColumns.has(column.toLowerCase()))
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  const labels = {
    row_no: "No",
    sapwarehousecode: "SAP Warehouse Code",
    hfjwarehousecode: "HFJ Warehouse Code",
    importdatetime: "Import Date",
  };
  return labels[column.toLowerCase()] || column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (column.toLowerCase() !== "importdatetime" || !result) return result ?? "";
  const date = new Date(result);
  if (Number.isNaN(date.getTime())) return result;
  return date.toISOString().slice(0, 10);
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await WarehouseCodeMappingAPI.getAll());
  } catch (error) {
    errorMessage.value = error.message || "Unable to load warehouse-code mappings.";
  } finally {
    loading.value = false;
  }
}

function normalize(value) {
  return value.trim().replaceAll("'", "");
}

function validate(sapWarehouseCode, hfjWarehouseCode) {
  const payload = {
    sapWarehouseCode: normalize(sapWarehouseCode),
    hfjWarehouseCode: normalize(hfjWarehouseCode),
  };
  if (!payload.sapWarehouseCode || !payload.hfjWarehouseCode) {
    ElMessage.warning("SAP Warehouse Code and HFJ Warehouse Code cannot be empty.");
    return null;
  }
  return payload;
}

async function handleAdd() {
  if (saving.value) return;
  const payload = validate(form.sapWarehouseCode, form.hfjWarehouseCode);
  if (!payload) return;
  saving.value = true;
  try {
    await WarehouseCodeMappingAPI.create(payload);
    ElMessage.success("Successfully saved!");
    form.sapWarehouseCode = "";
    form.hfjWarehouseCode = "";
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to save the warehouse-code mapping.");
  } finally {
    saving.value = false;
  }
}

function openEdit(row) {
  editForm.id = Number(value(row, "ID"));
  editForm.sapWarehouseCode = String(value(row, "SAPWarehouseCode") ?? "");
  editForm.hfjWarehouseCode = String(value(row, "HFJWarehouseCode") ?? "");
  editVisible.value = editForm.id > 0;
}

async function handleUpdate() {
  if (saving.value || editForm.id <= 0) return;
  const payload = validate(editForm.sapWarehouseCode, editForm.hfjWarehouseCode);
  if (!payload) return;
  saving.value = true;
  try {
    await WarehouseCodeMappingAPI.update(editForm.id, payload);
    ElMessage.success("Successfully modified!");
    editVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to modify the warehouse-code mapping.");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  const id = Number(value(row, "ID"));
  const sapWarehouseCode = String(value(row, "SAPWarehouseCode") ?? "");
  if (id <= 0) return;
  try {
    await ElMessageBox.confirm(
      `Confirm to delete SAP Warehouse Code [${sapWarehouseCode}] mapping?`,
      "Delete confirmation",
      { type: "warning", confirmButtonText: "Delete" }
    );
    await WarehouseCodeMappingAPI.remove(id);
    ElMessage.success("Successfully deleted!");
    await load();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the warehouse-code mapping.");
    }
  }
}

onMounted(load);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
