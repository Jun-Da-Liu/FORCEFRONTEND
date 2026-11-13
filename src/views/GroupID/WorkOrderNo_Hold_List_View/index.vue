<template>
  <div class="page-container work-order-hold-list-view-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16" align="bottom">
          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item label="WorkOrderNo">
              <el-input v-model="query.workOrderNo" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="8">
            <el-form-item>
              <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
            </el-form-item>
          </el-col>
        </el-row>
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
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No records found">
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="150"
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
        :page-sizes="[20]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import Pagination from "@/components/Pagination/index.vue";
import WorkOrderNoHoldListAPI from "@/api/group-id/work-order-no-hold-list";

defineOptions({ name: "WorkOrderNoHoldListView" });

const query = reactive({ workOrderNo: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const errorMessage = ref("");

const hiddenColumns = new Set(["id", "description"]);
const visibleColumns = computed(() =>
  columns.value.filter((column) => !hiddenColumns.has(column.toLowerCase()))
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  const labels = { row_no: "No", joinby: "WorkOrderNo", importdate: "ImportTime" };
  return labels[column.toLowerCase()] || column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (column.toLowerCase() !== "importdate" || !result) return result ?? "";
  const date = new Date(result);
  if (Number.isNaN(date.getTime())) return result;
  return date.toISOString().slice(0, 10);
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

async function load(workOrderNo = "") {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await WorkOrderNoHoldListAPI.search(workOrderNo));
  } catch (error) {
    errorMessage.value = error.message || "Unable to load work-order hold records.";
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  const workOrderNo = query.workOrderNo.trim().replaceAll("'", "");
  await load(workOrderNo);
}

onMounted(() => load());
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
