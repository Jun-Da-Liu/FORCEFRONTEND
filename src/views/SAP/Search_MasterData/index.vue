<template>
  <div class="page-container search-master-data-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="Search">
          <el-input v-model="query.searchText" clearable :maxlength="200" :disabled="loading" />
        </el-form-item>
        <el-form-item label="Field">
          <el-select v-model="query.searchField" :disabled="loading" style="width: 120px">
            <el-option label="PN" value="PN" />
            <el-option label="P" value="P" />
          </el-select>
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="clearSearch">Clear</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <span>{{ rowCount.toLocaleString() }} record{{ rowCount === 1 ? "" : "s" }}</span>
        <div>
          <el-button :disabled="loading" @click="reload">Reload</el-button>
          <el-button
            type="success"
            :loading="exporting"
            :disabled="loading || !rows.length"
            @click="exportExcel"
          >
            To Excel
          </el-button>
        </div>
      </div>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />

      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          :data="pageRows"
          border
          stripe
          empty-text="No master data found"
        >
          <el-table-column type="index" label="ID" width="72" align="center" :index="rowNumber" />
          <el-table-column
            v-for="column in columns"
            :key="column"
            :prop="column"
            :label="columnLabel(column)"
            :min-width="columnWidth(column)"
          >
            <template #default="{ row }">{{ displayValue(column, row[column]) }}</template>
          </el-table-column>
        </el-table>
      </div>

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
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchMasterDataAPI from "@/api/sap/search-master-data";

defineOptions({ name: "SearchMasterData" });

const query = reactive({ searchField: "PN", searchText: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const exporting = ref(false);
const errorMessage = ref("");
let lastRequest = null;

const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

async function load(payload = null) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = payload
      ? await SearchMasterDataAPI.search(payload)
      : await SearchMasterDataAPI.getDefault();
    applyResult(result);
    lastRequest = payload ? { ...payload } : null;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load SAP master data.";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load({ searchField: query.searchField, searchText: query.searchText.trim() });
}

function clearSearch() {
  Object.assign(query, { searchField: "PN", searchText: "" });
}

function reload() {
  return load(lastRequest);
}

function rowNumber(index) {
  return (page.value - 1) * pageSize.value + index + 1;
}

function columnLabel(column) {
  if (column === "Price") return "ZP01 Price";
  return column;
}

function columnWidth(column) {
  if (column === "Description") return 260;
  if (column === "ImportDateTime") return 190;
  return 125;
}

function displayValue(column, value) {
  if (value === null || value === undefined) return "";
  if (column === "Price") return formatNumber(value, 4);
  if (column === "NetWeightByUnit") return formatNumber(value, 3);
  if (column === "ImportDateTime") return formatDateTime(value);
  return value;
}

function formatNumber(value, digits) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : value;
}

function formatDateTime(value) {
  const text = String(value)
    .replace("T", " ")
    .replace(/\.\d+$/, "");
  return text.replace(/^(\d{4}-\d{2})-(\d{2})/, "$1:$2");
}

async function exportExcel() {
  if (!rows.value.length || exporting.value) return;
  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Master Data");
    worksheet.columns = columns.value.map((column) => ({
      header: column === "Price" ? "ZP01Price" : column,
      key: column,
      width: column === "Description" ? 36 : column === "ImportDateTime" ? 22 : 18,
    }));
    worksheet.addRows(rows.value);
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "detail.xlsx");
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    console.error("Failed to export SAP master data:", error);
    ElMessage.error("Unable to export the Excel file");
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

onMounted(() => load());
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
