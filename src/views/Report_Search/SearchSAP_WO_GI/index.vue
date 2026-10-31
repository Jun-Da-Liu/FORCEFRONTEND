<template>
  <div class="page-container search-sap-wo-gi-page">
    <el-card class="page-search" shadow="never">
      <el-radio-group
        v-model="mode"
        :disabled="loading"
        class="mode-selector"
        @change="resetResults"
      >
        <el-radio-button value="workorder">ByWO</el-radio-button>
        <el-radio-button value="invoice">ByInvoiceno</el-radio-button>
      </el-radio-group>

      <el-form v-if="mode === 'workorder'" :model="workOrderQuery" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :md="8">
            <el-form-item label="WO">
              <el-input v-model="workOrderQuery.workOrder" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="SKU">
              <el-input v-model="workOrderQuery.sku" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="Document">
              <el-input v-model="workOrderQuery.document" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="resetWorkOrder">Reset</el-button>
        </el-form-item>
      </el-form>

      <el-form v-else :model="invoiceQuery" @submit.prevent="handleSearch">
        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <el-form-item label="InvoiceNo">
              <el-input v-model="invoiceQuery.invoiceNo" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="GroupID">
              <el-input v-model="invoiceQuery.groupId" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="resetInvoice">Reset</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
    </el-card>

    <el-card
      v-if="searched && inventory.rows.length"
      class="page-content result-card"
      shadow="never"
    >
      <div class="page-toolbar">
        <strong>Inventory Info</strong>
        <span>{{ inventory.rowCount.toLocaleString() }} records</span>
        <el-button
          type="success"
          :loading="exportingInventory"
          @click="exportResult(inventory, 'inventory.xlsx', 'Inventory')"
        >
          ToExcel(Inventory)
        </el-button>
      </div>
      <el-table v-loading="loading" :data="inventoryPageRows" border stripe>
        <el-table-column
          v-for="column in inventory.columns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="150"
        />
      </el-table>
      <Pagination
        v-model:page="inventoryPage"
        v-model:limit="pageSize"
        :total="inventory.rows.length"
        :page-sizes="[20]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>

    <el-card
      v-if="searched && shipping.rows.length"
      class="page-content result-card"
      shadow="never"
    >
      <div class="page-toolbar">
        <strong>Shipping Info</strong>
        <span>{{ shipping.rowCount.toLocaleString() }} records</span>
        <el-button
          type="success"
          :loading="exportingShipping"
          @click="exportResult(shipping, 'shipping.xlsx', 'Shipping')"
        >
          ToExcel(Shipping)
        </el-button>
      </div>
      <el-table v-loading="loading" :data="shippingPageRows" border stripe>
        <el-table-column
          v-for="column in shipping.columns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="150"
        />
      </el-table>
      <Pagination
        v-model:page="shippingPage"
        v-model:limit="pageSize"
        :total="shipping.rows.length"
        :page-sizes="[20]"
        layout="total, prev, pager, next, jumper"
      />
    </el-card>

    <el-empty
      v-if="searched && !loading && !inventory.rows.length && !shipping.rows.length"
      description="No records found"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchSapWoGiAPI from "@/api/report-search/search-sap-wo-gi";

defineOptions({ name: "SearchSAPWOGI" });

const mode = ref("workorder");
const workOrderQuery = reactive({ workOrder: "", sku: "", document: "" });
const invoiceQuery = reactive({ invoiceNo: "", groupId: "" });
const inventory = ref(emptyResult());
const shipping = ref(emptyResult());
const inventoryPage = ref(1);
const shippingPage = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const searched = ref(false);
const errorMessage = ref("");
const exportingInventory = ref(false);
const exportingShipping = ref(false);

const inventoryPageRows = computed(() =>
  inventory.value.rows.slice(
    (inventoryPage.value - 1) * pageSize.value,
    inventoryPage.value * pageSize.value
  )
);
const shippingPageRows = computed(() =>
  shipping.value.rows.slice(
    (shippingPage.value - 1) * pageSize.value,
    shippingPage.value * pageSize.value
  )
);

function emptyResult() {
  return { rowCount: 0, columns: [], rows: [] };
}

async function handleSearch() {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const payload =
      mode.value === "workorder"
        ? { mode: mode.value, ...workOrderQuery }
        : { mode: mode.value, ...invoiceQuery };
    const result = await SearchSapWoGiAPI.search(payload);
    inventory.value = result.inventory || emptyResult();
    shipping.value = result.shipping || emptyResult();
    inventoryPage.value = 1;
    shippingPage.value = 1;
    searched.value = true;
  } catch (error) {
    errorMessage.value = error.message || "Unable to search SAP WO/GI data.";
  } finally {
    loading.value = false;
  }
}

function resetWorkOrder() {
  Object.assign(workOrderQuery, { workOrder: "", sku: "", document: "" });
  resetResults();
}

function resetInvoice() {
  Object.assign(invoiceQuery, { invoiceNo: "", groupId: "" });
  resetResults();
}

function resetResults() {
  inventory.value = emptyResult();
  shipping.value = emptyResult();
  searched.value = false;
  errorMessage.value = "";
}

async function exportResult(result, fileName, sheetName) {
  const exporting = sheetName === "Inventory" ? exportingInventory : exportingShipping;
  if (!result.rows.length || exporting.value) return;
  exporting.value = true;
  try {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = result.columns.map((column) => ({
      header: column,
      key: column,
      width: 22,
    }));
    worksheet.addRows(result.rows);
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveWorkbook(buffer, fileName);
    ElMessage.success("Excel file exported successfully");
  } catch (error) {
    ElMessage.error(error.message || "Unable to export the Excel file.");
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
</script>

<style scoped>
.mode-selector,
.result-card {
  margin-bottom: 12px;
}

.result-card {
  margin-top: 12px;
}

.page-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
