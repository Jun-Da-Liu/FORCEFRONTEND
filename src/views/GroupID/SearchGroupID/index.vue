<template>
  <div class="page-container search-group-id-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="Search">
          <el-input v-model="query.searchText" clearable :maxlength="200" />
        </el-form-item>
        <el-form-item label="Source">
          <el-select v-model="query.importType" style="width: 150px">
            <el-option label="All" value="%" />
            <el-option label="BOM" value="1" />
            <el-option label="7B5" value="0" />
            <el-option label="BackLog" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="Search by">
          <el-select v-model="query.searchField" style="width: 150px">
            <el-option label="SKUNo" value="SKUNo" />
            <el-option label="GroupID" value="GroupID" />
            <el-option label="PartNo" value="PartNo" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="query.searchField !== 'PartNo'" label="Customs status">
          <el-select v-model="query.customsStatus" style="width: 190px">
            <el-option label="All" value="A" />
            <el-option label="Customs record" value="Registered" />
            <el-option label="Not filed with customs" value="Unregistered" />
          </el-select>
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="reset">Go Back</el-button>
          <el-button :disabled="!rows.length" :loading="exporting" @click="exportCsv">
            To Excel
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ rowCount.toLocaleString() }} records</div>
      <el-alert
        v-if="excelRowLimitExceeded"
        type="warning"
        :closable="false"
        :title="`The result exceeds the legacy Excel limit of ${excelMaxRows.toLocaleString()} rows.`"
      />
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No records found">
        <el-table-column type="index" label="No" width="70" :index="rowIndex" />
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="scope">
            <el-link
              v-if="isGroupId(column)"
              type="primary"
              underline="never"
              @click="openDetail(scope.row)"
            >
              {{ displayValue(scope.row, column) }}
            </el-link>
            <span v-else>{{ displayValue(scope.row, column) }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isHeaderResult" label="PN list" width="100" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="openParts(scope.row)">View</el-button>
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
        max-height="560"
        empty-text="No records found"
      >
        <el-table-column type="index" label="No" width="70" :index="detailRowIndex" />
        <el-table-column
          v-for="column in detailVisibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="145"
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
      <template #footer><el-button @click="detailVisible = false">Close</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchGroupIdAPI from "@/api/group-id/search-group-id";

defineOptions({ name: "SearchGroupId" });

const query = reactive({
  searchText: "",
  searchField: "SKUNo",
  importType: "%",
  customsStatus: "A",
});
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const excelRowLimitExceeded = ref(false);
const excelMaxRows = ref(65535);
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
const visibleColumns = computed(() =>
  columns.value.filter((column) => !["changecolor", "pn"].includes(String(column).toLowerCase()))
);
const detailVisibleColumns = computed(() =>
  detailColumns.value.filter(
    (column) => !["changecolor", "pn"].includes(String(column).toLowerCase())
  )
);
const detailPageRows = computed(() =>
  detailRows.value.slice(
    (detailPage.value - 1) * detailPageSize.value,
    detailPage.value * detailPageSize.value
  )
);
const isHeaderResult = computed(() =>
  columns.value.some((column) => String(column).toLowerCase() === "reg_sn")
);

function value(row, column) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === String(column).toLowerCase());
  return key ? row[key] : "";
}

function displayValue(row, column) {
  const result = value(row, column);
  if (result === null || result === undefined || result === "") return "";
  const lower = String(column).toLowerCase();
  if (!lower.includes("date") && !lower.includes("time")) return result;
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toLocaleString();
}

function columnLabel(column) {
  const labels = {
    partno: "PN Number List",
    partno_h: "PN",
    netweightbyunit: "NetWeightByUnit(KG)",
    reg_sn: "REG_SN",
    fcddate: "FCD Date",
  };
  return labels[String(column).toLowerCase()] || column;
}

function isGroupId(column) {
  return String(column).toLowerCase() === "groupid";
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  excelRowLimitExceeded.value = Boolean(result.excelRowLimitExceeded);
  excelMaxRows.value = Number(result.excelMaxRows ?? 65535);
  page.value = 1;
}

async function loadDefault() {
  loading.value = true;
  try {
    applyResult(await SearchGroupIdAPI.getDefault());
  } catch (error) {
    ElMessage.error(error.message || "Unable to load GroupID data.");
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  try {
    applyResult(await SearchGroupIdAPI.search({ ...query, searchText: query.searchText.trim() }));
  } catch (error) {
    ElMessage.error(error.message || "Unable to search GroupID data.");
  } finally {
    loading.value = false;
  }
}

function reset() {
  Object.assign(query, {
    searchText: "",
    searchField: "SKUNo",
    importType: "%",
    customsStatus: "A",
  });
  loadDefault();
}

async function showDetail(title, loader) {
  detailVisible.value = true;
  detailLoading.value = true;
  detailTitle.value = title;
  try {
    const result = await loader();
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

function openParts(row) {
  const skuNo = String(value(row, "SKUNo") || "");
  const groupId = String(value(row, "GroupID") || "");
  return showDetail(`SKUNo ${skuNo} / GroupID ${groupId} - PN list`, () =>
    SearchGroupIdAPI.getParts({ skuNo, groupId })
  );
}

function openDetail(row) {
  const groupId = String(value(row, "GroupID") || "");
  return showDetail(`GroupID ${groupId} - Lower level PN details`, () =>
    SearchGroupIdAPI.getDetail(groupId)
  );
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

async function exportCsv() {
  exporting.value = true;
  try {
    const exportColumns = visibleColumns.value;
    const escape = (item) => `"${String(item ?? "").replaceAll('"', '""')}"`;
    const content = [
      exportColumns.map((column) => escape(columnLabel(column))).join(","),
      ...rows.value.map((row) =>
        exportColumns.map((column) => escape(value(row, column))).join(",")
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "SearchGroupID.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}

onMounted(loadDefault);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
:deep(.warning-row > td.el-table__cell) {
  background-color: #fff59d !important;
}
</style>
