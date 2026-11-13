<template>
  <div class="page-container check-group-id-point-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="WorkOrderNo">
              <el-input v-model="query.workOrderNo" :maxlength="200" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="SFC_GroupID">
              <el-input v-model="query.sfcGroupId" :maxlength="200" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="SAP_GroupID">
              <el-input v-model="query.sapGroupId" :maxlength="200" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="ImportDateTime">
              <el-date-picker
                v-model="query.importDateTime"
                type="date"
                value-format="YYYY-MM-DD"
              />
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
      <el-table
        v-loading="loading"
        :data="pageRows"
        :row-class-name="rowClassName"
        border
        empty-text="No records found"
      >
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="column"
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
import CheckGroupIdPointAPI from "@/api/report-search/search-sap-sfc-check-group-id-point";

defineOptions({ name: "SearchSapSfcCheckGroupIdPoint" });

const query = reactive({ workOrderNo: "", sfcGroupId: "", sapGroupId: "", importDateTime: "" });
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

const visibleColumns = computed(() =>
  columns.value.filter((column) => !["id", "color"].includes(column.toLowerCase()))
);
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
    applyResult(await CheckGroupIdPointAPI.getInitial());
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
    applyResult(await CheckGroupIdPointAPI.search(payload));
    lastRequest = payload;
    resetFilters();
  } catch (error) {
    errorMessage.value = error.message || "Unable to search records.";
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  Object.assign(query, { workOrderNo: "", sfcGroupId: "", sapGroupId: "", importDateTime: "" });
}

function rowClassName({ row }) {
  const colorKey = columns.value.find((column) => column.toLowerCase() === "color");
  const color = Number.parseInt(colorKey ? row[colorKey] : "", 10);
  if (!Number.isInteger(color)) return "";
  return color % 2 === 0 ? "color-even-row" : "color-odd-row";
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
      const result = await CheckGroupIdPointAPI.exportRows(lastRequest);
      exportRows = Array.isArray(result.rows) ? result.rows : [];
    }
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GroupID Point");
    worksheet.columns = columns.value.map((column) => ({
      header: column,
      key: column,
      width: 22,
    }));
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

.el-table :deep(.color-even-row) td.el-table__cell {
  background-color: #b9d3ee;
}

.el-table :deep(.color-odd-row) td.el-table__cell {
  background-color: #bbffff;
}
</style>
