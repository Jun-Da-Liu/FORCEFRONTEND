<template>
  <div class="page-container search-sfc-invoice-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="Numbers">
          <el-input
            v-model="query.numbers"
            type="textarea"
            :rows="5"
            :maxlength="8000"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label="Search by">
          <el-select v-model="query.searchField" :disabled="loading" style="width: 180px">
            <el-option label="InvoiceNo" value="InvoiceNo" />
            <el-option label="WorkorderNo" value="WorkorderNo" />
            <el-option label="GroupID" value="GroupID" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="clearNumbers">Clear</el-button>
          <el-button :loading="exporting" :disabled="loading || !rows.length" @click="exportExcel">
            ToExcel
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        {{ rowCount.toLocaleString() }} record{{ rowCount === 1 ? "" : "s" }}
      </div>
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
        border
        stripe
        highlight-current-row
        empty-text="No records found"
      >
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
        :page-sizes="[50]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchAPI from "@/api/report-search/search-sfc-invoice-no-wo";

defineOptions({ name: "SearchSfcInvoiceNoWo" });

const query = reactive({
  searchField: "InvoiceNo",
  numbers: "TO20121130001,TO20121130002",
});
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const excelRowLimitExceeded = ref(false);
const page = ref(1);
const pageSize = ref(50);
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
  excelRowLimitExceeded.value = Boolean(result.excelRowLimitExceeded);
  page.value = 1;
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  const payload = { searchField: query.searchField, numbers: query.numbers };
  try {
    applyResult(await SearchAPI.search(payload));
    lastRequest = payload;
  } catch (error) {
    errorMessage.value = error.message || "Unable to search records.";
  } finally {
    loading.value = false;
  }
}

function clearNumbers() {
  query.numbers = "";
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
      const result = await SearchAPI.exportRows(lastRequest);
      exportRows = Array.isArray(result.rows) ? result.rows : [];
    }
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("SFC Invoice WO");
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
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
