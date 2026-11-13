<template>
  <div class="page-container search-mapping-page">
    <el-card class="page-search" shadow="never">
      <el-tabs v-model="form.mode" class="mapping-tabs" @tab-change="handleModeChange">
        <el-tab-pane
          v-for="option in modes"
          :key="option.value"
          :label="option.label"
          :name="option.value"
        />
      </el-tabs>

      <el-form :model="form" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16" align="bottom">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="BeginDate">
              <el-date-picker
                v-model="form.beginDate"
                type="date"
                value-format="YYYY-MM-DD"
                format="YYYY-MM-DD"
                clearable
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="EndDate">
              <el-date-picker
                v-model="form.endDate"
                type="date"
                value-format="YYYY-MM-DD"
                format="YYYY-MM-DD"
                clearable
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="5">
            <el-form-item :label="activeMode.searchLabel">
              <el-input v-model="form.searchValue" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="4">
            <el-form-item label="Search by">
              <el-select v-model="form.searchField" style="width: 100%">
                <el-option
                  v-for="field in activeMode.fields"
                  :key="field.value"
                  :label="field.label"
                  :value="field.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :lg="3">
            <el-form-item>
              <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
              <el-button
                :disabled="loading || !rows.length"
                :loading="exporting"
                @click="exportExcel"
              >
                ToExcel
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <span>{{ activeMode.label }} · {{ rowCount.toLocaleString() }} records</span>
        <el-tag v-if="excelRowLimitExceeded" type="warning">
          Excel row limit {{ excelMaxRows.toLocaleString() }} exceeded
        </el-tag>
      </div>
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
          min-width="155"
          sortable
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
        </el-table-column>
      </el-table>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="rows.length"
        :page-sizes="[15, 30, 50, 100]"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchMappingAPI from "@/api/fuyu/search-mapping";

defineOptions({ name: "SearchMapping" });

const workOrderFields = [
  { label: "SAPWorkOrderNo", value: "SAPWorkOrderNo" },
  { label: "HFJWorkOrderNo", value: "HFJWorkOrderNo" },
  { label: "GroupID", value: "GroupID" },
];
const materialFields = [
  { label: "MaterialNo", value: "HFJMaterialNo" },
  { label: "SAP DocumentNo", value: "SAPDocumentNo" },
  { label: "HFJWorkOrderNo", value: "HFJWorkOrderNo" },
  { label: "GroupID", value: "GroupID" },
];
const modes = [
  { label: "Work order", value: "work-order", searchLabel: "HFJMapping", fields: workOrderFields },
  { label: "Spare", value: "spare", searchLabel: "SpareMapping", fields: workOrderFields },
  {
    label: "Dismantle Mapping",
    value: "dismantle",
    searchLabel: "DismantleMapping",
    fields: [
      { label: "SAPModulateNo", value: "SAPModulateNo" },
      { label: "SAP DocumentNo", value: "SAPDocumentNo" },
      { label: "HFJModulateNo", value: "HFJModulateNo" },
      { label: "GroupID", value: "GroupID" },
    ],
  },
  {
    label: "Send BOM",
    value: "send-bom",
    searchLabel: "NewMaterialMapping",
    fields: materialFields,
  },
  { label: "Inbound order", value: "inbound", searchLabel: "JoinMapping", fields: materialFields },
  {
    label: "Return BOM",
    value: "return-bom",
    searchLabel: "CancelMaterialMapping",
    fields: materialFields,
  },
  {
    label: "Spare send BOM",
    value: "spare-send-bom",
    searchLabel: "SpareMaterialNo",
    fields: materialFields,
  },
  {
    label: "Spare inbound",
    value: "spare-inbound",
    searchLabel: "SpareMaterialNo",
    fields: materialFields,
  },
  {
    label: "Spare return",
    value: "spare-return",
    searchLabel: "SpareMaterialNo",
    fields: materialFields,
  },
  {
    label: "Sales Order",
    value: "sales-order",
    searchLabel: "InvoicenoMapping",
    fields: [
      { label: "HFJinvoiceno", value: "HFJInvoiceNo" },
      { label: "SFCinvoiceno", value: "SFCInvoiceNo" },
      { label: "GroupID", value: "GroupID" },
    ],
  },
];

const today = new Date();
const monthAgo = new Date(today);
monthAgo.setMonth(monthAgo.getMonth() - 1);
monthAgo.setDate(monthAgo.getDate() + 1);
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const form = reactive({
  mode: "work-order",
  searchField: "SAPWorkOrderNo",
  searchValue: "",
  beginDate: formatDate(monthAgo),
  endDate: formatDate(today),
});
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const excelRowLimitExceeded = ref(false);
const excelMaxRows = ref(65535);
const page = ref(1);
const pageSize = ref(15);
const loading = ref(false);
const exporting = ref(false);
const errorMessage = ref("");

const activeMode = computed(() => modes.find((item) => item.value === form.mode) || modes[0]);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function displayValue(row, column) {
  const result = value(row, column);
  if (!column.toLowerCase().includes("date") || !result) return result ?? "";
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toISOString().replace("T", " ").slice(0, 19);
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  excelRowLimitExceeded.value = Boolean(result.excelRowLimitExceeded);
  excelMaxRows.value = Number(result.excelMaxRows ?? 65535);
  page.value = 1;
}

async function load(includeFilters) {
  if (loading.value) return;
  if (includeFilters && Boolean(form.beginDate) !== Boolean(form.endDate)) {
    ElMessage.warning("BeginDate and EndDate must be supplied together.");
    return;
  }
  if (includeFilters && form.beginDate && form.endDate && form.endDate < form.beginDate) {
    ElMessage.warning("EndDate cannot be earlier than BeginDate.");
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(
      await SearchMappingAPI.search({
        mode: form.mode,
        searchField: form.searchField,
        searchValue: includeFilters ? form.searchValue.trim() : "",
        beginDate: includeFilters ? form.beginDate : "",
        endDate: includeFilters ? form.endDate : "",
      })
    );
  } catch (error) {
    errorMessage.value = error.message || "Unable to load mapping data.";
  } finally {
    loading.value = false;
  }
}

function handleModeChange() {
  form.searchField = activeMode.value.fields[0].value;
  form.searchValue = "";
  load(false);
}

function handleSearch() {
  load(true);
}

async function exportExcel() {
  if (!rows.value.length || exporting.value) return;
  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(activeMode.value.label.slice(0, 31));
    worksheet.columns = columns.value.map((column) => ({ header: column, key: column, width: 22 }));
    worksheet.addRows(rows.value);
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const url = window.URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "detail.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    ElMessage.error(error.message || "Unable to export the Excel file.");
  } finally {
    exporting.value = false;
  }
}

onMounted(() => load(false));
</script>

<style scoped>
.mapping-tabs,
.page-toolbar {
  margin-bottom: 12px;
}

.page-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
</style>
