<template>
  <div class="page-container">
    <el-card class="page-search" shadow="never">
      <h2>SAP TECO Upload</h2>
      <el-alert
        title="The imported TECO list is available for viewing. Upload, template download and HFJ export require the legacy DTS package and are under review."
        type="warning"
        :closable="false"
        show-icon
      />
    </el-card>
    <el-card class="page-content" shadow="never">
      <div class="page-toolbar">
        <span>{{ rows.length.toLocaleString() }} records</span>
        <el-button :loading="loading" @click="load">Reload</el-button>
      </div>
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" />
      <el-table v-loading="loading" :data="pageRows" border stripe empty-text="No TECO rows found">
        <el-table-column label="Item" min-width="100">
          <template #default="{ row }">{{ value(row, "ID") }}</template>
        </el-table-column>
        <el-table-column label="Teco date" min-width="160">
          <template #default="{ row }">{{ value(row, "TecoDate") }}</template>
        </el-table-column>
        <el-table-column label="Plant" min-width="130">
          <template #default="{ row }">{{ value(row, "Plant") }}</template>
        </el-table-column>
        <el-table-column label="Work Order" min-width="180">
          <template #default="{ row }">{{ value(row, "SAPWorkOrderNo") }}</template>
        </el-table-column>
      </el-table>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="rows.length"
        :page-sizes="[30]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import Pagination from "@/components/Pagination/index.vue";
import SapTecoReadAPI from "@/api/sap/upload-sap-teco";

defineOptions({ name: "SapTecoRead" });

const rows = ref([]);
const page = ref(1);
const pageSize = ref(30);
const loading = ref(false);
const errorMessage = ref("");
const pageRows = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
);

function value(row, column) {
  const key = Object.keys(row).find((name) => name.toLowerCase() === column.toLowerCase());
  return key ? (row[key] ?? "") : "";
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await SapTecoReadAPI.getRows();
    rows.value = Array.isArray(result?.rows) ? result.rows : [];
    page.value = 1;
  } catch (error) {
    errorMessage.value = error.message || "Unable to load TECO rows.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
