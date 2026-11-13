<template>
  <div class="page-container so-ss-ln-delete-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="4">
            <el-form-item label="SO">
              <el-input v-model="query.so" :maxlength="100" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="4">
            <el-form-item label="SS">
              <el-input v-model="query.ss" :maxlength="100" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="4">
            <el-form-item label="LN">
              <el-input v-model="query.ln" :maxlength="100" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="5">
            <el-form-item label="OriginalPN">
              <el-select
                v-model="query.originalPn"
                clearable
                filterable
                style="width: 100%"
                @change="loadUpdatedPns"
              >
                <el-option v-for="item in originalPns" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="5">
            <el-form-item label="UpdatedPN">
              <el-select v-model="query.updatedPn" clearable filterable style="width: 100%">
                <el-option v-for="item in updatedPns" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="2" class="action-column">
            <el-form-item label=" ">
              <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
            </el-form-item>
          </el-col>
        </el-row>
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
          min-width="125"
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
        </el-table-column>
        <el-table-column label="Del" width="90" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="danger" :loading="deleting" @click="deleteRecord(scope.row)">
              Delete
            </el-button>
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
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SoSsLnDeleteAPI from "@/api/group-id/so-ss-ln-delete";

defineOptions({ name: "SoSsLnDelete" });

const query = reactive({ so: "", ss: "", ln: "", originalPn: "", updatedPn: "" });
const originalPns = ref([]);
const updatedPns = ref([]);
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const deleting = ref(false);

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

function clean(input) {
  return String(input || "")
    .trim()
    .replaceAll("'", "");
}

function columnLabel(column) {
  return String(column).toLowerCase() === "importdatetime" ? "Importdate" : column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (String(column).toLowerCase() !== "importdatetime" || !result) return result ?? "";
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toLocaleDateString();
}

function payload(source = query) {
  return {
    so: clean(source.so),
    ss: clean(source.ss),
    ln: clean(source.ln),
    originalPn: clean(source.originalPn),
    updatedPn: clean(source.updatedPn),
  };
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
}

async function loadInitial() {
  loading.value = true;
  try {
    const [result, pnValues] = await Promise.all([
      SoSsLnDeleteAPI.getInitial(),
      SoSsLnDeleteAPI.getOriginalPns(),
    ]);
    applyResult(result);
    originalPns.value = Array.isArray(pnValues) ? pnValues : [];
  } catch (error) {
    ElMessage.error(error.message || "Unable to load SO/SS/LN replacement records.");
  } finally {
    loading.value = false;
  }
}

async function loadUpdatedPns(originalPn) {
  query.updatedPn = "";
  updatedPns.value = [];
  if (!originalPn) return;
  try {
    const result = await SoSsLnDeleteAPI.getUpdatedPns(originalPn);
    updatedPns.value = Array.isArray(result) ? result : [];
  } catch (error) {
    ElMessage.error(error.message || "Unable to load UpdatedPN values.");
  }
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  try {
    applyResult(await SoSsLnDeleteAPI.search(payload()));
  } catch (error) {
    ElMessage.error(error.message || "Unable to search SO/SS/LN replacement records.");
  } finally {
    loading.value = false;
  }
}

async function deleteRecord(row) {
  if (deleting.value) return;
  const request = payload({
    so: value(row, "SO"),
    ss: value(row, "SS"),
    ln: value(row, "LN"),
    originalPn: value(row, "OriginalPN"),
    updatedPn: value(row, "UpdatedPN"),
  });
  try {
    await ElMessageBox.confirm(
      `Confirm deleting the record whose OriginalPN is [${request.originalPn}]?`,
      "Delete confirmation",
      { type: "warning", confirmButtonText: "Delete" }
    );
    deleting.value = true;
    await SoSsLnDeleteAPI.deleteRecord(request);
    ElMessage.success("Successfully deleted!");
    await handleSearch();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the record.");
    }
  } finally {
    deleting.value = false;
  }
}

onMounted(loadInitial);
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}

.action-column {
  display: flex;
  align-items: flex-end;
}
</style>
