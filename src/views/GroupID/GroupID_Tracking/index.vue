<template>
  <div class="page-container group-id-tracking-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-width="120px" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :md="12" :xl="8">
            <el-form-item label="ImportDate">
              <el-date-picker
                v-model="query.importDates"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="To"
                start-placeholder="Begin date"
                end-placeholder="End date"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12" :xl="8">
            <el-form-item label="Search">
              <el-input v-model="query.groupId" clearable placeholder="GroupID" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12" :xl="8">
            <el-form-item label="ImportType">
              <el-select v-model="query.importType" style="width: 100%">
                <el-option label="ALL" :value="0" />
                <el-option label="Core BackLog" :value="1" />
                <el-option label="7B5" :value="2" />
                <el-option label="BOM" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12" :xl="8">
            <el-form-item label="REG status">
              <el-select v-model="query.regSnType" style="width: 100%">
                <el-option label="All" :value="0" />
                <el-option label="Has been filed" :value="1" />
                <el-option label="Not filed" :value="2" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12" :xl="8">
            <el-form-item label="FCDDate">
              <el-select v-model="query.fcdSure" style="width: 100%">
                <el-option label="All" :value="1" />
                <el-option label="Has a shipping date" :value="2" />
                <el-option label="No shipping date" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="query.fcdSure === 2" :xs="24" :md="12" :xl="8">
            <el-form-item label="FCD range">
              <el-date-picker
                v-model="query.fcdDates"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="To"
                start-placeholder="Begin date"
                end-placeholder="End date"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12" :xl="8">
            <el-form-item label="Data expiring">
              <div class="expiry-filter">
                <el-select v-model="query.beginRegNo">
                  <el-option label="Equal" :value="1" />
                  <el-option label="More than" :value="2" />
                  <el-option label="Less than" :value="3" />
                  <el-option label="Has timed out" :value="4" />
                </el-select>
                <el-input-number
                  v-model="query.beginReg"
                  :disabled="query.beginRegNo === 4"
                  :min="0"
                  controls-position="right"
                  placeholder="Days"
                />
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12" :xl="8">
            <el-form-item label="Filing expires">
              <div class="expiry-filter">
                <el-select v-model="query.backRegSnNo">
                  <el-option label="Equal" :value="1" />
                  <el-option label="More than" :value="2" />
                  <el-option label="Less than" :value="3" />
                  <el-option label="Has timed out" :value="4" />
                </el-select>
                <el-input-number
                  v-model="query.backRegSn"
                  :disabled="query.backRegSnNo === 4"
                  :min="0"
                  controls-position="right"
                  placeholder="Days"
                />
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button
            :loading="exporting"
            :disabled="loading || rows.length === 0"
            @click="exportExcel"
          >
            To Excel
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ rowCount.toLocaleString() }} records</div>
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No records found">
        <el-table-column type="index" label="No" width="70" :index="rowIndex" />
        <el-table-column
          v-for="column in columns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="145"
        >
          <template #default="scope">
            <el-button
              v-if="String(column).toLowerCase() === 'groupid'"
              link
              type="primary"
              @click="openDetail(scope.row)"
            >
              {{ value(scope.row, column) }}
            </el-button>
            <span v-else>{{ displayValue(scope.row, column) }}</span>
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

    <el-dialog v-model="detailVisible" :title="detailTitle" width="88%" destroy-on-close>
      <el-table
        v-loading="detailLoading"
        :data="detailPageRows"
        :row-class-name="detailRowClass"
        border
        empty-text="No records found"
        max-height="560"
      >
        <el-table-column type="index" label="ID" width="70" :index="detailRowIndex" />
        <el-table-column
          v-for="column in detailVisibleColumns"
          :key="column"
          :prop="column"
          :label="detailColumnLabel(column)"
          min-width="150"
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
        </el-table-column>
      </el-table>
      <Pagination
        v-model:page="detailPage"
        v-model:limit="detailPageSize"
        :total="detailRows.length"
        :page-sizes="[20]"
        layout="total, prev, pager, next, jumper"
      />
      <template #footer>
        <el-button @click="detailVisible = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import GroupIdTrackingAPI from "@/api/group-id/group-id-tracking";

defineOptions({ name: "GroupIdTracking" });

const today = new Date();
const monthAgo = new Date(today);
monthAgo.setMonth(monthAgo.getMonth() - 1);
monthAgo.setDate(monthAgo.getDate() + 1);
const fcdMonthAgo = new Date(today);
fcdMonthAgo.setMonth(fcdMonthAgo.getMonth() - 1);

const query = reactive({
  importDates: [formatDate(monthAgo), formatDate(today)],
  groupId: "",
  importType: 0,
  regSnType: 0,
  fcdSure: 1,
  fcdDates: [formatDate(fcdMonthAgo), formatDate(today)],
  beginReg: null,
  beginRegNo: 1,
  backRegSn: null,
  backRegSnNo: 1,
});
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const exporting = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailTitle = ref("GroupID detail");
const detailColumns = ref([]);
const detailRows = ref([]);
const detailPage = ref(1);
const detailPageSize = ref(20);

