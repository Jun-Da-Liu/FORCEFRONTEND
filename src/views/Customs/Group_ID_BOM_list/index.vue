<template>
  <div class="page-container group-id-bom-list-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16" align="bottom">
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="SKUNO">
              <el-input v-model="query.skuNo" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="Group ID">
              <el-input v-model="query.groupId" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :lg="8">
            <el-form-item>
              <el-button :disabled="loading" @click="handleReset">ReSet</el-button>
              <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
              <el-button :loading="exporting" :disabled="loading" @click="exportExcel">
                To Excel
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
      <el-table
        v-loading="loading"
        :data="pageRows"
        :row-class-name="rowClassName"
        border
        stripe
        empty-text="No records found"
      >
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="145"
        />
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
import GroupIdBomListAPI from "@/api/customs/group-id-bom-list";

defineOptions({ name: "GroupIdBomList" });

const query = reactive({ skuNo: "", groupId: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const excelRowLimitExceeded = ref(false);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const exporting = ref(false);
const errorMessage = ref("");
let lastRequest = { skuNo: "", groupId: "" };

const hiddenColumns = new Set(["pn", "changecolor"]);
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
  const labels = { groupid: "Group ID", unitsuttle: "UnitSuttle(KG)" };
  return labels[column.toLowerCase()] || column;
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  excelRowLimitExceeded.value = Boolean(result.excelRowLimitExceeded);
  page.value = 1;
}

function payload() {
  return {
    skuNo: query.skuNo.trim().replaceAll("'", ""),
    groupId: query.groupId.trim().replaceAll("'", ""),
  };
}

async function loadInitial() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await GroupIdBomListAPI.getInitial());
    lastRequest = { skuNo: "", groupId: "" };
  } catch (error) {
    errorMessage.value = error.message || "Unable to load Group ID BOM records.";
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  const request = payload();
  try {
    applyResult(await GroupIdBomListAPI.search(request));
    lastRequest = request;
  } catch (error) {
    errorMessage.value = error.message || "Unable to search Group ID BOM records.";
  } finally {
    loading.value = false;
  }
}

async function handleReset() {
  query.skuNo = "";
  query.groupId = "";
  await loadInitial();
}

function rowClassName({ row }) {
  return Number(value(row, "ChangeColor")) === 1 ? "change-color-row" : "";
}

async function exportExcel() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    if (excelRowLimitExceeded.value) {
      await ElMessageBox.confirm(
        "There are too many rows for the legacy Excel limit. Export the first 65535 rows?",
        "Excel row limit",
        { type: "warning", confirmButtonText: "Continue" }
      );
    }
    const result = await GroupIdBomListAPI.exportRows(lastRequest);
    const exportColumns = Array.isArray(result.columns) ? result.columns : [];
    const exportRows = Array.isArray(result.rows) ? result.rows : [];
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Group ID BOM list");
    worksheet.columns = exportColumns.map((column) => ({
      header: columnLabel(column),
      key: column,
      width: 22,
    }));
    worksheet.addRows(exportRows);
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "detail.xlsx");
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to export the Excel file.");
    }
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

onMounted(loadInitial);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}

.el-table :deep(.change-color-row) td.el-table__cell {
  background-color: yellow !important;
}
</style>
