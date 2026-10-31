<template>
  <div class="page-container group-id-replace-mapping-view-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="SkuNo">
              <el-input v-model="query.skuNo" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="GroupID">
              <el-input v-model="query.groupId" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="ReplaceGroupID">
              <el-input v-model="query.replaceGroupId" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="Rate">
              <el-input
                v-model="query.rate"
                clearable
                placeholder="Legacy view does not filter by Rate"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="handleClear">Clear</el-button>
        </el-space>
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
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import GroupIdReplaceMappingViewAPI from "@/api/group-id/group-id-replace-mapping-view";

defineOptions({ name: "GroupIdReplaceMappingView" });

const query = reactive({ skuNo: "", groupId: "", replaceGroupId: "", rate: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

const visibleColumns = computed(() =>
  columns.value.filter((column) => String(column).toLowerCase() !== "id")
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  const labels = { row_no: "No", importdatetime: "ImportTime" };
  return labels[String(column).toLowerCase()] || column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (String(column).toLowerCase() !== "importdatetime" || !result) return result ?? "";
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toISOString().slice(0, 10);
}

function clean(input) {
  return String(input || "")
    .trim()
    .replaceAll("'", "");
}

function payload() {
  return {
    skuNo: clean(query.skuNo),
    groupId: clean(query.groupId),
    replaceGroupId: clean(query.replaceGroupId),
  };
}

function isValid(input) {
  return /^[- /_=+.0-9a-zA-Z]{0,20}$/.test(input);
}

async function load() {
  if (loading.value) return;
  const request = payload();
  if (![request.skuNo, request.groupId, request.replaceGroupId].every(isValid)) {
    ElMessage.warning(
      "The text must be at most 20 characters and contain only letters, numbers, spaces, -, /, _, =, + or ."
    );
    return;
  }

  loading.value = true;
  try {
    const result = await GroupIdReplaceMappingViewAPI.search(request);
    columns.value = Array.isArray(result.columns) ? result.columns : [];
    rows.value = Array.isArray(result.rows) ? result.rows : [];
    rowCount.value = Number(result.rowCount ?? rows.value.length);
    page.value = 1;
  } catch (error) {
    ElMessage.error(error.message || "Unable to load GroupID replacement mappings.");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load();
}

function handleClear() {
  Object.assign(query, { skuNo: "", groupId: "", replaceGroupId: "", rate: "" });
  load();
}

onMounted(load);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
