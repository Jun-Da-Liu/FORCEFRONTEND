<template>
  <div class="page-container hfj-aop-pn-mapping-page">
    <el-alert
      title="OriginalPN and UpdatedPN are case sensitive."
      type="warning"
      :closable="false"
      show-icon
      class="case-alert"
    />

    <el-card class="page-search" shadow="never">
      <el-form :model="form" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16" align="bottom">
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="OriginalPN">
              <el-input v-model="form.originalPn" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="UpdatedPN">
              <el-input v-model="form.updatedPn" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :lg="8">
            <el-form-item>
              <el-button native-type="submit" :loading="loading">Search</el-button>
              <el-button
                :loading="exporting"
                :disabled="loading || !rows.length"
                @click="exportExcel"
              >
                Toexcel
              </el-button>
              <el-button type="primary" :loading="saving" :disabled="loading" @click="handleAdd">
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
          v-for="column in columns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="155"
        >
          <template #default="scope">
            {{ displayValue(scope.row, column) }}
          </template>
        </el-table-column>
        <el-table-column label="Delete" width="100" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="danger" @click="handleDelete(scope.row)">Delete</el-button>
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import HfjAopPnMappingAPI from "@/api/fuyu/hfj-aop-pn-mapping";

defineOptions({ name: "HfjAopPnMapping" });

const form = reactive({ originalPn: "", updatedPn: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);
const exporting = ref(false);
const errorMessage = ref("");
let exportColumns = [];
let exportRows = [];

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
  return Number.isNaN(date.getTime()) ? result : date.toISOString().replace("T", " ").slice(0, 19);
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  exportColumns = [...columns.value];
  exportRows = [...rows.value];
  page.value = 1;
}

function payload() {
  return { originalPn: form.originalPn.trim(), updatedPn: form.updatedPn.trim() };
}

function reset() {
  form.originalPn = "";
  form.updatedPn = "";
}

async function loadAll() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await HfjAopPnMappingAPI.getAll());
  } catch (error) {
    errorMessage.value = error.message || "Unable to load PN mappings.";
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await HfjAopPnMappingAPI.search(payload()));
    reset();
  } catch (error) {
    errorMessage.value = error.message || "Unable to search PN mappings.";
  } finally {
    loading.value = false;
  }
}

async function handleAdd() {
  if (saving.value) return;
  const request = payload();
  if (!request.originalPn) {
    ElMessage.warning("Please input OriginalPN!");
    return;
  }
  if (!request.updatedPn) {
    ElMessage.warning("Please input UpdatedPN!");
    return;
  }
  saving.value = true;
  try {
    await HfjAopPnMappingAPI.create(request);
    ElMessage.success("Import Successfully!");
    reset();
    await loadAll();
  } catch (error) {
    ElMessage.error(error.message || "Unable to add the PN mapping.");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  const request = {
    originalPn: String(value(row, "OriginalPN") ?? ""),
    updatedPn: String(value(row, "UpdatedPN") ?? ""),
  };
  try {
    await ElMessageBox.confirm(
      `Do you confirm deleting OriginalPN [${request.originalPn}]?`,
      "Delete confirmation",
      { type: "warning", confirmButtonText: "Delete" }
    );
    await HfjAopPnMappingAPI.remove(request);
    ElMessage.success("Delete Successfully!");
    await loadAll();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the PN mapping.");
    }
  }
}

async function exportExcel() {
  if (!exportRows.length || exporting.value) return;
  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("HFJ AOP PN Mapping");
    worksheet.columns = exportColumns.map((column) => ({ header: column, key: column, width: 22 }));
    worksheet.addRows(exportRows);
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

onMounted(loadAll);
</script>

<style scoped>
.case-alert,
.page-toolbar {
  margin-bottom: 12px;
}
</style>
