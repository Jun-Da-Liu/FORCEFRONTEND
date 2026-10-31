<template>
  <div class="page-container del-cus-upload-material-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="query" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="MaterialNO">
              <el-input v-model="query.materialNo" clearable maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="SN">
              <el-input v-model="query.sn" clearable maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="SN search mode">
              <el-select v-model="query.searchState" class="full-width">
                <el-option label="Precise" :value="1" />
                <el-option label="Fuzzy" :value="2" />
                <el-option label="Greater than" :value="3" />
                <el-option label="Less than" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading || deleting" @click="handleReset">Reset</el-button>
          <el-button
            type="danger"
            :disabled="!selection.length || loading"
            :loading="deleting"
            @click="handleDelete"
          >
            Delete selected
          </el-button>
        </el-space>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <span>{{ result.rowCount.toLocaleString() }} records</span>
        <span v-if="selection.length">{{ selection.length }} selected</span>
      </div>
      <el-table
        v-loading="loading"
        :data="pageRows"
        border
        stripe
        row-key="ID"
        empty-text="No records found"
        @selection-change="selection = $event"
      >
        <el-table-column type="selection" width="52" />
        <el-table-column
          v-for="column in visibleColumns"
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
        :page-sizes="[20, 100]"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import DelCusUploadMaterialAPI from "@/api/customs-registration/del-cus-upload-material";

defineOptions({ name: "DelCusUploadMaterial" });

const emptyResult = () => ({ rowCount: 0, columns: [], rows: [] });
const query = reactive({ materialNo: "", sn: "", searchState: 1 });
const result = reactive(emptyResult());
const selection = ref([]);
const loading = ref(false);
const deleting = ref(false);
const page = ref(1);
const pageSize = ref(20);

const visibleColumns = computed(() =>
  result.columns.filter((column) => column.toLowerCase() !== "id")
);
const pageRows = computed(() =>
  result.rows.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function payload() {
  return {
    materialNo: query.materialNo.trim().replaceAll("'", ""),
    sn: query.sn.trim().replaceAll("'", ""),
    searchState: query.searchState,
  };
}

function value(row, column) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === column.toLowerCase());
  return key ? row[key] : "";
}

function displayValue(row, column) {
  const current = value(row, column);
  if (column.toLowerCase() !== "importdatetime" || !current) return current ?? "";
  const date = new Date(current);
  if (Number.isNaN(date.getTime())) return current;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function validateSn() {
  if (!query.sn || /^\d*$/.test(query.sn.trim())) return true;
  ElMessage.warning("SN must contain digits only.");
  return false;
}

async function load(initial = false) {
  if (!validateSn()) return;
  loading.value = true;
  selection.value = [];
  try {
    const data = initial
      ? await DelCusUploadMaterialAPI.getInitial()
      : await DelCusUploadMaterialAPI.search(payload());
    Object.assign(result, data);
    page.value = 1;
  } catch (error) {
    ElMessage.error(error.message || "Unable to load customs material data.");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pageSize.value = 100;
  return load();
}

function handleReset() {
  Object.assign(query, { materialNo: "", sn: "", searchState: 1 });
  pageSize.value = 20;
  return load(true);
}

async function handleDelete() {
  if (!selection.value.length || deleting.value) return;
  await ElMessageBox.confirm(
    `Delete ${selection.value.length} selected material row(s)?`,
    "Confirm deletion",
    { type: "warning", confirmButtonText: "Delete" }
  );
  deleting.value = true;
  try {
    const items = selection.value.map((row) => ({
      materialNo: String(value(row, "MaterialNO") ?? ""),
      sn: String(value(row, "SN") ?? ""),
    }));
    await DelCusUploadMaterialAPI.deleteRows(items);
    ElMessage.success("Selected rows were deleted.");
    await load();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the selected rows.");
    }
  } finally {
    deleting.value = false;
  }
}

onMounted(() => load(true));
</script>

<style scoped>
.page-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
.full-width {
  width: 100%;
}
</style>
