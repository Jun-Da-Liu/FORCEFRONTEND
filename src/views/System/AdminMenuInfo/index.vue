<template>
  <div class="page-container admin-menu-info-page">
    <el-card class="mode-card" shadow="never">
      <el-radio-group v-model="mode">
        <el-radio-button value="edit">Add &amp; Edit</el-radio-button>
        <el-radio-button value="sort">Menu Sort</el-radio-button>
      </el-radio-group>
    </el-card>

    <el-card v-if="mode === 'edit'" class="page-search" shadow="never">
      <template #header>
        <div class="card-header">
          <span>Node management</span>
          <el-tag :type="editing ? 'warning' : 'success'">{{ editing ? "Edit" : "Add" }}</el-tag>
        </div>
      </template>
      <el-form :model="form" label-position="top" @submit.prevent="save">
        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <el-form-item label="Node name" required>
              <el-input v-model="form.nodeName" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="Link address">
              <el-input v-model="form.nodeUrl" maxlength="400" placeholder="Module/Page" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="Node ownership">
              <el-select v-model="form.nodeParent" filterable style="width: 100%">
                <el-option label="First-level column" :value="0" />
                <el-option
                  v-for="option in decoratedParentOptions"
                  :key="option.nodeId"
                  :label="option.label"
                  :value="option.nodeId"
                  :disabled="editing && option.nodeId === selectedNodeId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="Node annotation">
              <el-input v-model="form.nodeRemark" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="Whether to expand">
              <el-radio-group v-model="form.nodeExpend">
                <el-radio :value="true">Expanded</el-radio>
                <el-radio :value="false">NoExpanded</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="primary" native-type="submit" :loading="saving">
            {{ editing ? "Save Menu" : "Add Menu" }}
          </el-button>
          <el-button :disabled="saving" @click="resetForm">Reset Menu</el-button>
          <el-button :disabled="loading || saving" @click="load">Reload</el-button>
        </el-space>
      </el-form>
    </el-card>

    <el-card v-else class="page-search" shadow="never">
      <template #header>Sort management</template>
      <div class="sort-panel">
        <el-select v-model="selectedSortIndex" size="large" class="sort-list" filterable>
          <el-option
            v-for="(option, index) in sortOptions"
            :key="option.nodeId"
            :label="option.label"
            :value="index"
          />
        </el-select>
        <el-space direction="vertical">
          <el-button :disabled="selectedSortIndex <= 0" @click="moveTo(0)">All Up</el-button>
          <el-button :disabled="selectedSortIndex <= 0" @click="moveBy(-1)">Up</el-button>
          <el-button
            :disabled="selectedSortIndex < 0 || selectedSortIndex >= sortOptions.length - 1"
            @click="moveBy(1)"
          >
            Down
          </el-button>
          <el-button
            :disabled="selectedSortIndex < 0 || selectedSortIndex >= sortOptions.length - 1"
            @click="moveTo(sortOptions.length - 1)"
          >
            All Down
          </el-button>
        </el-space>
      </div>
      <el-space class="sort-actions">
        <el-button type="primary" :loading="saving" @click="saveSort">Save</el-button>
        <el-button :disabled="saving" @click="resetSort">Reset</el-button>
      </el-space>
    </el-card>

    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">{{ rowCount.toLocaleString() }} records</div>
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No menus found">
        <el-table-column type="index" label="No" width="70" :index="rowIndex" />
        <el-table-column label="Select" width="90">
          <template #default="{ row }">
            <el-button link type="primary" @click="selectRow(row)">Select</el-button>
          </template>
        </el-table-column>
        <el-table-column
          v-for="column in visibleColumns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="180"
          show-overflow-tooltip
        />
      </el-table>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="rows.length"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import AdminMenuInfoAPI from "@/api/system/admin-menu-info";

defineOptions({ name: "AdminMenuInfo" });

const mode = ref("edit");
const form = reactive({
  menuId: 0,
  nodeName: "",
  nodeUrl: "",
  nodeParent: 0,
  nodeExpend: true,
  nodeRemark: "",
});
const columns = ref([]);
const rows = ref([]);
const parentOptions = ref([]);
const sortOptions = ref([]);
const rowCount = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);
const editing = ref(false);
const selectedNodeId = ref(0);
const selectedSortIndex = ref(-1);

const visibleColumns = computed(() => {
  const visible = new Set(["nodename", "nodeexpend", "noderemark"]);
  return columns.value.filter((column) => visible.has(String(column).toLowerCase()));
});
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);
const decoratedParentOptions = computed(() => decorateOptions(parentOptions.value));

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function toBoolean(input) {
  return input === true || input === 1 || String(input).toLowerCase() === "true";
}

