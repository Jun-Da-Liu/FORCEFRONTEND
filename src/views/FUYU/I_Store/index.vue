<template>
  <div class="page-container i-store-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="BeginDate ~ EndDate">
          <el-date-picker
            v-model="query.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="~"
            start-placeholder="BeginDate"
            end-placeholder="EndDate"
            :clearable="false"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label="Search by">
          <el-select v-model="query.searchBy" class="search-by" :disabled="loading">
            <el-option label="ReceiptNo" value="ReceiptNo" />
            <el-option label="PN" value="PN" />
          </el-select>
        </el-form-item>
        <el-form-item label="Search">
          <el-input
            v-model="query.searchText"
            placeholder="Enter a prefix"
            clearable
            :maxlength="3999"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <span>{{ rows.length.toLocaleString() }} records</span>
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
          empty-text="No receipts found"
        >
          <el-table-column prop="receiptNo" label="ReceiptNo" min-width="160" />
          <el-table-column prop="pn" label="PN" min-width="150" />
          <el-table-column prop="receiptQty" label="ReceiptQTY" min-width="130" align="right" />
          <el-table-column prop="returnedQty" label="ReturnedQTY" min-width="130" align="right" />
          <el-table-column
            prop="currentReturnQty"
            label="CurrentReturnQTY"
            min-width="160"
            align="right"
          />
          <el-table-column prop="dwQty" label="DW_QTY" min-width="110" align="right" />
          <el-table-column prop="price" label="Price" min-width="110" align="right" />
          <el-table-column prop="receiptDate" label="ReceiptDate" min-width="180">
            <template #default="{ row }">{{ formatDateTime(row.receiptDate) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="rows.length"
        :page-sizes="[15]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import Pagination from "@/components/Pagination/index.vue";
import IStoreAPI from "@/api/fuyu/i-store";

defineOptions({ name: "IStore" });

const query = reactive({ dateRange: [], searchBy: "ReceiptNo", searchText: "" });
const rows = ref([]);
const page = ref(1);
const pageSize = ref(15);
const loading = ref(false);
const errorMessage = ref("");
let lastRequest = null;
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function formatDateTime(value) {
  return value ? String(value).replace("T", " ").slice(0, 19) : "";
}

async function load(payload = null) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = payload ? await IStoreAPI.search(payload) : await IStoreAPI.getList();
    rows.value = result.rows;
    page.value = 1;
    if (!payload) query.dateRange = [result.beginDate, result.endDate];
    lastRequest = payload ? { ...payload } : null;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load receipts. Please try again.";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  if (query.dateRange?.length !== 2) {
    errorMessage.value = "Please enter BeginDate and EndDate.";
    return;
  }
  return load({
    beginDate: query.dateRange[0],
    endDate: query.dateRange[1],
    searchBy: query.searchBy,
    searchText: query.searchText.trim(),
  });
}

function reload() {
  return load(lastRequest);
}

onMounted(() => load());
</script>

<style scoped>
.search-by {
  width: 150px;
}
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
