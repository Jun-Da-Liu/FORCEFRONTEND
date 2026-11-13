<template>
  <div class="page-container group-id-splitting-mapping-page">
    <el-card class="page-search" shadow="never">
      <el-space wrap class="mode-buttons">
        <el-button :type="mode === 'groupId' ? 'primary' : 'default'" @click="setMode('groupId')">
          GroupID
        </el-button>
        <el-button
          :type="mode === 'workOrder' ? 'primary' : 'default'"
          @click="setMode('workOrder')"
        >
          WorkOrderNo
        </el-button>
      </el-space>

      <el-form :model="query" inline @submit.prevent="handleSearch">
        <el-form-item label="Search">
          <el-input v-model="query.search" clearable />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.selectValue" style="width: 150px">
            <el-option label="WorkOrderNo" value="WO" />
            <el-option label="GroupID" value="GroupID" />
            <el-option label="SkuNO" value="SkuNo" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :loading="exporting" :disabled="loading" @click="exportExcel">
            ToExcel
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ rowCount.toLocaleString() }} records</div>
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No records found">
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="145"
        >
          <template #default="scope">
            <el-button
              v-if="mode === 'workOrder' && String(column).toLowerCase() === 'wo'"
              link
              type="primary"
              @click="openWorkOrderDetail(scope.row)"
            >
              {{ value(scope.row, column) }}
            </el-button>
            <span v-else>{{ displayValue(scope.row, column) }}</span>
          </template>
        </el-table-column>
        <template v-if="mode === 'groupId'">
          <el-table-column label="Detail" width="100" fixed="right" align="center">
            <template #default="scope">
              <el-button link type="primary" @click="openGroupDetail(scope.row, 0)">
                Detail
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="MoreDetail" width="120" fixed="right" align="center">
            <template #default="scope">
              <el-button link type="primary" @click="openGroupDetail(scope.row, 1)">
                MoreDetail
              </el-button>
            </template>
          </el-table-column>
        </template>
      </el-table>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="rows.length"
        :page-sizes="[20]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>

    <el-dialog v-model="detailVisible" :title="detailTitle" width="92%" destroy-on-close>
      <el-table
        v-loading="detailLoading"
        :data="detailPageRows"
        :cell-style="detailCellStyle"
        border
        empty-text="No records found"
        max-height="560"
      >
        <el-table-column
          v-for="column in detailVisibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="140"
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
import GroupIdSplittingMappingAPI from "@/api/group-id/group-id-splitting-mapping";

defineOptions({ name: "GroupIdSplittingMapping" });

