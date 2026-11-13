<template>
  <div class="page-container search-wo-group-id-reg-page">
    <el-card class="page-search" shadow="never">
      <div class="mode-buttons">
        <el-button :type="mode === 'workOrder' ? 'primary' : ''" @click="switchMode('workOrder')">
          ByWO
        </el-button>
        <el-button :type="mode === 'groupId' ? 'primary' : ''" @click="switchMode('groupId')">
          ByGroupID
        </el-button>
      </div>

      <el-form label-position="top" @submit.prevent="handleSearch">
        <el-form-item :label="mode === 'workOrder' ? 'Workordernos' : 'GroupIDs'">
          <el-input
            v-model="activeValues"
            type="textarea"
            :rows="5"
            :maxlength="8000"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="clearValues">Clear</el-button>
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
        stripe
        highlight-current-row
        empty-text="No records found"
      >
        <el-table-column
          v-for="column in columns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="155"
        >
          <template #default="scope">
            {{ displayValue(scope.row, column) }}
          </template>
        </el-table-column>
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
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchWoGroupIdRegAPI from "@/api/report-search/search-wo-group-id-reg";

defineOptions({ name: "SearchWoGroupIdReg" });

const mode = ref("workOrder");
const query = reactive({
  workOrder: "6I0000078166,6I0000078167",
  groupId: "CP-7942G=02,CP-7942G=03",
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

const activeValues = computed({
  get: () => query[mode.value],
  set: (value) => {
    query[mode.value] = value;
  },
});
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : null;
}

function columnLabel(column) {
  return column.toLowerCase() === "importdatatime" ? "ImportDateTime" : column;
}

function displayValue(row, column) {
  const result = value(row, column);
  const key = column.toLowerCase();
  if (!result || result === "NULL") return result ?? "NULL";
  if (key !== "fcddate" && key !== "importdatatime") return result;
  const date = new Date(result);
  if (Number.isNaN(date.getTime())) return result;
  if (key === "fcddate") return date.toISOString().slice(0, 10);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function normalizeValues(text) {
  return text
    .trim()
    .replaceAll("'", "")
    .replaceAll(/<br>/gi, "")
    .replaceAll(/VbCrLf/gi, "")
    .replaceAll(/\r|\n|\s/g, "")
    .replace(/[,，]+$/, "");
}

function requestPayload() {
  return { mode: mode.value, values: normalizeValues(activeValues.value) };
}

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
  const payload = requestPayload();
  try {
    applyResult(await SearchWoGroupIdRegAPI.search(payload));
    lastRequest = payload;
  } catch (error) {
    errorMessage.value = error.message || "Unable to search work-order registration records.";
  } finally {
    loading.value = false;
  }
}

async function switchMode(nextMode) {
  if (mode.value === nextMode || loading.value) return;
  mode.value = nextMode;
  await handleSearch();
}

function clearValues() {
  query[mode.value] = "";
}

function rowClassName({ row }) {
  const fcdDate = value(row, "FCDDate");
  return fcdDate === null || String(fcdDate).toUpperCase() === "NULL" ? "missing-fcd-row" : "";
}

async function exportExcel() {
  if (!rows.value.length || exporting.value || !lastRequest) return;
  exporting.value = true;
  try {
    let exportColumns = columns.value;
    let exportRows = rows.value;
    if (excelRowLimitExceeded.value) {
      await ElMessageBox.confirm(
        "There are too many data rows for the legacy Excel limit. Continue with the first 65535 rows?",
        "Excel row limit",
        { type: "warning", confirmButtonText: "Continue" }
      );
      const result = await SearchWoGroupIdRegAPI.exportRows(lastRequest);
      exportColumns = Array.isArray(result.columns) ? result.columns : [];
      exportRows = Array.isArray(result.rows) ? result.rows : [];
    }
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("WO GroupID Reg");
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

onMounted(handleSearch);
</script>

<style scoped>
.mode-buttons,
.page-toolbar {
  margin-bottom: 12px;
}

.el-table :deep(.missing-fcd-row) td.el-table__cell {
  background-color: yellow !important;
}
</style>
