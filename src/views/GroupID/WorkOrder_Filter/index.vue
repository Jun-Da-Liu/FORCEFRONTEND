<template>
  <div class="page-container work-order-filter-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="form" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :md="8">
            <el-form-item label="SO">
              <el-input v-model="form.so" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="SS">
              <el-input v-model="form.ss" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="LN">
              <el-input v-model="form.ln" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="success" :loading="saving" @click="handleAdd">ADD</el-button>
          <el-button type="primary" :loading="loading" @click="handleSearch">Search</el-button>
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

    <el-dialog v-model="editVisible" title="Edit Work Order Filter" width="520px" destroy-on-close>
      <el-form label-position="top" @submit.prevent="handleUpdate">
        <el-form-item label="SO">
          <el-input v-model="editForm.so" :maxlength="20" />
        </el-form-item>
        <el-form-item label="SS">
          <el-input v-model="editForm.ss" :maxlength="20" />
        </el-form-item>
        <el-form-item label="LN">
          <el-input v-model="editForm.ln" :maxlength="20" />
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
import WorkOrderFilterAPI from "@/api/group-id/work-order-filter";

defineOptions({ name: "WorkOrderFilter" });

const form = reactive({ so: "", ss: "", ln: "" });
const editForm = reactive({ id: 0, so: "", ss: "", ln: "" });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);
const editVisible = ref(false);

const visibleColumns = computed(() =>
  columns.value.filter((column) => !["id", "isdel"].includes(String(column).toLowerCase()))
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

function clean(input) {
  return String(input || "")
    .trim()
    .replaceAll("'", "");
}

function payloadFrom(source) {
  return { so: clean(source.so), ss: clean(source.ss), ln: clean(source.ln) };
}

function validate(source, editing = false) {
  const payload = payloadFrom(source);
  if (!payload.so) {
    ElMessage.warning(editing ? "You cannot change SO to empty" : "Please enter SO");
    return null;
  }
  if (!payload.ss) {
    ElMessage.warning(editing ? "You cannot change SS to empty" : "Please enter SS");
    return null;
  }
  if (!payload.ln) {
    ElMessage.warning(editing ? "You cannot change LN to empty" : "Please enter LN");
    return null;
  }
  return payload;
}

async function load(params = {}) {
  loading.value = true;
  try {
    const result = await WorkOrderFilterAPI.query(params);
    columns.value = Array.isArray(result.columns) ? result.columns : [];
    rows.value = Array.isArray(result.rows) ? result.rows : [];
    rowCount.value = Number(result.rowCount ?? rows.value.length);
    page.value = 1;
  } catch (error) {
    ElMessage.error(error.message || "Unable to load work-order filters.");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load(payloadFrom(form));
}

async function handleAdd() {
  if (saving.value) return;
  const payload = validate(form);
  if (!payload) return;
  saving.value = true;
  try {
    await WorkOrderFilterAPI.create(payload);
    Object.assign(form, { so: "", ss: "", ln: "" });
    ElMessage.success("Successfully saved!");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to save the work-order filter.");
  } finally {
    saving.value = false;
  }
}

function openEdit(row) {
  Object.assign(editForm, {
    id: Number(value(row, "ID")),
    so: String(value(row, "SO") ?? ""),
    ss: String(value(row, "SS") ?? ""),
    ln: String(value(row, "LN") ?? ""),
  });
  editVisible.value = editForm.id > 0;
}

async function handleUpdate() {
  if (saving.value || editForm.id <= 0) return;
  const payload = validate(editForm, true);
  if (!payload) return;
  saving.value = true;
  try {
    await WorkOrderFilterAPI.update(editForm.id, payload);
    editVisible.value = false;
    ElMessage.success("Successfully modified!");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to modify the work-order filter.");
  } finally {
    saving.value = false;
  }
}

function deleteMessage(row) {
  const isDel = Number(value(row, "IsDel"));
  if (isDel === 0) {
    return "No 7B5 ticket number with ARRIVE status, please check. Do you still want to delete this record?";
  }
  if (isDel === 2) {
    return "This record corresponds to multiple work orders, please check. Do you still want to delete this record?";
  }
  return `Confirm to delete SO [${value(row, "SO")}], SS [${value(row, "SS")}], LN [${value(row, "LN")}] record?`;
}

async function handleDelete(row) {
  const id = Number(value(row, "ID"));
  if (id <= 0) return;
  try {
    await ElMessageBox.confirm(deleteMessage(row), "Delete confirmation", {
      type: "warning",
      confirmButtonText: "Delete",
    });
    await WorkOrderFilterAPI.remove(id);
    ElMessage.success("Successfully deleted!");
    await load();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the work-order filter.");
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
