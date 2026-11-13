<template>
  <div class="page-container system-jobs-manage-page">
    <el-card class="page-search" shadow="never">
      <template #header>Job Lock and unlock function</template>
      <el-form :model="addForm" :inline="true" label-position="top" @submit.prevent="addJob">
        <el-form-item label="Name" required>
          <el-input v-model="addForm.name" maxlength="200" :disabled="saving" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input
            v-model="addForm.description"
            class="description-input"
            maxlength="500"
            :disabled="saving"
          />
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" native-type="submit" :loading="saving">Add</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <span>{{ rowCount.toLocaleString() }} job{{ rowCount === 1 ? "" : "s" }}</span>
        <el-space wrap>
          <el-button
            type="danger"
            :disabled="!selectedNames.length || saving"
            @click="setStatus(true)"
          >
            Lock
          </el-button>
          <el-button
            type="success"
            :disabled="!selectedNames.length || saving"
            @click="setStatus(false)"
          >
            Unlock
          </el-button>
          <el-button :disabled="loading || saving" @click="load">Refresh</el-button>
        </el-space>
      </div>

      <el-table
        ref="jobTableRef"
        v-loading="loading"
        :data="rows"
        border
        stripe
        :row-class-name="jobRowClassName"
        empty-text="No jobs found"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="52" />
        <el-table-column
          v-for="column in columns"
          :key="column"
          :prop="column"
          :label="columnLabel(column)"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="isDateColumn(column)">{{ formatDateTime(value(row, column)) }}</span>
            <span v-else>{{ value(row, column) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Action" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDescription(row)">Edit</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="page-content log-card" shadow="never">
      <template #header>DTS text logs</template>
      <el-table v-loading="loading" :data="pageLogs" border stripe empty-text="No log files found">
        <el-table-column
          v-for="column in visibleLogColumns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="170"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link
              v-if="column.toLowerCase() === 'filename' && value(row, 'FileUrl')"
              :href="String(value(row, 'FileUrl'))"
              target="_blank"
              type="primary"
              underline="never"
            >
              {{ value(row, column) }}
            </el-link>
            <span v-else-if="isDateColumn(column)">{{ formatDateTime(value(row, column)) }}</span>
            <span v-else>{{ value(row, column) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <Pagination
        v-model:page="logPage"
        v-model:limit="logPageSize"
        :total="logs.length"
        :page-sizes="[7]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>

    <el-dialog v-model="descriptionDialog" title="Edit Description" width="520px">
      <el-form :model="editForm" label-position="top" @submit.prevent="saveDescription">
        <el-form-item label="Name">
          <el-input v-model="editForm.name" readonly />
        </el-form-item>
        <el-form-item label="Description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="descriptionDialog = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="saveDescription">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SystemJobsManageAPI from "@/api/system/system-jobs-manage";

defineOptions({ name: "SystemJobsManage" });

const addForm = reactive({ name: "", description: "" });
const editForm = reactive({ name: "", description: "" });
const columns = ref([]);
const rows = ref([]);
const logColumns = ref([]);
const logs = ref([]);
const rowCount = ref(0);
const loading = ref(false);
const saving = ref(false);
const selectedNames = ref([]);
const descriptionDialog = ref(false);
const logPage = ref(1);
const logPageSize = ref(7);
const jobTableRef = ref();

const visibleLogColumns = computed(() =>
  logColumns.value.filter((column) => !["fileurl", "imageurl"].includes(column.toLowerCase()))
);
const pageLogs = computed(() =>
  logs.value.slice((logPage.value - 1) * logPageSize.value, logPage.value * logPageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function columnLabel(column) {
  return column.toLowerCase() === "status" ? "State" : column;
}

function isDateColumn(column) {
  return ["starttime", "endtime", "updatetime"].includes(column.toLowerCase());
}

function formatDateTime(input) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return String(input);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function jobRowClassName({ row }) {
  return Number(value(row, "Status")) === 1 ? "locked-job-row" : "";
}

function handleSelectionChange(selection) {
  selectedNames.value = selection.map((row) => String(value(row, "Name"))).filter(Boolean);
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  logColumns.value = Array.isArray(result.logColumns) ? result.logColumns : [];
  logs.value = Array.isArray(result.logs) ? result.logs : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  selectedNames.value = [];
  logPage.value = 1;
  jobTableRef.value?.clearSelection();
}

async function load() {
  if (loading.value || saving.value) return;
  loading.value = true;
  try {
    applyResult(await SystemJobsManageAPI.getPage());
  } catch (error) {
    ElMessage.error(error.message || "Unable to load jobs.");
  } finally {
    loading.value = false;
  }
}

async function addJob() {
  const name = addForm.name.trim();
  if (!name) {
    ElMessage.warning("Name is required.");
    return;
  }
  saving.value = true;
  try {
    applyResult(await SystemJobsManageAPI.add({ name, description: addForm.description.trim() }));
    Object.assign(addForm, { name: "", description: "" });
    ElMessage.success("Job was added.");
  } catch (error) {
    ElMessage.error(error.message || "Unable to add the job.");
  } finally {
    saving.value = false;
  }
}

async function setStatus(locked) {
  if (!selectedNames.value.length || saving.value) return;
  saving.value = true;
  try {
    applyResult(await SystemJobsManageAPI.setStatus({ names: selectedNames.value, locked }));
    ElMessage.success(locked ? "Selected jobs were locked." : "Selected jobs were unlocked.");
  } catch (error) {
    ElMessage.error(error.message || "Unable to update the selected jobs.");
  } finally {
    saving.value = false;
  }
}

function openDescription(row) {
  Object.assign(editForm, {
    name: String(value(row, "Name")),
    description: String(value(row, "Description") ?? ""),
  });
  descriptionDialog.value = true;
}

async function saveDescription() {
  if (!editForm.name || saving.value) return;
  saving.value = true;
  try {
    applyResult(
      await SystemJobsManageAPI.updateDescription({
        name: editForm.name,
        description: editForm.description.trim(),
      })
    );
    descriptionDialog.value = false;
    ElMessage.success("Description was updated.");
  } catch (error) {
    ElMessage.error(error.message || "Unable to update the description.");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.description-input {
  width: 360px;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.log-card {
  margin-top: 16px;
}

:deep(.locked-job-row td) {
  color: var(--el-color-danger);
}
</style>
