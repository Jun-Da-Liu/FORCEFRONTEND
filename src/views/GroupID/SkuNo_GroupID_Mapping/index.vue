<template>
  <div class="page-container sku-group-mapping-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" :inline="true" label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="SkuNo">
          <el-input v-model="query.skuNo" clearable :maxlength="200" :disabled="loading" />
        </el-form-item>
        <el-form-item label="GroupID">
          <el-input v-model="query.groupId" clearable :maxlength="200" :disabled="loading" />
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="loadOneGroupMultiPid">
            OneGroupID&amp;MultiPID
          </el-button>
          <el-button :disabled="loading" @click="clearFilters">Clear</el-button>
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
          :data="pageRows"
          row-key="id"
          border
          stripe
          empty-text="No mappings found"
        >
          <el-table-column prop="id" label="ID" width="100" align="center" />
          <el-table-column prop="skuNo" label="SKUNo" min-width="200" />
          <el-table-column prop="groupId" label="GroupID" min-width="200" />
          <el-table-column prop="typeIU" label="Type_IU" min-width="110" align="center" />
          <el-table-column prop="importDate" label="ImportDate" min-width="190" align="center">
            <template #default="{ row }">{{ formatDateTime(row.importDate) }}</template>
          </el-table-column>
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
import MappingAPI from "@/api/group-id/sku-no-group-id-mapping";

defineOptions({ name: "SkuNoGroupIdMapping" });

const query = reactive({ skuNo: "", groupId: "" });
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

function formatDateTime(value) {
  return value ? String(value).replace("T", " ").slice(0, 19) : "";
}

function applyResult(result = {}) {
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

async function load(request = null) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result =
      request?.type === "multi"
        ? await MappingAPI.getOneGroupMultiPid()
        : request
          ? await MappingAPI.search(request)
          : await MappingAPI.getDefault();
    applyResult(result);
    lastRequest = request ? { ...request } : null;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load mappings.";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load({ skuNo: query.skuNo.trim(), groupId: query.groupId.trim() });
}

function loadOneGroupMultiPid() {
  return load({ type: "multi" });
}

function clearFilters() {
  Object.assign(query, { skuNo: "", groupId: "" });
}

function reload() {
  return load(lastRequest);
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
