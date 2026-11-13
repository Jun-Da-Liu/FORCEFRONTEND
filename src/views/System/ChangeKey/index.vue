<template>
  <div class="page-container change-key-page">
    <el-card class="change-key-card" shadow="never">
      <template #header>
        <h2>To change password</h2>
      </template>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="Login Name">
          <el-input :model-value="username" disabled />
        </el-form-item>
        <el-form-item label="Password">
          <el-input
            v-model="password"
            type="password"
            maxlength="100"
            show-password
            autocomplete="new-password"
            :disabled="saving"
          />
        </el-form-item>
        <el-form-item label="Confirm password">
          <el-input
            v-model="confirmPassword"
            type="password"
            maxlength="100"
            show-password
            autocomplete="new-password"
            :disabled="saving"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="saving">Submit</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import ChangeKeyAPI from "@/api/system/change-key";
import { useUserStore } from "@/stores/user";

defineOptions({ name: "ChangeKey" });

const userStore = useUserStore();
const username = computed(() => userStore.userInfo.username || "");
const password = ref("");
const confirmPassword = ref("");
const saving = ref(false);
const errorMessage = ref("");

async function submit() {
  if (saving.value) return;

  if (password.value !== confirmPassword.value) {
    errorMessage.value = "The confirm password did not match, please reinput.";
    return;
  }

  saving.value = true;
  errorMessage.value = "";
  try {
    await ChangeKeyAPI.change({
      password: password.value,
      confirmPassword: confirmPassword.value,
    });
    password.value = "";
    confirmPassword.value = "";
    ElMessage.success(`${username.value} Password has been updated!`);
  } catch (error) {
    errorMessage.value = error.message || "Unable to update the password.";
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.change-key-card {
  max-width: 520px;
}

.change-key-card h2 {
  margin: 0;
  font-size: 18px;
}

.el-alert {
  margin-bottom: 18px;
}
</style>
