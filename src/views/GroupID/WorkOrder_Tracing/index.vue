<template>
  <div class="page-container work-order-tracing-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="queryForm" label-position="top" @submit.prevent="handleSearch">
        <div class="search-grid">
          <el-form-item label="Date range" class="date-field">
            <el-date-picker
              v-model="queryForm.dateRange"
              type="daterange"
              range-separator="~"
              start-placeholder="Begin date"
              end-placeholder="End date"
              value-format="YYYY-MM-DD"
              clearable
            />
          </el-form-item>

          <el-form-item label="Search" class="keyword-field">
            <el-input
              v-model="queryForm.searchBox"
              type="textarea"
              :rows="2"
              resize="none"
              clearable
              placeholder="Enter one or multiple values"
              @keydown.enter.exact.prevent="handleSearch"
            />
          </el-form-item>

          <el-form-item label="Search by">
            <el-select v-model="queryForm.searchType">
              <el-option
                v-for="option in searchTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Type">
            <el-select v-model="queryForm.ddlType">
              <el-option
                v-for="option in typeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Status">
            <el-select v-model="queryForm.ddlIsStucked">
              <el-option
                v-for="option in stuckOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <div class="search-actions">
            <el-button type="primary" :loading="loading" @click="handleSearch">
              <el-icon><Search /></el-icon>
              Search
            </el-button>
            <el-button :disabled="loading" @click="handleReset">
              <el-icon><RefreshLeft /></el-icon>
              Clear
            </el-button>
          </div>
        </div>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button type="primary" plain :loading="refreshing" @click="handleRefreshRegisteredSn">
            <el-icon><Refresh /></el-icon>
            Get RegNo
          </el-button>

          <el-tooltip content="The backend does not provide a GetNPI endpoint yet" placement="top">
            <span>
              <el-button disabled>Get NPI</el-button>
            </span>
          </el-tooltip>

          <el-button :disabled="!rows.length" :loading="exporting" @click="handleExport">
            <el-icon><Download /></el-icon>
            To Excel
          </el-button>
        </div>

        <div class="result-summary">
          <span>{{ rowCount.toLocaleString() }} record{{ rowCount === 1 ? "" : "s" }}</span>
          <el-tooltip content="Reload the current query" placement="top">
            <el-button
              class="page-icon-btn"
              circle
              :loading="loading"
              aria-label="Reload"
              @click="reloadCurrentQuery"
            >
              <el-icon><RefreshRight /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <el-alert
        v-if="excelRowLimitExceeded"
        class="row-limit-alert"
        type="warning"
        :closable="false"
        show-icon
        :title="`The result exceeds the Excel limit of ${excelMaxRows.toLocaleString()} rows.`"
      />

      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          class="page-table"
          :data="pageRows"
          row-key="WorkOrderNo"
          border
          stripe
          highlight-current-row
          empty-text="No work orders found"
          @sort-change="handleSortChange"
        >
          <el-table-column
            prop="WorkOrderNo"
            label="WorkOrderNo"
            min-width="145"
            fixed="left"
            sortable="custom"
          >
            <template #default="{ row }">
              <el-link type="primary" underline="never" @click="handleOpenDetail(row)">
                {{ displayValue(row.WorkOrderNo) }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="SKUNo" label="SKUNo" min-width="125" sortable="custom" />
          <el-table-column prop="GroupID" label="GroupID" min-width="170" sortable="custom" />
          <el-table-column
            prop="TypeIU"
            label="TypeIU"
            width="90"
            align="center"
            sortable="custom"
          />
          <el-table-column
            prop="GenerationType"
            label="GenerationType"
            min-width="145"
            align="center"
            sortable="custom"
          />
          <el-table-column
            prop="TimeFromSFC"
            label="TimeFromSFC"
            min-width="175"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.TimeFromSFC) }}</template>
          </el-table-column>
          <el-table-column
            prop="FCDDate"
            label="FCDDate"
            min-width="175"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.FCDDate) }}</template>
          </el-table-column>
          <el-table-column
            prop="TimeGenerated"
            label="TimeGenerated"
            min-width="175"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.TimeGenerated) }}</template>
          </el-table-column>
          <el-table-column
            prop="IsStuck"
            label="IsBlocked"
            width="115"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">
              <el-tag :type="isYes(row.IsStuck) ? 'danger' : 'success'" effect="light">
                {{ plainText(row.IsStuck) || "-" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="StuckReason"
            label="BlockedReason"
            min-width="200"
            show-overflow-tooltip
            sortable="custom"
          >
            <template #default="{ row }">{{ displayValue(row.StuckReason) }}</template>
          </el-table-column>
          <el-table-column
            prop="IsRegistered"
            label="IsRegistered"
            width="125"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">
              <el-tag :type="isYes(row.IsRegistered) ? 'success' : 'info'" effect="light">
                {{ plainText(row.IsRegistered) || "-" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="Reg_SN"
            label="Reg_SN"
            min-width="130"
            align="center"
            show-overflow-tooltip
            sortable="custom"
          >
            <template #default="{ row }">{{ displayValue(row.Reg_SN) }}</template>
          </el-table-column>
          <el-table-column
            prop="TimeRegistered"
            label="TimeRegistered"
            min-width="175"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.TimeRegistered) }}</template>
          </el-table-column>
          <el-table-column
            prop="TimeToSFC"
            label="TimeToSFC"
            min-width="175"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatDateTime(row.TimeToSFC) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <Pagination
        v-model:page="pagination.page"
        v-model:limit="pagination.limit"
        class="page-pagination"
        :total="rows.length"
        :page-sizes="[10, 20, 50, 100]"
      />
    </el-card>
  </div>
</template>

<script setup>
import { Download, Refresh, RefreshLeft, RefreshRight, Search } from "@element-plus/icons-vue";
import WorkOrderTracingAPI from "@/api/group-id/work-order-tracing";

defineOptions({
  name: "WorkOrderTracing",
});

const RESULT_COLUMNS = [
  "WorkOrderNo",
  "Plant",
  "SKUNo",
  "GroupID",
  "TypeIU",
  "GenerationType",
  "TimeFromSFC",
  "FCDDate",
  "TimeGenerated",
  "IsStuck",
  "StuckReason",
  "IsRegistered",
  "Reg_SN",
  "TimeRegistered",
  "TimeToSFC",
];

const DATE_TIME_COLUMNS = new Set([
  "TimeFromSFC",
  "FCDDate",
  "TimeGenerated",
  "TimeRegistered",
  "TimeToSFC",
]);

const searchTypeOptions = [
  { label: "WorkOrderNo", value: "1" },
  { label: "SKUNo", value: "2" },
  { label: "GroupID", value: "3" },
];

const typeOptions = [
  { label: "All", value: "0" },
  { label: "7B5", value: "1" },
  { label: "CoreBackLog", value: "2" },
  { label: "BOM", value: "3" },
];

const stuckOptions = [
  { label: "All", value: "0" },
  { label: "Blocked", value: "1" },
  { label: "Finished", value: "2" },
];

const createDefaultQuery = () => ({
  dateRange: [],
  searchType: "1",
  searchBox: "",
  ddlType: "0",
  ddlIsStucked: "0",
});

const queryForm = reactive(createDefaultQuery());
const pagination = reactive({ page: 1, limit: 20 });
const sortState = reactive({ sortBy: "Plant", sortDirection: "Asc" });

const rows = ref([]);
const responseColumns = ref(RESULT_COLUMNS);
const rowCount = ref(0);
const excelRowLimitExceeded = ref(false);
const excelMaxRows = ref(65535);
const loading = ref(false);
const refreshing = ref(false);
const exporting = ref(false);
const lastQueryMode = ref("default");

const pageRows = computed(() => {
  const start = (pagination.page - 1) * pagination.limit;
  return rows.value.slice(start, start + pagination.limit);
});

function buildSearchPayload() {
  return {
    importDateTimeStart: queryForm.dateRange?.[0] || null,
    importDateTimeEnd: queryForm.dateRange?.[1] || null,
    searchType: queryForm.searchType,
    searchBox: queryForm.searchBox.trim(),
    ddlType: queryForm.ddlType,
    ddlIsStucked: queryForm.ddlIsStucked,
    ...sortState,
  };
}

function applyResult(result = {}) {
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  responseColumns.value = Array.isArray(result.columns) ? result.columns : RESULT_COLUMNS;
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  excelRowLimitExceeded.value = Boolean(result.excelRowLimitExceeded);
  excelMaxRows.value = Number(result.excelMaxRows ?? 65535);
  pagination.page = 1;
}

async function loadDefaultList() {
  loading.value = true;
  try {
    const result = await WorkOrderTracingAPI.getList(sortState);
    applyResult(result);
    lastQueryMode.value = "default";
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  loading.value = true;
  try {
    const result = await WorkOrderTracingAPI.search(buildSearchPayload());
    applyResult(result);
    lastQueryMode.value = "search";
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  Object.assign(queryForm, createDefaultQuery());
  Object.assign(sortState, { sortBy: "Plant", sortDirection: "Asc" });
  loadDefaultList();
}

async function reloadCurrentQuery() {
  if (lastQueryMode.value === "search") {
    await handleSearch();
    return;
  }
  await loadDefaultList();
}

async function handleRefreshRegisteredSn() {
  refreshing.value = true;
  try {
    const result = await WorkOrderTracingAPI.refreshRegisteredSn(sortState);
    applyResult(result);
    lastQueryMode.value = "default";
    ElMessage.success("Registered SN data has been refreshed");
  } finally {
    refreshing.value = false;
  }
}

function handleSortChange({ prop, order }) {
  sortState.sortBy = prop || "Plant";
  sortState.sortDirection = order === "descending" ? "Desc" : "Asc";
  reloadCurrentQuery();
}

function handleOpenDetail(row) {
  ElMessage.info(`Work order detail is not available yet: ${row.WorkOrderNo}`);
}

function plainText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/<[^>]*>/g, "")
    .trim();
}

function displayValue(value) {
  return plainText(value) || "-";
}

function isYes(value) {
  return plainText(value).toLowerCase() === "yes";
}

function formatDateTime(value) {
  if (!value) return "-";
  return String(value)
    .replace("T", " ")
    .replace(/\.\d+$/, "");
}

async function handleExport() {
  if (!rows.value.length) return;

  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Work Order Tracing");
    const columns = responseColumns.value.length ? responseColumns.value : RESULT_COLUMNS;

    worksheet.columns = columns.map((key) => ({
      header: key,
      key,
      width: DATE_TIME_COLUMNS.has(key) ? 22 : Math.max(14, Math.min(key.length + 6, 28)),
    }));

    worksheet.addRows(
      rows.value.map((row) =>
        Object.fromEntries(
          columns.map((key) => [
            key,
            DATE_TIME_COLUMNS.has(key) ? formatDateTime(row[key]) : plainText(row[key]),
          ])
        )
      )
    );

    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = { from: "A1", to: `${columnName(columns.length)}1` };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF409EFF" },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, `WorkOrderTracing_${fileTimestamp()}.xlsx`);
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    console.error("Failed to export Work Order Tracing:", error);
    ElMessage.error("Unable to export the Excel file");
  } finally {
    exporting.value = false;
  }
}

