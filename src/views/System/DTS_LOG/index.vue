<template>
  <div class="page-container">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" @submit.prevent="load">
        <el-form-item label="DTS name">
          <el-select v-model="query.name" filterable class="name-select">
            <el-option label="All" value="%" />
            <el-option v-for="name in names" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="Cutoff time">
          <el-date-picker
            v-model="query.since"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
        </el-form-item>
      </el-form>
      <el-alert
        title="Showing the default package log only. Package details and system-log links require their database contracts."
        type="warning"
        :closable="false"
        show-icon
      />
    </el-card>
    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ rows.length.toLocaleString() }} records</div>
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" />
      <el-table v-loading="loading" :data="rows" border stripe empty-text="No DTS logs found">
        <el-table-column label="DTS name" min-width="200">
          <template #default="{ row }">{{ value(row, "Name2") || value(row, "Name") }}</template>
        </el-table-column>
        <el-table-column label="Description" min-width="220">
          <template #default="{ row }">{{ value(row, "Description") }}</template>
        </el-table-column>
        <el-table-column label="Status" min-width="100">
          <template #default="{ row }">
            <span :title="value(row, 'ErrorDescription')">{{ value(row, "ErrorCode") }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Start time" min-width="170">
          <template #default="{ row }">{{ formatDate(value(row, "StartTime")) }}</template>
        </el-table-column>
        <el-table-column label="End time" min-width="170">
          <template #default="{ row }">{{ formatDate(value(row, "EndTime")) }}</template>
        </el-table-column>
        <el-table-column label="Elapsed seconds" min-width="150">
          <template #default="{ row }">{{ value(row, "ElapsedTime") }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import DtsLogAPI from "@/api/system/dts-log";

defineOptions({ name: "DtsLogRead" });

function localDateTime(value) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

const query = reactive({
  name: "%",
  since: localDateTime(new Date(Date.now() - 3 * 60 * 60 * 1000)),
});
const names = ref([]);
const rows = ref([]);
const loading = ref(false);
const errorMessage = ref("");

function value(row, column) {
  const key = Object.keys(row).find((name) => name.toLowerCase() === column.toLowerCase());
  return key ? (row[key] ?? "") : "";
}

function formatDate(value) {
  return value ? String(value).replace("T", " ").slice(0, 19) : "";
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await DtsLogAPI.search(query);
    rows.value = Array.isArray(result?.rows) ? result.rows : [];
    if (result?.since) query.since = result.since;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load DTS logs.";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const result = await DtsLogAPI.getNames();
    names.value = Array.isArray(result) ? result : [];
  } catch (error) {
    errorMessage.value = error.message || "Unable to load DTS names.";
  }
  await load();
});
</script>

<style scoped>
.name-select {
  width: 260px;
}
.page-toolbar {
  margin-bottom: 12px;
}
</style>