const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);
const detailVisibleColumns = computed(() => {
  const hidden = new Set(["pn", "changecolor"]);
  return detailColumns.value.filter((column) => !hidden.has(String(column).toLowerCase()));
});
const detailPageRows = computed(() =>
  detailRows.value.slice(
    (detailPage.value - 1) * detailPageSize.value,
    detailPage.value * detailPageSize.value
  )
);

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === String(name).toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  const labels = {
    importdatetime: "DW to Customs",
    getgroupregbegin_date: "Data due",
    getgroupiddateregbegin_sn: "Data due left",
    regbegindate: "Customs to HFJ",
    reg_sn_ok_date: "REG due",
    reg_sn_ok_date_no: "REG due left",
    reg_sn: "REG NO",
    reg_sn_date: "REG Time (China Customs)",
  };
  return labels[String(column).toLowerCase()] || column;
}

function detailColumnLabel(column) {
  const labels = {
    partno_h: "PN",
    partno: "ShortPn",
    netweightbyunit: "NetWeightByUnit(KG)",
    importdatetime: "ImportDate",
  };
  return labels[String(column).toLowerCase()] || column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (result === null || result === undefined || result === "") return result ?? "";
  const lower = String(column).toLowerCase();
  if (!lower.includes("date") && !lower.includes("time")) return result;
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toLocaleString();
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

function payload() {
  return {
    importBeginDate: query.importDates?.[0] || null,
    importEndDate: query.importDates?.[1] || null,
    importType: query.importType,
    groupId: String(query.groupId || "")
      .trim()
      .replaceAll("'", ""),
    regSnType: query.regSnType,
    fcdBegin: query.fcdSure === 2 ? query.fcdDates?.[0] || null : null,
    fcdEnd: query.fcdSure === 2 ? query.fcdDates?.[1] || null : null,
    fcdSure: query.fcdSure,
    beginReg: query.beginRegNo === 4 ? null : query.beginReg,
    beginRegNo: query.beginRegNo,
    backRegSn: query.backRegSnNo === 4 ? null : query.backRegSn,
    backRegSnNo: query.backRegSnNo,
  };
}

async function loadInitial() {
  loading.value = true;
  try {
    applyResult(await GroupIdTrackingAPI.getInitial());
  } catch (error) {
    ElMessage.error(error.message || "Unable to load GroupID tracking data.");
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (loading.value) return;
  if (!query.importDates || query.importDates.length !== 2) {
    ElMessage.warning("Import date range is required.");
    return;
  }
  if (query.fcdSure === 2 && (!query.fcdDates || query.fcdDates.length !== 2)) {
    ElMessage.warning("FCD date range is required.");
    return;
  }
  loading.value = true;
  try {
    applyResult(await GroupIdTrackingAPI.search(payload()));
  } catch (error) {
    ElMessage.error(error.message || "Unable to search GroupID tracking data.");
  } finally {
    loading.value = false;
  }
}

async function openDetail(row) {
  const groupId = String(value(row, "GroupID") || "");
  if (!groupId) return;
  detailVisible.value = true;
  detailLoading.value = true;
  detailTitle.value = `GroupID: ${groupId} - Lower level PN details`;
  try {
    const result = await GroupIdTrackingAPI.getDetail(groupId);
    detailColumns.value = Array.isArray(result.columns) ? result.columns : [];
    detailRows.value = Array.isArray(result.rows) ? result.rows : [];
    detailPage.value = 1;
  } catch (error) {
    detailVisible.value = false;
    ElMessage.error(error.message || "Unable to load GroupID detail.");
  } finally {
    detailLoading.value = false;
  }
}

function rowIndex(index) {
  return (page.value - 1) * pageSize.value + index + 1;
}

function detailRowIndex(index) {
  return (detailPage.value - 1) * detailPageSize.value + index + 1;
}

function detailRowClass({ row }) {
  return Number(value(row, "ChangeColor")) === 1 ? "warning-row" : "";
}

async function exportExcel() {
  exporting.value = true;
  try {
    const maxRows = 65535;
    if (rows.value.length > maxRows) {
      await ElMessageBox.confirm(
        `There are too many rows for the legacy Excel limit. Export the first ${maxRows} rows?`,
        "Excel row limit",
        { type: "warning", confirmButtonText: "Continue" }
      );
    }
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GroupIDTracking");
    worksheet.columns = columns.value.map((column) => ({
      header: columnLabel(column),
      key: column,
      width: 22,
    }));
    rows.value.slice(0, maxRows).forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "GroupIDTracking.xlsx");
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

.expiry-filter {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(120px, 1fr);
  gap: 8px;
  width: 100%;
}

:deep(.warning-row > td.el-table__cell) {
  background-color: #fff59d !important;
}
</style>