function columnName(columnNumber) {
  let number = columnNumber;
  let name = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function fileTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function saveWorkbook(buffer, fileName) {
  const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const url = window.URL.createObjectURL(new Blob([buffer], { type: fileType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

onMounted(loadDefaultList);
</script>

<style lang="scss" scoped>
.work-order-tracing-page {
  overflow: hidden;
}

.search-grid {
  display: grid;
  grid-template-columns:
    minmax(300px, 1.5fr) minmax(260px, 1.2fr) repeat(3, minmax(140px, 0.65fr))
    auto;
  gap: 12px;
  align-items: end;

  :deep(.el-form-item) {
    min-width: 0;
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 6px;
    line-height: 20px;
  }

  :deep(.el-date-editor),
  :deep(.el-select) {
    width: 100%;
  }
}

.search-actions {
  display: flex;
  gap: 8px;
  padding-bottom: 1px;

  .el-button {
    margin: 0;
  }
}

.result-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: auto;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.row-limit-alert {
  margin-bottom: 10px;
}

:deep(.page-pagination .el-scrollbar__wrap) {
  overflow-x: auto;
}

@media (width <= 1400px) {
  .search-grid {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }

  .date-field,
  .keyword-field {
    grid-column: span 2;
  }
}

@media (width <= 900px) {
  .search-grid {
    grid-template-columns: 1fr;
  }

  .date-field,
  .keyword-field {
    grid-column: auto;
  }

  .page-toolbar {
    align-items: flex-start;
  }
}
</style>
