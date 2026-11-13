<template>
  <div class="page-container search-auto-commit-price-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="SureTimeFrom">
              <el-date-picker v-model="query.sureTimeFrom" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="SureTimeTo">
              <el-date-picker v-model="query.sureTimeTo" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="GroupID">
              <el-input v-model="query.groupId" :maxlength="200" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="ImportTimeFrom">
              <el-date-picker
                v-model="query.importTimeFrom"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="ImportTimeTo">
              <el-date-picker v-model="query.importTimeTo" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
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
          min-width="150"
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
import SearchAutoCommitPriceAPI from "@/api/report-search/search-auto-commit-price";

defineOptions({ name: "SearchAutoCommitPrice" });

const query = reactive({
  sureTimeFrom: "",
  sureTimeTo: "",
  groupId: "",
  importTimeFrom: "",
  importTimeTo: "",
});
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const excelRowLimitExceeded = ref(false);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const exporting = ref(false);
const errorMessage = ref("");
let lastRequest = { useFilters: false };

const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  excelRowLimitExceeded.value = Boolean(result.excelRowLimitExceeded);
  page.value = 1;
}

async function loadInitial() {
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await SearchAutoCommitPriceAPI.getInitial());
  } catch (error) {
    errorMessage.value = error.message || "Unable to load records.";
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  const payload = { ...query, useFilters: true };
  try {
    applyResult(await SearchAutoCommitPriceAPI.search(payload));
    lastRequest = payload;
    resetFilters();
  } catch (error) {
    errorMessage.value = error.message || "Unable to search records.";
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  Object.assign(query, {
    sureTimeFrom: "",
    sureTimeTo: "",
    groupId: "",
    importTimeFrom: "",
    importTimeTo: "",
  });
}

async function exportExcel() {
  if (!rows.value.length || exporting.value) return;
  exporting.value = true;
  try {
    let exportRows = rows.value;
    if (excelRowLimitExceeded.value) {
      await ElMessageBox.confirm(
        "There are too many data rows for the legacy Excel limit. Continue with the first 65535 rows?",
        "Excel row limit",
        { type: "warning", confirmButtonText: "Continue" }
      );
      const result = await SearchAutoCommitPriceAPI.exportRows(lastRequest);
      exportRows = Array.isArray(result.rows) ? result.rows : [];
    }
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Auto Commit Price");
    worksheet.columns = columns.value.map((column) => ({ header: column, key: column, width: 22 }));
    worksheet.addRows(exportRows);
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "detail.xlsx");
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    if (error !== "cancel" && error !== "close") ElMessage.error("Unable to export the Excel file");
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

.el-date-editor.el-input {
  width: 100%;
}
</style>
