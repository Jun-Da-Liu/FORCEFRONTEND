<template>
  <div class="page-container system-config-page">
    <el-card class="page-search" shadow="never">
      <template #header>
        <div class="card-header">
          <span>Notes Send management</span>
          <el-button :disabled="loading || saving" @click="load">Reload</el-button>
        </div>
      </template>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
      <el-form :model="form" label-position="top" @submit.prevent="save">
        <el-form-item label="GroupName">
          <el-input v-model="form.groupName" readonly />
        </el-form-item>
        <el-form-item label="ItemName">
          <el-input v-model="form.itemRemark" :maxlength="500" :disabled="!selected || saving" />
        </el-form-item>
        <el-form-item label="NotesSendGroup">
          <el-input
            v-model="form.send"
            type="textarea"
            :rows="5"
            :maxlength="8000"
            :disabled="!selected || saving"
          />
        </el-form-item>
        <el-form-item label="NotesCopyGroup">
          <el-input
            v-model="form.copy"
            type="textarea"
            :rows="5"
            :maxlength="8000"
            :disabled="!selected || saving"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="saving"
            :disabled="!selected || loading"
          >
            Save
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ rowCount.toLocaleString() }} records</div>
      <el-table
        v-loading="loading"
        :data="rows"
        border
        highlight-current-row
        empty-text="No records found"
      >
        <el-table-column label="Select" width="90" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="selectRow(scope.row)">Select</el-button>
          </template>
        </el-table-column>
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="150"
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import SystemConfigAPI from "@/api/system/system-config";

defineOptions({ name: "SystemConfig" });

const columns = ref([]);
const rows = ref([]);
const rowCount = ref(0);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const selected = ref(false);
const form = reactive({ sendId: 0, copyId: 0, groupName: "", itemRemark: "", send: "", copy: "" });

const hiddenColumns = new Set(["copyid", "groupname"]);
const visibleColumns = computed(() =>
  columns.value.filter((column) => !hiddenColumns.has(column.toLowerCase()))
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  const labels = {
    sendid: "ID",
    itemremark: "ItemName",
    send: "Notes SendGroup",
    copy: "NotesCopyGroup",
  };
  return labels[column.toLowerCase()] || column;
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  clearSelection();
}

function clearSelection() {
  selected.value = false;
  Object.assign(form, { sendId: 0, copyId: 0, groupName: "", itemRemark: "", send: "", copy: "" });
}

function selectRow(row) {
  Object.assign(form, {
    sendId: Number(value(row, "SENDID")),
    copyId: Number(value(row, "COPYID")),
    groupName: String(value(row, "groupName") ?? ""),
    itemRemark: String(value(row, "ItemRemark") ?? ""),
    send: String(value(row, "Send") ?? ""),
    copy: String(value(row, "Copy") ?? ""),
  });
  selected.value = form.sendId > 0 && form.copyId > 0;
}

async function load() {
  if (loading.value || saving.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await SystemConfigAPI.getAll());
  } catch (error) {
    errorMessage.value = error.message || "Unable to load system configuration.";
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!selected.value || saving.value) return;
  saving.value = true;
  errorMessage.value = "";
  try {
    applyResult(
      await SystemConfigAPI.update({
        sendId: form.sendId,
        copyId: form.copyId,
        itemRemark: form.itemRemark,
        send: form.send,
        copy: form.copy,
      })
    );
    ElMessage.success("Mail group successfully modified!");
  } catch (error) {
    errorMessage.value = error.message || "Unable to save system configuration.";
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-toolbar {
  margin-bottom: 12px;
}
</style>
