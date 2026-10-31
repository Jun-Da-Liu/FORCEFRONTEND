<template>
  <div class="page-container invoice-work-order-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="InvoiceNo">
          <el-input v-model="query.invoiceNo" clearable :maxlength="200" :disabled="loading" />
        </el-form-item>
        <el-form-item label="WorkOrderNo">
          <el-input v-model="query.workOrderNo" clearable :maxlength="200" :disabled="loading" />
        </el-form-item>
        <el-form-item label="GroupID">
          <el-input v-model="query.groupId" clearable :maxlength="200" :disabled="loading" />
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="handleClear">Clear</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <span>{{ rowCount.toLocaleString() }} record{{ rowCount === 1 ? "" : "s" }}</span>
        <el-button :disabled="loading" @click="reload">Reload</el-button>
      </div>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />

      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          class="page-table"
          :data="pageRows"
          row-key="id"
          border
          stripe
          highlight-current-row
          empty-text="No mappings found"
          @sort-change="handleSortChange"
        >
          <el-table-column type="index" label="ID" width="80" :index="rowNumber" />
          <el-table-column prop="invoiceNo" label="InvoiceNo" min-width="160" sortable="custom" />
          <el-table-column
            prop="workOrderNo"
            label="WorkOrderNo"
            min-width="160"
            sortable="custom"
          />
          <el-table-column prop="skuNo" label="SkuNo" min-width="150" sortable="custom" />
          <el-table-column prop="groupId" label="GroupID" min-width="170" sortable="custom" />
          <el-table-column
            prop="productQty"
            label="ProductQty"
            min-width="130"
            align="right"
            sortable="custom"
          />
          <el-table-column
            prop="orderQty"
            label="OrderQty"
            min-width="120"
            align="right"
            sortable="custom"
          />
        </el-table>
      </div>

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
import MappingAPI from "@/api/report-search/invoice-no-work-order-no-mapping";

defineOptions({ name: "InvoiceNoWorkOrderNoMapping" });

const query = reactive({ invoiceNo: "", workOrderNo: "", groupId: "" });
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const errorMessage = ref("");
const sortState = reactive({ prop: "invoiceNo", order: "ascending" });
let lastRequest = null;

const sortedRows = computed(() => {
  const result = [...rows.value];
  const direction = sortState.order === "descending" ? -1 : 1;
  const prop = sortState.prop;

  return result.sort((left, right) => {
    const primary = compareValues(left[prop], right[prop]) * direction;
    if (primary !== 0 || prop !== "invoiceNo") return primary;
    return compareValues(left.workOrderNo, right.workOrderNo);
  });
});

const pageRows = computed(() =>
  sortedRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function applyResult(result = {}) {
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

async function load(payload = null) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = payload ? await MappingAPI.search(payload) : await MappingAPI.getDefault();
    applyResult(result);
    lastRequest = payload ? { ...payload } : null;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load mappings. Please try again.";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load({
    invoiceNo: query.invoiceNo.trim(),
    workOrderNo: query.workOrderNo.trim(),
    groupId: query.groupId.trim(),
  });
}

function handleClear() {
  Object.assign(query, { invoiceNo: "", workOrderNo: "", groupId: "" });
}

function reload() {
  return load(lastRequest);
}

function handleSortChange({ prop, order }) {
  sortState.prop = prop || "invoiceNo";
  sortState.order = order || "ascending";
  page.value = 1;
}

function compareValues(left, right) {
  if (left === right) return 0;
  if (left === null || left === undefined) return -1;
  if (right === null || right === undefined) return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function rowNumber(index) {
  return (page.value - 1) * pageSize.value + index + 1;
}

onMounted(() => load());
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
