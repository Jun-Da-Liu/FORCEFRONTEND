<template>
  <div class="page-container customs-group-id-list-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :md="8">
            <el-form-item label="Date of Application">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="Start date"
                end-placeholder="End date"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="4">
            <el-form-item label="SKUNO">
              <el-input v-model="query.skuNo" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="4">
            <el-form-item label="Group ID">
              <el-input v-model="query.groupId" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="4">
            <el-form-item label="Source code">
              <el-select v-model="query.sourceCode" class="full-width">
                <el-option
                  v-for="item in ['A', 'P', 'M']"
                  :key="item"
                  :label="item === 'A' ? 'ALL' : item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="4">
            <el-form-item label="Upload picture">
              <el-select v-model="query.imageFlag" class="full-width">
                <el-option
                  v-for="item in ['A', 'N', 'Y']"
                  :key="item"
                  :label="item === 'A' ? 'ALL' : item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="handleReset">ReSet</el-button>
          <el-button type="success" :loading="exporting" @click="handleExport">To Excel</el-button>
        </el-space>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ result.rowCount.toLocaleString() }} records</div>
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No records found">
        <el-table-column
          v-for="column in result.columns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="140"
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
        </el-table-column>
      </el-table>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="result.rows.length"
        :page-sizes="[20]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import CustomsGroupIdListAPI from "@/api/customs/customs-group-id-list";

defineOptions({ name: "CustomsGroupIdList" });

const emptyResult = () => ({
  rowCount: 0,
  excelMaxRows: 65535,
  excelRowLimitExceeded: false,
  columns: [],
  rows: [],
});
const query = reactive({ skuNo: "", groupId: "", sourceCode: "A", imageFlag: "A" });
const dateRange = ref([]);
const result = reactive(emptyResult());
const loading = ref(false);
const exporting = ref(false);
const page = ref(1);
const pageSize = ref(20);

const pageRows = computed(() =>
  result.rows.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function payload() {
  return {
    startDate: dateRange.value?.[0] || null,
    endDate: dateRange.value?.[1] || null,
    skuNo: query.skuNo.trim().replaceAll("'", ""),
    groupId: query.groupId.trim().replaceAll("'", ""),
    sourceCode: query.sourceCode,
    imageFlag: query.imageFlag,
  };
}

function value(row, column) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === column.toLowerCase());
  return key ? row[key] : "";
}

function displayValue(row, column) {
  const current = value(row, column);
  if (column.toLowerCase() !== "applydate" || !current) return current ?? "";
  const date = new Date(current);
  return Number.isNaN(date.getTime()) ? current : date.toISOString().slice(0, 10);
}

async function load() {
  loading.value = true;
  try {
    Object.assign(result, await CustomsGroupIdListAPI.search(payload()));
    page.value = 1;
  } catch (error) {
    ElMessage.error(error.message || "Unable to load Group ID 9-2-8 data.");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load();
}

function handleReset() {
  dateRange.value = [];
  Object.assign(query, { skuNo: "", groupId: "", sourceCode: "A", imageFlag: "A" });
  load();
}

async function handleExport() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const exportResult = await CustomsGroupIdListAPI.exportRows(payload());
    if (exportResult.excelRowLimitExceeded) {
      ElMessage.warning(`Excel export is limited to ${exportResult.excelMaxRows} rows.`);
      return;
    }
    if (!exportResult.rows.length) {
      ElMessage.warning("No records to export.");
      return;
    }
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Group ID 9-2-8 list");
    worksheet.columns = exportResult.columns.map((column) => ({
      header: column,
      key: column,
      width: 22,
    }));
    worksheet.addRows(exportResult.rows);
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true };
    saveWorkbook(await workbook.xlsx.writeBuffer());
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    ElMessage.error(error.message || "Unable to export the Excel file.");
  } finally {
    exporting.value = false;
  }
}

function saveWorkbook(buffer) {
  const type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const url = window.URL.createObjectURL(new Blob([buffer], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "Group_ID_9_2_8_list.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

onMounted(load);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
.full-width {
  width: 100%;
}
</style>
