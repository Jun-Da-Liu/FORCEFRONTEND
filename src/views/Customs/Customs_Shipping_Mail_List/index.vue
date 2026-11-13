<template>
  <div class="page-container customs-mail-list-page">
    <el-card class="page-content" shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <h2>MAIL LIST</h2>
            <span>Group: {{ groupName }}</span>
          </div>
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

      <el-form label-position="top" @submit.prevent="save">
        <el-form-item label="SEND TO:">
          <el-input
            v-model="mailList"
            type="textarea"
            :rows="15"
            resize="vertical"
            :disabled="loading || saving"
            placeholder="Enter one Foxconn email address per line"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="saving" :disabled="loading">
            Save
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import MailListAPI from "@/api/customs/customs-shipping-mail-list";

defineOptions({ name: "CustomsShippingMailList" });

const groupName = ref("CustomsShipping");
const mailList = ref("");
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");

function applyResult(result = {}) {
  groupName.value = result.groupName || "CustomsShipping";
  mailList.value = result.mailList || "";
}

async function load() {
  if (loading.value || saving.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    applyResult(await MailListAPI.get());
  } catch (error) {
    errorMessage.value = error.message || "Unable to load the mail list.";
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (loading.value || saving.value) return;
  saving.value = true;
  errorMessage.value = "";
  try {
    applyResult(await MailListAPI.update({ mailList: mailList.value }));
    ElMessage.success("The mail list has been updated!");
  } catch (error) {
    errorMessage.value = error.message || "Unable to update the mail list.";
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
.card-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.card-header span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
