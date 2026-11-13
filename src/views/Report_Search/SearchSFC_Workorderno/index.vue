<template>
  <div class="page-container search-sfc-work-order-page">
    <el-card class="page-search" shadow="never">
      <el-form label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="Workordernos">
          <el-input
            v-model="workOrderNumbers"
            type="textarea"
            :rows="4"
            :disabled="loading"
            placeholder="Separate work-order numbers with commas or new lines"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="workOrderNumbers = ''">Clear</el-button>
        </el-form-item>
      </el-form>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
    </el-card>

    <el-card class="page-content result-card" shadow="never">
      <div class="page-toolbar">
        <strong>WorkorderHead</strong>
        <span>{{ head.rowCount.toLocaleString() }} records</span>
        <el-button
          type="success"
          :loading="exportingHead"
          :disabled="loading || !head.rows.length"
          @click="exportResult(head, 'work-order-head.xlsx', 'WorkorderHead', 'head')"
        >
          ToExcel(Head)
        </el-button>
      </div>
      <el-alert
        v-if="head.excelRowLimitExceeded"
        :title="`Excel export is limited to ${head.excelMaxRows} rows.`"
        type="warning"
        :closable="false"
        show-icon
        class="excel-warning"
      />
      <el-table
        v-loading="loading"
        :data="headPageRows"
        :row-class-name="headRowClassName"
        border
        stripe
        empty-text="No work-order head records found"
      >
        <el-table-column
          v-for="column in head.columns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="150"
        />
      </el-table>
      <Pagination
        v-model:page="headPage"
        v-model:limit="pageSize"
        :total="head.rows.length"
        :page-sizes="[50]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>

    <el-card class="page-content result-card" shadow="never">
      <div class="page-toolbar">
        <strong>WorkorderBody</strong>
        <span>{{ body.rowCount.toLocaleString() }} records</span>
        <el-button
          type="success"
          :loading="exportingBody"
          :disabled="loading || !body.rows.length"
          @click="exportResult(body, 'work-order-body.xlsx', 'WorkorderBody', 'body')"
        >
          ToExcel(Body)
        </el-button>
      </div>
      <el-alert
        v-if="body.excelRowLimitExceeded"
        :title="`Excel export is limited to ${body.excelMaxRows} rows.`"
        type="warning"
        :closable="false"
        show-icon
        class="excel-warning"
      />
      <el-table
        v-loading="loading"
        :data="bodyPageRows"
        :row-class-name="bodyRowClassName"
        border
        stripe
        empty-text="No work-order body records found"
      >
        <el-table-column
          v-for="column in body.columns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="150"
        />
      </el-table>
      <Pagination
        v-model:page="bodyPage"
        v-model:limit="pageSize"
        :total="body.rows.length"
        :page-sizes="[50]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchSfcWorkOrderAPI from "@/api/report-search/search-sfc-work-order";

defineOptions({ name: "SearchSFCWorkorderno" });

const workOrderNumbers = ref("6I0000078166,6I0000078167");
const loading = ref(false);
const exportingHead = ref(false);
const exportingBody = ref(false);
const errorMessage = ref("");
const headPage = ref(1);
const bodyPage = ref(1);
const pageSize = ref(50);
const head = ref(emptyResult());
const body = ref(emptyResult());

const headPageRows = computed(() =>
  head.value.rows.slice((headPage.value - 1) * pageSize.value, headPage.value * pageSize.value)
);
const bodyPageRows = computed(() =>
  body.value.rows.slice((bodyPage.value - 1) * pageSize.value, bodyPage.value * pageSize.value)
);

function emptyResult() {
  return { rowCount: 0, columns: [], rows: [], excelRowLimitExceeded: false, excelMaxRows: 65535 };
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await SearchSfcWorkOrderAPI.search({
      workOrderNumbers: workOrderNumbers.value,
    });
    head.value = result.head || emptyResult();
    body.value = result.body || emptyResult();
    headPage.value = 1;
    bodyPage.value = 1;
  } catch (error) {
    errorMessage.value = error.message || "Unable to search SFC work orders.";
  } finally {
    loading.value = false;
  }
}

function headRowClassName({ row }) {
  return thirdColumnIsNull(head.value, row) ? "legacy-null-row" : "";
}

function bodyRowClassName({ row }) {
  return thirdColumnIsNull(body.value, row) ? "legacy-null-row" : "";
}

function thirdColumnIsNull(result, row) {
  const column = result.columns[2];
  return (
    column &&
    String(row[column] ?? "")
      .trim()
      .toUpperCase() === "NULL"
  );
}

async function exportResult(result, fileName, sheetName, target) {
  const exporting = target === "head" ? exportingHead : exportingBody;
  if (!result.rows.length || exporting.value) return;
  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = result.columns.map((column) => ({
      header: column,
      key: column,
      width: 22,
    }));
    const maxRows = result.excelRowLimitExceeded ? result.excelMaxRows : result.rows.length;
    worksheet.addRows(result.rows.slice(0, maxRows));
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, fileName);
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    ElMessage.error(error.message || "Unable to export the Excel file.");
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
.result-card {
  margin-top: 12px;
}

.page-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.excel-warning {
  margin-bottom: 12px;
}

:deep(.legacy-null-row) {
  --el-table-tr-bg-color: var(--el-color-warning-light-7);
}
</style>
