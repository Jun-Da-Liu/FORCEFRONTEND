<template>
  <div class="page-container group-id-replace-mapping-page">
    <el-card class="page-search" shadow="never">
      <el-form :model="form" label-position="top" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="SkuNo">
              <el-input v-model="form.skuNo" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="GroupID">
              <el-input v-model="form.groupId" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="ReplaceGroupID">
              <el-input v-model="form.replaceGroupId" :maxlength="20" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item label="Rate">
              <el-input v-model="form.rate" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="success" :loading="saving" @click="handleAdd">Add</el-button>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading || saving" @click="handleClear">Clear</el-button>
          <el-button :loading="exporting" :disabled="loading" @click="exportExcel">
            ToExcel
          </el-button>
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

    <el-dialog
      v-model="editVisible"
      title="Edit GroupID Replace Mapping"
      width="560px"
      destroy-on-close
    >
      <el-form label-position="top" @submit.prevent="handleUpdate">
        <el-form-item label="SkuNo">
          <el-input v-model="editForm.skuNo" :maxlength="18" />
        </el-form-item>
        <el-form-item label="GroupID">
          <el-input v-model="editForm.groupId" :maxlength="20" />
        </el-form-item>
        <el-form-item label="ReplaceGroupID">
          <el-input v-model="editForm.replaceGroupId" :maxlength="20" />
        </el-form-item>
        <el-form-item label="Rate">
          <el-input v-model="editForm.rate" />
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
import GroupIdReplaceMappingAPI from "@/api/group-id/group-id-replace-mapping";

defineOptions({ name: "GroupIdReplaceMapping" });

const emptyForm = () => ({ skuNo: "", groupId: "", replaceGroupId: "", rate: "" });
const form = reactive(emptyForm());
const editForm = reactive({ id: 0, ...emptyForm() });
const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const excelMaxRows = ref(65535);
const excelRowLimitExceeded = ref(false);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);
const exporting = ref(false);
const editVisible = ref(false);
let lastSearch = { skuNo: "", groupId: "", replaceGroupId: "" };

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

function searchPayload(source = form) {
  return {
    skuNo: clean(source.skuNo),
    groupId: clean(source.groupId),
    replaceGroupId: clean(source.replaceGroupId),
  };
}

function savePayload(source) {
  return { ...searchPayload(source), rate: clean(source.rate) };
}

function validText(input, required) {
  const pattern = required ? /^[- /_=+.0-9a-zA-Z]{1,20}$/ : /^[- /_=+.0-9a-zA-Z]{0,20}$/;
  return pattern.test(input);
}

function validateSearch(request) {
  if (Object.values(request).every((item) => validText(item, false))) return true;
  ElMessage.warning(
    "The text must be at most 20 characters and contain only letters, numbers, spaces, -, /, _, =, + or ."
  );
  return false;
}

function validateSave(source) {
  const request = savePayload(source);
  if (
    ![request.skuNo, request.groupId, request.replaceGroupId].every((item) => validText(item, true))
  ) {
    ElMessage.warning(
      "SkuNo, GroupID and ReplaceGroupID are required and must use the legacy allowed characters."
    );
    return null;
  }
  if (request.skuNo.length > 18) {
    ElMessage.warning("The length of the SkuNo cannot exceed 18 characters.");
    return null;
  }
  const rate = Number(request.rate);
  if (!request.rate || !Number.isFinite(rate)) {
    ElMessage.warning("Rate must be a number.");
    return null;
  }
  if (rate <= 0 || rate >= 1_000_000_000_000) {
    ElMessage.warning("Rate must be a positive number less than 1000000000000.");
    return null;
  }
  return request;
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  excelMaxRows.value = Number(result.excelMaxRows ?? 65535);
  excelRowLimitExceeded.value = Boolean(result.excelRowLimitExceeded);
  page.value = 1;
}

async function load(request = searchPayload()) {
  if (loading.value || !validateSearch(request)) return;
  loading.value = true;
  try {
    applyResult(await GroupIdReplaceMappingAPI.search(request));
    lastSearch = request;
  } catch (error) {
    ElMessage.error(error.message || "Unable to load GroupID replacement mappings.");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  return load(searchPayload());
}

function handleClear() {
  Object.assign(form, emptyForm());
}

async function handleAdd() {
  if (saving.value) return;
  const request = validateSave(form);
  if (!request) return;
  saving.value = true;
  try {
    await GroupIdReplaceMappingAPI.create(request);
    const addedFilter = { skuNo: request.skuNo, groupId: request.groupId, replaceGroupId: "" };
    Object.assign(form, emptyForm());
    ElMessage.success("Successfully saved!");
    await load(addedFilter);
  } catch (error) {
    ElMessage.error(error.message || "Unable to save the GroupID replacement mapping.");
  } finally {
    saving.value = false;
  }
}

function openEdit(row) {
  Object.assign(editForm, {
    id: Number(value(row, "ID")),
    skuNo: String(value(row, "SkuNo") ?? ""),
    groupId: String(value(row, "GroupID") ?? ""),
    replaceGroupId: String(value(row, "ReplaceGroupID") ?? ""),
    rate: String(value(row, "Rate") ?? ""),
  });
  editVisible.value = editForm.id > 0;
}

async function handleUpdate() {
  if (saving.value || editForm.id <= 0) return;
  const request = validateSave(editForm);
  if (!request) return;
  saving.value = true;
  try {
    await GroupIdReplaceMappingAPI.update(editForm.id, request);
    editVisible.value = false;
    ElMessage.success("Successfully modified!");
    await load(lastSearch);
  } catch (error) {
    ElMessage.error(error.message || "Unable to modify the GroupID replacement mapping.");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  const id = Number(value(row, "ID"));
  if (id <= 0) return;
  try {
    await ElMessageBox.confirm(
      `Confirm to delete SkuNo [${value(row, "SkuNo")}] and GroupID [${value(row, "GroupID")}] record?`,
      "Delete confirmation",
      { type: "warning", confirmButtonText: "Delete" }
    );
    await GroupIdReplaceMappingAPI.remove(id);
    ElMessage.success("Delete successful!");
    await load(lastSearch);
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to delete the GroupID replacement mapping.");
    }
  }
}

async function exportExcel() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    if (excelRowLimitExceeded.value) {
      await ElMessageBox.confirm(
        `There are too many rows for the legacy Excel limit. Export up to ${excelMaxRows.value} rows?`,
        "Excel row limit",
        { type: "warning", confirmButtonText: "Continue" }
      );
    }
    const result = await GroupIdReplaceMappingAPI.exportRows(lastSearch);
    const exportColumns = Array.isArray(result.columns) ? result.columns : [];
    const exportRows = Array.isArray(result.rows) ? result.rows : [];
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GroupID Replace Mapping");
    worksheet.columns = exportColumns.map((column) => ({
      header: columnLabel(column),
      key: column,
      width: 22,
    }));
    worksheet.addRows(exportRows.slice(0, Number(result.excelMaxRows ?? excelMaxRows.value)));
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, "detail.xlsx");
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error.message || "Unable to export the Excel file.");
    }
  } finally {
    exporting.value = false;
  }
}

function saveWorkbook(buffer, fileName) {
  const type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const url = window.URL.createObjectURL(new Blob([buffer], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

onMounted(() => load({ skuNo: "", groupId: "", replaceGroupId: "" }));
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 12px;
}
</style>
