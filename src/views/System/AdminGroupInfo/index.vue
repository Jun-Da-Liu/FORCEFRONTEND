<template>
  <div class="page-container admin-group-info-page">
    <el-row :gutter="16">
      <el-col :xs="24" :lg="8">
        <el-card class="menu-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>Menu List</span>
              <el-button link :disabled="loading || saving" @click="clearMenuSelection">
                Clear
              </el-button>
            </div>
          </template>
          <el-tree
            ref="menuTreeRef"
            v-loading="loadingBindings"
            :data="treeData"
            node-key="nodeId"
            show-checkbox
            check-strictly
            default-expand-all
            :props="treeProps"
            empty-text="No menus found"
          />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="16">
        <el-card class="page-search" shadow="never">
          <template #header>
            <div class="card-header">
              <span>Role information</span>
              <el-tag :type="editing ? 'warning' : 'success'">
                {{ editing ? "Edit" : "Add" }}
              </el-tag>
            </div>
          </template>
          <el-form :model="form" label-position="top" @submit.prevent="save">
            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="GroupName">
                  <el-input v-model="form.groupName" :readonly="editing" maxlength="100" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="GroupRemark">
                  <el-input v-model="form.groupRemark" maxlength="200" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-space wrap>
              <el-button type="primary" native-type="submit" :loading="saving">
                {{ editing ? "Save" : "Add" }}
              </el-button>
              <el-button :disabled="saving" @click="resetForm">ReSet</el-button>
              <el-button :disabled="loading || saving" @click="load">Reload</el-button>
            </el-space>
          </el-form>
        </el-card>

        <el-card class="page-content" shadow="never">
          <div class="page-toolbar">{{ rowCount.toLocaleString() }} records</div>
          <el-table
            v-loading="loading"
            :data="pageRows"
            border
            stripe
            highlight-current-row
            empty-text="No records found"
          >
            <el-table-column type="index" label="ID" width="70" :index="rowIndex" />
            <el-table-column label="Select" width="90" align="center">
              <template #default="scope">
                <el-button link type="primary" @click="selectRow(scope.row)">Select</el-button>
              </template>
            </el-table-column>
            <el-table-column
              v-for="column in visibleColumns"
              :key="column"
              :prop="column"
              :label="column"
              min-width="160"
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
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import AdminGroupInfoAPI from "@/api/system/admin-group-info";

defineOptions({ name: "AdminGroupInfo" });

const form = reactive({ groupId: 0, groupName: "", groupRemark: "" });
const columns = ref([]);
const rows = ref([]);
const menus = ref([]);
const rowCount = ref(0);
const editing = ref(false);
const loading = ref(false);
const loadingBindings = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const menuTreeRef = ref();
const treeProps = { children: "children", label: "nodeName", disabled: "disabled" };

const visibleColumns = computed(() =>
  columns.value.filter((column) => column.toLowerCase() !== "groupid")
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);
const treeData = computed(() => decorateMenus(menus.value));
const checkableNodeIds = computed(() => {
  const ids = new Set();
  walkMenus(menus.value, (node) => {
    if (node.nodeCheck) ids.add(Number(node.nodeId));
  });
  return ids;
});

function decorateMenus(nodes) {
  return nodes.map((node) => ({
    ...node,
    disabled: !node.nodeCheck,
    children: decorateMenus(node.children || []),
  }));
}

function walkMenus(nodes, callback) {
  nodes.forEach((node) => {
    callback(node);
    walkMenus(node.children || [], callback);
  });
}

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function rowIndex(index) {
  return (page.value - 1) * pageSize.value + index + 1;
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  menus.value = Array.isArray(result.menus) ? result.menus : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
  resetForm();
}

function clearMenuSelection() {
  menuTreeRef.value?.setCheckedKeys([], false);
}

function resetForm() {
  editing.value = false;
  Object.assign(form, { groupId: 0, groupName: "", groupRemark: "" });
  nextTick(clearMenuSelection);
}

async function selectRow(row) {
  const groupId = Number(value(row, "GroupID"));
  if (!groupId || loadingBindings.value) return;
  editing.value = true;
  Object.assign(form, {
    groupId,
    groupName: String(value(row, "GroupName") ?? ""),
    groupRemark: String(value(row, "GroupRemark") ?? ""),
  });
  loadingBindings.value = true;
  try {
    const bindings = await AdminGroupInfoAPI.getBindings(groupId);
    const checked = bindings.filter((nodeId) => checkableNodeIds.value.has(Number(nodeId)));
    await nextTick();
    menuTreeRef.value?.setCheckedKeys(checked, false);
  } catch (error) {
    ElMessage.error(error.message || "Unable to load role menu bindings.");
  } finally {
    loadingBindings.value = false;
  }
}

function payload() {
  const checked = menuTreeRef.value?.getCheckedKeys(false) || [];
  return {
    groupId: form.groupId,
    groupName: form.groupName.trim().replaceAll("'", ""),
    groupRemark: form.groupRemark.trim().replaceAll("'", ""),
    nodeIds: checked.filter((nodeId) => checkableNodeIds.value.has(Number(nodeId))),
  };
}

async function load() {
  if (loading.value || saving.value) return;
  loading.value = true;
  try {
    applyResult(await AdminGroupInfoAPI.getPage());
  } catch (error) {
    ElMessage.error(error.message || "Unable to load role information.");
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  const wasEditing = editing.value;
  const data = payload();
  saving.value = true;
  try {
    const result = wasEditing
      ? await AdminGroupInfoAPI.update(data)
      : await AdminGroupInfoAPI.add(data);
    applyResult(result);
    ElMessage.success(wasEditing ? "Role information was updated!" : "Role was added!");
  } catch (error) {
    ElMessage.error(error.message || "Unable to save role information.");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.menu-card {
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
</style>
