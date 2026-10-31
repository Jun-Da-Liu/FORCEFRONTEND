<template>
  <div class="page-container customs-mpn-list-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16" align="bottom">
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="PN">
              <el-input v-model="query.pn" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="10" :lg="8">
            <el-form-item label="MPN">
              <el-input v-model="query.mpn" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :lg="8">
            <el-form-item>
              <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
              <el-button :disabled="loading" @click="handleReset">Reset</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-alert
        title="Read-only list is available. Upload and delete are still under review."
        type="warning"
        :closable="false"
        show-icon
      />
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
          min-width="140"
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
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
import CustomsMpnListAPI from "@/api/customs/mpn-upload";

defineOptions({ name: "CustomsMpnUpload" });

const query = reactive({ pn: "", mpn: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const errorMessage = ref("");

const visibleColumns = computed(() =>
  columns.value.filter((column) => column.toLowerCase() !== "id")
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, column) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === column.toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  return column.toLowerCase() === "appoptions" ? "APPOPTIONS" : column;
}

function displayValue(row, column) {
  const current = value(row, column);
  if (!current || !["customsdate", "lasteditdt"].includes(column.toLowerCase()))
    return current ?? "";
  const date = new Date(current);
  if (Number.isNaN(date.getTime())) return current;
  return column.toLowerCase() === "customsdate"
    ? date.toISOString().slice(0, 10)
    : date.toISOString().slice(0, 16).replace("T", " ");
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await CustomsMpnListAPI.search({
      pn: query.pn.trim().replaceAll("'", ""),
      mpn: query.mpn.trim().replaceAll("'", ""),
    });
    columns.value = Array.isArray(result?.columns) ? result.columns : [];
    rows.value = Array.isArray(result?.rows) ? result.rows : [];
    rowCount.value = Number(result?.rowCount ?? rows.value.length);
    page.value = 1;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load MPN mappings.";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load();
}

function handleReset() {
  query.pn = "";
  query.mpn = "";
  return load();
}

onMounted(load);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