function decorateOptions(options) {
  const byId = new Map(options.map((option) => [Number(option.nodeId), option]));
  const depth = (option) => {
    let result = 0;
    let parent = byId.get(Number(option.nodeParent));
    const visited = new Set([Number(option.nodeId)]);
    while (parent && !visited.has(Number(parent.nodeId)) && result < 10) {
      visited.add(Number(parent.nodeId));
      result += 1;
      parent = byId.get(Number(parent.nodeParent));
    }
    return result;
  };
  return options.map((option) => ({
    ...option,
    label: `${"— ".repeat(depth(option))}${option.nodeName}`,
  }));
}

function rowIndex(index) {
  return (page.value - 1) * pageSize.value + index + 1;
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  parentOptions.value = Array.isArray(result.parentOptions) ? result.parentOptions : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
  resetForm();
  resetSort();
}

function resetForm() {
  editing.value = false;
  selectedNodeId.value = 0;
  Object.assign(form, {
    menuId: 0,
    nodeName: "",
    nodeUrl: "",
    nodeParent: 0,
    nodeExpend: true,
    nodeRemark: "",
  });
}

function selectRow(row) {
  mode.value = "edit";
  editing.value = true;
  selectedNodeId.value = Number(value(row, "NodeID"));
  Object.assign(form, {
    menuId: Number(value(row, "MenuID")),
    nodeName: String(value(row, "NodeName") ?? ""),
    nodeUrl: String(value(row, "NodeUrl") ?? ""),
    nodeParent: Number(value(row, "NodeParent")) || 0,
    nodeExpend: toBoolean(value(row, "NodeExpend")),
    nodeRemark: String(value(row, "NodeRemark") ?? ""),
  });
}

function payload() {
  return {
    menuId: form.menuId,
    nodeName: form.nodeName.trim().replaceAll("'", ""),
    nodeUrl: form.nodeUrl.trim().replaceAll("'", "").replace(/^\/+/, ""),
    nodeParent: form.nodeParent,
    nodeExpend: form.nodeExpend,
    nodeRemark: form.nodeRemark.trim().replaceAll("'", ""),
  };
}

async function load() {
  if (loading.value || saving.value) return;
  loading.value = true;
  try {
    applyResult(await AdminMenuInfoAPI.getPage());
  } catch (error) {
    ElMessage.error(error.message || "Unable to load menu information.");
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  const data = payload();
  if (!data.nodeName) {
    ElMessage.warning("Node name is required.");
    return;
  }
  const wasEditing = editing.value;
  saving.value = true;
  try {
    applyResult(
      wasEditing ? await AdminMenuInfoAPI.update(data) : await AdminMenuInfoAPI.add(data)
    );
    ElMessage.success(wasEditing ? "Save Menu successfully!" : "Add Menu successfully!");
  } catch (error) {
    ElMessage.error(error.message || "Unable to save menu information.");
  } finally {
    saving.value = false;
  }
}

function resetSort() {
  sortOptions.value = decoratedParentOptions.value.map((option) => ({ ...option }));
  selectedSortIndex.value = sortOptions.value.length ? 0 : -1;
}

function moveTo(target) {
  const source = selectedSortIndex.value;
  if (source < 0 || target < 0 || target >= sortOptions.value.length || source === target) return;
  const [item] = sortOptions.value.splice(source, 1);
  sortOptions.value.splice(target, 0, item);
  selectedSortIndex.value = target;
}

function moveBy(offset) {
  moveTo(selectedSortIndex.value + offset);
}

async function saveSort() {
  if (!sortOptions.value.length || saving.value) return;
  saving.value = true;
  try {
    applyResult(await AdminMenuInfoAPI.reorder(sortOptions.value.map((option) => option.nodeId)));
    ElMessage.success("Column sorting successfully!");
  } catch (error) {
    ElMessage.error(error.message || "Unable to save menu sorting.");
  } finally {
    saving.value = false;
  }
}

watch(mode, (next) => {
  if (next === "sort") resetSort();
});

onMounted(load);
</script>

<style scoped>
.mode-card {
  margin-bottom: 16px;
}

.card-header,
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-toolbar {
  margin-bottom: 12px;
}

.sort-panel {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.sort-list {
  width: min(100%, 520px);
}

.sort-actions {
  margin-top: 16px;
}
</style>
