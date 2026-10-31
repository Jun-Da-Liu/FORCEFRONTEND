<template>
  <div class="page-container admin-user-info-page">
    <el-card class="page-search" shadow="never">
      <template #header>
        <div class="card-header">
          <span>User information</span>
          <el-tag :type="editing ? 'warning' : 'success'">{{ editing ? "Edit" : "Add" }}</el-tag>
        </div>
      </template>

      <el-form :model="form" label-position="top" @submit.prevent="save">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="UserName" required>
              <el-input v-model="form.userName" :readonly="editing" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item :label="editing ? 'UserKey (leave blank to keep current)' : 'UserKey'">
              <el-input
                v-model="form.userKey"
                type="password"
                show-password
                maxlength="100"
                autocomplete="new-password"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="UserGroup" required>
              <el-select v-model="form.userGroupId" class="full-width" placeholder="Select group">
                <el-option
                  v-for="group in groups"
                  :key="group.groupId"
                  :label="group.groupName"
                  :value="group.groupId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="UserRemark">
              <el-input v-model="form.userRemark" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="UserTel">
              <el-input v-model="form.userTel" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="UserMail">
              <el-input v-model="form.userMail" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="UserState">
              <el-radio-group v-model="form.userState">
                <el-radio :value="true">Enable</el-radio>
                <el-radio :value="false">Disable</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-space wrap>
          <el-button type="primary" native-type="submit" :loading="saving">
            {{ editing ? "Save" : "Add" }}
          </el-button>
          <el-button :disabled="saving" @click="resetForm">Reset</el-button>
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
          min-width="140"
        >
          <template #default="scope">{{ displayValue(scope.row, column) }}</template>
        </el-table-column>
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
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import AdminUserInfoAPI from "@/api/system/admin-user-info";

defineOptions({ name: "AdminUserInfo" });

const emptyForm = () => ({
  userName: "",
  userKey: "",
  userGroupId: null,
  userRemark: "",
  userTel: "",
  userMail: "",
  userState: true,
});
const form = reactive(emptyForm());
const columns = ref([]);
const rows = ref([]);
const groups = ref([]);
const rowCount = ref(0);
const editing = ref(false);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);

const visibleColumns = computed(() =>
  columns.value.filter((column) => column.toLowerCase() !== "usergroupid")
);
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? row[key] : "";
}

function displayValue(row, column) {
  const current = value(row, column);
  if (column.toLowerCase() !== "userstate") return current ?? "";
  return current === true || current === 1 || current === "1" ? "Enable" : "Disable";
}

function applyResult(result = {}) {
  columns.value = Array.isArray(result.columns) ? result.columns : [];
  rows.value = Array.isArray(result.rows) ? result.rows : [];
  groups.value = Array.isArray(result.groups) ? result.groups : [];
  rowCount.value = Number(result.rowCount ?? rows.value.length);
  page.value = 1;
  resetForm();
}

function resetForm() {
  editing.value = false;
  Object.assign(form, emptyForm());
  if (groups.value.length) form.userGroupId = groups.value[0].groupId;
}

function selectRow(row) {
  editing.value = true;
  Object.assign(form, {
    userName: String(value(row, "UserName") ?? ""),
    userKey: "",
    userGroupId: Number(value(row, "UserGroupID")) || null,
    userRemark: String(value(row, "UserRemark") ?? ""),
    userTel: String(value(row, "UserTel") ?? ""),
    userMail: String(value(row, "UserMail") ?? ""),
    userState: [true, 1, "1"].includes(value(row, "UserState")),
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function payload() {
  return {
    userName: form.userName.trim().replaceAll("'", ""),
    userKey: form.userKey.trim().replaceAll("'", ""),
    userGroupId: Number(form.userGroupId || 0),
    userRemark: form.userRemark.trim().replaceAll("'", ""),
    userTel: form.userTel.trim().replaceAll("'", ""),
    userMail: form.userMail.trim().replaceAll("'", ""),
    userState: form.userState,
  };
}

async function load() {
  if (loading.value || saving.value) return;
  loading.value = true;
  try {
    applyResult(await AdminUserInfoAPI.getPage());
  } catch (error) {
    ElMessage.error(error.message || "Unable to load user information.");
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  const data = payload();
  if (!data.userName) {
    ElMessage.warning("You have not entered a username, please enter a username.");
    return;
  }
  if (!data.userGroupId) {
    ElMessage.warning("Select a user group.");
    return;
  }
  saving.value = true;
  const wasEditing = editing.value;
  try {
    const result = wasEditing
      ? await AdminUserInfoAPI.update(data)
      : await AdminUserInfoAPI.add(data);
    applyResult(result);
    ElMessage.success(
      wasEditing ? `Modify user ${data.userName} success!` : `Add user ${data.userName} success!`
    );
  } catch (error) {
    ElMessage.error(error.message || "Unable to save user information.");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.card-header,
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-toolbar {
  margin-bottom: 12px;
}
.full-width {
  width: 100%;
}
</style>
