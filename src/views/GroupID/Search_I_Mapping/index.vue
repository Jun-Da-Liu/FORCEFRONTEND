<template>
  <div class="page-container search-i-mapping-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="Search">
          <el-input v-model="query.searchText" clearable :maxlength="200" :disabled="loading" />
        </el-form-item>
        <el-form-item label="Field">
          <el-select v-model="query.searchField" :disabled="loading" style="width: 140px">
            <el-option label="SkuNo" value="SkuNo" />
            <el-option label="PartNo" value="PN" />
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
            ToExcel
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
          empty-text="No I mappings found"
          @sort-change="handleSortChange"
        >
          <el-table-column type="index" label="ID" width="80" align="center" :index="rowNumber" />
          <el-table-column
            v-for="column in columns"
            :key="column"
            :prop="column"
            :label="columnLabel(column)"
            :min-width="column === 'ImportDateTime' ? 190 : 180"
            sortable="custom"
          >
            <template #default="{ row }">
              {{ column === "ImportDateTime" ? formatDateTime(row[column]) : row[column] }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="sortedRows.length"
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
import SearchIMappingAPI from "@/api/group-id/search-i-mapping";

defineOptions({ name: "SearchIMapping" });

const query = reactive({ searchField: "SkuNo", searchText: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const exporting = ref(false);
const errorMessage = ref("");
const sortState = reactive({ prop: "ImportDateTime", order: "descending" });
let lastRequest = null;

const sortedRows = computed(() => {
  const result = [...rows.value];
  const direction = sortState.order === "ascending" ? 1 : -1;
  return result.sort(
    (left, right) => compareValues(left[sortState.prop], right[sortState.prop]) * direction
  );
});

const pageRows = computed(() =>
  sortedRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
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
      ? await SearchIMappingAPI.search(payload)
      : await SearchIMappingAPI.getDefault();
    applyResult(result);
    lastRequest = payload ? { ...payload } : null;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load I mappings.";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load({ searchField: query.searchField, searchText: query.searchText.trim() });
}

function clearSearch() {
  Object.assign(query, { searchField: "SkuNo", searchText: "" });
}

function reload() {
  return load(lastRequest);
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "ImportDateTime";
  sortState.order = order || "descending";
  page.value = 1;
}

function compareValues(left, right) {
  if (left === right) return 0;
  if (left === null || left === undefined) return -1;
  if (right === null || right === undefined) return 1;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function rowNumber(index) {
  return (page.value - 1) * pageSize.value + index + 1;
}

function columnLabel(column) {
  if (column.toUpperCase() === "SKUNO") return "SkuNo";
  if (column.toUpperCase() === "PN") return "PartNo";
  if (column === "ImportDateTime") return "ImportDate";
  return column;
}

function formatDateTime(value) {
  return value
    ? String(value)
        .replace("T", " ")
        .replace(/\.\d+$/, "")
    : "";
}

async function exportExcel() {
  if (!rows.value.length || exporting.value) return;
  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("I Mapping");
    worksheet.columns = columns.value.map((column) => ({
      header: column,
      key: column,
      width: column === "ImportDateTime" ? 22 : 24,
    }));
    worksheet.addRows(
      sortedRows.value.map((row) =>
        Object.fromEntries(
          columns.value.map((column) => [
            column,
            column === "ImportDateTime" ? formatDateTime(row[column]) : (row[column] ?? ""),
          ])
        )
      )
    );
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "detail.xlsx");
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    console.error("Failed to export I mappings:", error);
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
