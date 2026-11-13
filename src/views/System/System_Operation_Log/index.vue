<template>
  <div class="page-container system-operation-log-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="OperationTime">
          <el-date-picker
            v-model="query.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="~"
            start-placeholder="Start date"
            end-placeholder="End date"
            :clearable="false"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label="USER">
          <el-select v-model="query.username" class="user-select" filterable :disabled="loading">
            <el-option v-for="user in users" :key="user" :label="user" :value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
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
          empty-text="No operation logs found"
        >
          <el-table-column prop="id" label="ID" min-width="90" />
          <el-table-column
            prop="forcePage"
            label="ForcePage"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column prop="userName" label="UserName" min-width="140" />
          <el-table-column prop="operationTime" label="operationTime" min-width="180">
            <template #default="{ row }">{{ formatDateTime(row.operationTime) }}</template>
          </el-table-column>
          <el-table-column prop="ipAddress" label="IPAddress" min-width="140" />
          <el-table-column
            prop="description"
            label="Description"
            min-width="260"
            show-overflow-tooltip
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
import SystemOperationLogAPI from "@/api/system/system-operation-log";

defineOptions({ name: "SystemOperationLog" });

const query = reactive({ dateRange: [], username: "ALL" });
const users = ref(["ALL"]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const errorMessage = ref("");
let lastRequest = null;

const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function applyResult(result = {}) {
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  users.value = Array.isArray(result.users) && result.users.length ? result.users : ["ALL"];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  query.dateRange = [result.startDate, result.endDate];
  query.username = result.username || "ALL";
  page.value = 1;
}

async function load(payload = null) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = payload
      ? await SystemOperationLogAPI.search(payload)
      : await SystemOperationLogAPI.getDefault();
    applyResult(result);
    lastRequest = payload ? { ...payload } : null;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load operation logs. Please try again.";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  if (query.dateRange?.length !== 2) {
    errorMessage.value = "Please enter the OperationTime date range.";
    return;
  }

  return load({
    startDate: query.dateRange[0],
    endDate: query.dateRange[1],
    username: query.username,
  });
}

function reload() {
  return load(lastRequest);
}

function formatDateTime(value) {
  return value
    ? String(value)
        .replace("T", " ")
        .replace(/\.\d+$/, "")
    : "";
}

onMounted(() => load());
</script>

<style scoped>
.user-select {
  width: 180px;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
