<template>
  <div class="page-container pn-short-pn-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="form" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :md="8">
            <el-form-item label="PartNo">
              <el-input v-model="form.partNo" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="ShortPartNo">
              <el-input v-model="form.shortPartNo" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="Description">
              <el-input v-model="form.description" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="primary" :loading="loading" @click="handleSearch">Search</el-button>
          <el-button type="success" :loading="saving" @click="handleSave">Save</el-button>
          <el-button :disabled="loading || saving" @click="handleClear">Clear</el-button>
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
          min-width="140"
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
        </el-table-column>
        <el-table-column label="Edit" width="80" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="openEdit(scope.row)">Edit</el-button>
          </template>
        </el-table-column>
        <el-table-column label="Del" width="80" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="danger" @click="handleDelete(scope.row)">Del</el-button>
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

    <el-dialog v-model="editVisible" title="Edit PN Mapping" width="560px" destroy-on-close>
      <el-form label-position="top" @submit.prevent="handleUpdate">
        <el-form-item label="PartNo">
          <el-input v-model="editForm.partNo" :maxlength="20" />
        </el-form-item>
        <el-form-item label="ShortPartNo">
          <el-input v-model="editForm.shortPartNo" :maxlength="20" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="editVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="handleUpdate">OK</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import PnShortPnMappingAPI from "@/api/group-id/pn-short-pn-mapping";

defineOptions({ name: "PnShortPnMapping" });

const form = reactive({ partNo: "", shortPartNo: "", description: "" });
const editForm = reactive({ id: 0, partNo: "", shortPartNo: "", description: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);
const editVisible = ref(false);

const visibleColumns = computed(() =>
  columns.value.filter((column) => column.toLowerCase() !== "id")
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  return column.toLowerCase() === "row_no" ? "No" : column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (column.toLowerCase() !== "importtime" || !result) return result ?? "";
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toISOString().slice(0, 10);
}

function clean(value) {
  return String(value || "")
    .trim()
    .replaceAll("'", "");
}

function payloadFrom(source) {
  return {
    partNo: clean(source.partNo),
    shortPartNo: clean(source.shortPartNo),
    description: String(source.description || "").trim(),
  };
}

function validate(source) {
  const payload = payloadFrom(source);
  if (!payload.partNo) {
    ElMessage.warning("Please enter PartNo");
    return null;
  }
  if (!payload.shortPartNo) {
    ElMessage.warning("Please enter ShortPartNo");
    return null;
  }
  return payload;
}

async function load(params = {}) {
  loading.value = true;
  try {
    const result = await PnShortPnMappingAPI.query(params);
    columns.value = Array.isArray(result.columns) ? result.columns : [];
    rows.value = Array.isArray(result.rows) ? result.rows : [];
    rowCount.value = Number(result.rowCount ?? rows.value.length);
    page.value = 1;
  } catch (error) {
    ElMessage.error(error.message || "Unable to load PN mappings.");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load(payloadFrom(form));
}

function handleClear() {
  Object.assign(form, { partNo: "", shortPartNo: "", description: "" });
  load();
}

async function handleSave() {
  if (saving.value) return;
  const payload = validate(form);
  if (!payload) return;
  saving.value = true;
  try {
    await PnShortPnMappingAPI.create(payload);
    Object.assign(form, { partNo: "", shortPartNo: "", description: "" });
    ElMessage.success("Successfully saved!");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to save the PN mapping.");
  } finally {
    saving.value = false;
  }
}

function openEdit(row) {
  Object.assign(editForm, {
    id: Number(value(row, "ID")),
    partNo: String(value(row, "PartNo") ?? ""),
    shortPartNo: String(value(row, "ShortPartNo") ?? ""),
    description: String(value(row, "Description") ?? ""),
  });
  editVisible.value = editForm.id > 0;
}

async function handleUpdate() {
  if (saving.value || editForm.id <= 0) return;
  const payload = validate(editForm);
  if (!payload) return;
  saving.value = true;
  try {
    await PnShortPnMappingAPI.update(editForm.id, payload);
    editVisible.value = false;
    ElMessage.success("Successfully modified!");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to modify the PN mapping.");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  const id = Number(value(row, "ID"));
  const partNo = String(value(row, "PartNo") ?? "");
  if (id <= 0) return;
  try {
    await ElMessageBox.confirm(
      `Confirm to delete PartNo [${partNo}] record?`,
      "Delete confirmation",
      {
        type: "warning",
        confirmButtonText: "Delete",
      }
    );
    await PnShortPnMappingAPI.remove(id);
    ElMessage.success("Successfully deleted!");
    await load();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the PN mapping.");
    }
  }
}

onMounted(() => load());
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