const groupColors = ["#C0FFFF", "#E0E0E0", "#FFE0C0", "#C0C0FF", "#FFC0FF", "#C0FFC0"];
const mode = ref("workOrder");
const query = reactive({ search: "", selectValue: "WO" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const exporting = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailTitle = ref("Splitting Detail");
const detailKind = ref("workOrder");
const detailColumns = ref([]);
const detailRows = ref([]);
const detailPage = ref(1);
const detailPageSize = ref(20);

const hiddenMainColumns = computed(() =>
  mode.value === "groupId" ? new Set(["isdone"]) : new Set()
);
const visibleColumns = computed(() =>
  columns.value.filter((column) => !hiddenMainColumns.value.has(String(column).toLowerCase()))
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);
const detailHiddenColumns = computed(() => {
  if (detailKind.value === "groupSummary") return new Set(["groupnum", "type_iu"]);
  if (detailKind.value === "groupMore") return new Set(["groupnum", "itemno"]);
  return new Set(["groupnum", "buname"]);
});
const detailVisibleColumns = computed(() =>
  detailColumns.value.filter(
    (column) => !detailHiddenColumns.value.has(String(column).toLowerCase())
  )
);
const detailPageRows = computed(() =>
  detailRows.value.slice(
    (detailPage.value - 1) * detailPageSize.value,
    detailPage.value * detailPageSize.value
  )
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === String(name).toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  const labels = {
    wo: "WorkOrderNo",
    subgidqty: "GroupIDQty",
    shortpartno: "ShortPartNo",
    requestqty: "PNQty",
    subreg_no: "Reg_No",
    copycount: "GroupIDCount",
  };
  return labels[String(column).toLowerCase()] || column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (!result) return result ?? "";
  const lower = String(column).toLowerCase();
  if (!lower.includes("time") && !lower.includes("date")) return result;
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toLocaleString();
}

function payload() {
  return {
    selectValue: query.selectValue,
    search: String(query.search || "")
      .trim()
      .replaceAll("'", ""),
  };
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  try {
    const request = payload();
    const result =
      mode.value === "workOrder"
        ? await GroupIdSplittingMappingAPI.searchWorkOrders(request)
        : await GroupIdSplittingMappingAPI.searchGroupIds(request);
    applyResult(result);
  } catch (error) {
    ElMessage.error(error.message || "Unable to load GroupID splitting mappings.");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load();
}

async function setMode(nextMode) {
  if (mode.value === nextMode) return;
  mode.value = nextMode;
  query.selectValue = nextMode === "workOrder" ? "WO" : "GroupID";
  await load();
}

function applyDetail(result = {}, kind, title) {
  detailKind.value = kind;
  detailTitle.value = title;
  detailColumns.value = Array.isArray(result.columns) ? result.columns : [];
  detailRows.value = Array.isArray(result.rows) ? result.rows : [];
  detailPage.value = 1;
  detailVisible.value = true;
}

async function openWorkOrderDetail(row) {
  const workOrderNo = String(value(row, "WO") || "");
  if (!workOrderNo) return;
  detailLoading.value = true;
  detailVisible.value = true;
  detailTitle.value = `Splitting Detail Of WorkOrderNo: ${workOrderNo}`;
  try {
    applyDetail(
      await GroupIdSplittingMappingAPI.getWorkOrderDetail(workOrderNo),
      "workOrder",
      `Splitting Detail Of WorkOrderNo: ${workOrderNo}`
    );
  } catch (error) {
    detailVisible.value = false;
    ElMessage.error(error.message || "Unable to load work-order splitting detail.");
  } finally {
    detailLoading.value = false;
  }
}

async function openGroupDetail(row, detail) {
  const groupId = String(value(row, "GroupID") || "");
  if (!groupId) return;
  detailLoading.value = true;
  detailVisible.value = true;
  detailTitle.value = `GroupID: ${groupId}`;
  try {
    applyDetail(
      await GroupIdSplittingMappingAPI.getGroupDetail({
        groupId,
        state: Number(value(row, "IsDone") || 0),
        detail,
      }),
      detail === 0 ? "groupSummary" : "groupMore",
      `${detail === 0 ? "Detail" : "More Detail"} Of GroupID: ${groupId}`
    );
  } catch (error) {
    detailVisible.value = false;
    ElMessage.error(error.message || "Unable to load GroupID splitting detail.");
  } finally {
    detailLoading.value = false;
  }
}

function detailCellStyle({ row }) {
  const groupNum = Number(value(row, "GroupNum"));
  if (!Number.isInteger(groupNum) || groupNum < 0) return {};
  return { backgroundColor: groupColors[groupNum % groupColors.length] };
}

async function exportExcel() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const result = await GroupIdSplittingMappingAPI.exportRows();
    const maxRows = Number(result.excelMaxRows ?? 65535);
    if (result.excelRowLimitExceeded) {
      await ElMessageBox.confirm(
        `There are too many rows for the legacy Excel limit. Export the first ${maxRows} rows?`,
        "Excel row limit",
        { type: "warning", confirmButtonText: "Continue" }
      );
    }
    const metadata = new Set(["row_num", "groupnum"]);
    const exportColumns = (Array.isArray(result.columns) ? result.columns : []).filter(
      (column) => !metadata.has(String(column).toLowerCase())
    );
    const exportRows = (Array.isArray(result.rows) ? result.rows : []).slice(0, maxRows);
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("SplittingGroupID");
    worksheet.columns = exportColumns.map((column) => ({
      header: columnLabel(column),
      key: column,
      width: 22,
    }));
    exportRows.forEach((row) => {
      const excelRow = worksheet.addRow(row);
      const color = String(value(row, "GroupNum") || value(row, "Row_Num") || "").replace("#", "");
      if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        excelRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } };
        });
      }
    });
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "SplittingGroupID.xlsx");
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

onMounted(load);
</script>

<style scoped>
.mode-buttons,
.page-toolbar {
  margin-bottom: 12px;
}
</style>
