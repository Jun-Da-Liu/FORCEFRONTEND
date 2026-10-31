<template>
  <div class="page-container update-part-no-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="form" label-position="top" @submit.prevent="handleAdd">
        <el-row :gutter="16">
          <el-col v-for="field in fields" :key="field.key" :xs="24" :sm="12" :lg="4">
            <el-form-item :label="field.label">
              <el-input v-model="form[field.key]" :maxlength="50" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="4" class="action-column">
            <el-form-item label=" ">
              <el-button native-type="submit" type="primary" :loading="saving">ADD</el-button>
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
          min-width="120"
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
        </el-table-column>
        <el-table-column label="Edit" width="90" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="openEdit(scope.row)">Edit</el-button>
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

    <el-dialog v-model="editVisible" title="Edit NewPN" width="480px" destroy-on-close>
      <el-form label-position="top" @submit.prevent="handleUpdate">
        <el-form-item label="NewPN">
          <el-input v-model="editForm.newPn" :maxlength="50" />
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
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import UpdatePartNoAPI from "@/api/group-id/update-part-no";

defineOptions({ name: "UpdatePartNo" });

const fields = [
  { key: "so", label: "SO" },
  { key: "ss", label: "SS" },
  { key: "ln", label: "LN" },
  { key: "oldPn", label: "OldPN" },
  { key: "newPn", label: "NewPN" },
];
const form = reactive({ so: "", ss: "", ln: "", oldPn: "", newPn: "" });
const editForm = reactive({ id: 0, so: "", ss: "", ln: "", oldPn: "", newPn: "" });
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
  const labels = { row_no: "No", originalpn: "OldPN", updatedpn: "NewPN" };
  return labels[column.toLowerCase()] || column;
}

function displayValue(row, column) {
  const result = value(row, column);
  if (column.toLowerCase() !== "importdatetime" || !result) return result ?? "";
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? result : date.toISOString().slice(0, 10);
}

function clean(input) {
  return String(input || "")
    .trim()
    .replaceAll("'", "");
}

function validate(source) {
  const payload = Object.fromEntries(fields.map(({ key }) => [key, clean(source[key])]));
  const missing = fields.find(({ key }) => !payload[key]);
  if (missing) {
    ElMessage.warning(`Please enter ${missing.label}`);
    return null;
  }
  return payload;
}

async function load() {
  loading.value = true;
  try {
    const result = await UpdatePartNoAPI.getAll();
    columns.value = Array.isArray(result.columns) ? result.columns : [];
    rows.value = Array.isArray(result.rows) ? result.rows : [];
    rowCount.value = Number(result.rowCount ?? rows.value.length);
    page.value = 1;
  } catch (error) {
    ElMessage.error(error.message || "Unable to load PartNo updates.");
  } finally {
    loading.value = false;
  }
}

async function handleAdd() {
  if (saving.value) return;
  const payload = validate(form);
  if (!payload) return;
  saving.value = true;
  try {
    await UpdatePartNoAPI.create(payload);
    fields.forEach(({ key }) => (form[key] = ""));
    ElMessage.success("Successfully saved!");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to save the record.");
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
    oldPn: String(value(row, "OriginalPN") ?? ""),
    newPn: String(value(row, "UpdatedPN") ?? ""),
  });
  editVisible.value = editForm.id > 0;
}

async function handleUpdate() {
  if (saving.value || editForm.id <= 0) return;
  const payload = validate(editForm);
  if (!payload) return;
  saving.value = true;
  try {
    await UpdatePartNoAPI.update(editForm.id, payload);
    editVisible.value = false;
    ElMessage.success("Successfully modified!");
    await load();
  } catch (error) {
    ElMessage.error(error.message || "Unable to modify the record.");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
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
