<template>
  <div class="page-container force-ignore-part-no-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="form" label-position="top" @submit.prevent="handleAdd">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="PartNo">
              <el-input v-model="form.pn" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item label="ExcludePN">
              <el-input v-model="form.excludePn" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :lg="10">
            <el-form-item label="Description">
              <el-input v-model="form.description" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="saving">Add</el-button>
          <el-button :disabled="saving" @click="clearForm">Clear</el-button>
          <el-button :loading="exporting" :disabled="loading || !rows.length" @click="exportExcel">
            ToExcel
          </el-button>
        </el-form-item>
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
          v-for="column in columns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="145"
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
        :page-sizes="[9999]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>

    <el-dialog v-model="editVisible" title="Edit Ignore PartNo" width="560px" destroy-on-close>
      <el-form label-position="top" @submit.prevent="handleUpdate">
        <el-form-item label="PN">
          <el-input v-model="editForm.pn" disabled />
        </el-form-item>
        <el-form-item label="ExcludePN">
          <el-input v-model="editForm.excludePn" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
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
import ForceIgnorePartNoAPI from "@/api/group-id/force-ignore-part-no";

defineOptions({ name: "ForceIgnorePartNo" });

const form = reactive({ pn: "55-%", excludePn: "55-1014-01,55-1015-01", description: "" });
const editForm = reactive({ id: 0, pn: "", excludePn: "", description: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(9999);
const loading = ref(false);
const saving = ref(false);
const exporting = ref(false);
const editVisible = ref(false);
const errorMessage = ref("");

const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function displayValue(row, column) {
  const result = value(row, column);
  if (column.toLowerCase() !== "importdatetime" || !result) return result ?? "";
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toISOString().slice(0, 10);
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

function normalizeIdentifier(text) {
  return text.trim().replaceAll("'", "");
}

function payload(source) {
  return {
    pn: normalizeIdentifier(source.pn),
    excludePn: normalizeIdentifier(source.excludePn),
    description: source.description.trim(),
  };
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await ForceIgnorePartNoAPI.getAll());
  } catch (error) {
    errorMessage.value = error.message || "Unable to load ignored PartNo records.";
  } finally {
    loading.value = false;
  }
}

function clearForm() {
  form.pn = "";
  form.excludePn = "";
  form.description = "";
}

async function handleAdd() {
  if (saving.value) return;
  const request = payload(form);
  if (!request.pn) {
    ElMessage.warning("Please enter PartNo.");
    return;
  }
  saving.value = true;
  try {
    await ForceIgnorePartNoAPI.create(request);
    ElMessage.success("Successfully saved!");
    clearForm();
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to save the ignored PartNo record.");
  } finally {
    saving.value = false;
  }
}

function openEdit(row) {
  editForm.id = Number(value(row, "ID"));
  editForm.pn = String(value(row, "PN") ?? "");
  editForm.excludePn = String(value(row, "ExcludePN") ?? "");
  editForm.description = String(value(row, "Description") ?? "");
  editVisible.value = editForm.id > 0;
}

async function handleUpdate() {
  if (saving.value || editForm.id <= 0) return;
  saving.value = true;
  try {
    await ForceIgnorePartNoAPI.update(editForm.id, payload(editForm));
    ElMessage.success("Successfully modified!");
    editVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to modify the ignored PartNo record.");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  const id = Number(value(row, "ID"));
  const pn = String(value(row, "PN") ?? "");
  if (id <= 0) return;
  try {
    await ElMessageBox.confirm(`Confirm to delete PN [${pn}] record?`, "Delete confirmation", {
      type: "warning",
      confirmButtonText: "Delete",
    });
    await ForceIgnorePartNoAPI.remove(id);
    ElMessage.success("Successfully deleted!");
    await load();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the ignored PartNo record.");
    }
  }
}

async function exportExcel() {
  if (!rows.value.length || exporting.value) return;
  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ignored PartNo");
    worksheet.columns = columns.value.map((column) => ({ header: column, key: column, width: 22 }));
    worksheet.addRows(rows.value);
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "detail.xlsx");
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    ElMessage.error(error.message || "Unable to export the Excel file.");
  } finally {
    exporting.value = false;
  }
}

function saveWorkbook(buffer, fileName) {
  const type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const url = window.URL.createObjectURL(new Blob([buffer], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

onMounted(load);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
