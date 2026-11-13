<template>
  <div class="page-container search-sim-group-id-page">
    <el-card class="page-search" shadow="never">
      <el-form label-position="top" @submit.prevent="handleSearch">
        <el-form-item label="GroupIDs">
          <el-input
            v-model="groupIds"
            type="textarea"
            :rows="4"
            :disabled="loading"
            placeholder="Separate GroupIDs with commas or new lines"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">Search</el-button>
          <el-button :disabled="loading" @click="clearSearch">Clear</el-button>
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

    <result-table
      title="Similar GroupIDs"
      empty-text="No similar GroupIDs found"
      :result="similarGroupIds"
      :loading="loading"
      :page-size="50"
      export-label="ToExcel(SimGroupids)"
      export-file="sim-groupids.xlsx"
    />

    <result-table
      title="Work Order Qty / FCD Date"
      empty-text="No work orders found"
      :result="workOrders"
      :loading="loading"
      :page-size="50"
      export-label="ToExcel(Wo_Qty_FCDDate)"
      export-file="wo-qty-fcd-date.xlsx"
    />
  </div>
</template>

<script setup>
import { defineComponent, h, ref, watch } from "vue";
import { ElButton, ElCard, ElMessage, ElTable, ElTableColumn } from "element-plus";
import Pagination from "@/components/Pagination/index.vue";
import SearchSimGroupIdAPI from "@/api/report-search/search-sim-group-id";

defineOptions({ name: "SearchSimGroupID" });

const groupIds = ref("C1861-UC-B/K9-MS,UC520-16U-4FXO-K9");
const loading = ref(false);
const errorMessage = ref("");
const similarGroupIds = ref(emptyResult());
const workOrders = ref(emptyResult());

function emptyResult() {
  return { rowCount: 0, columns: [], rows: [], excelRowLimitExceeded: false, excelMaxRows: 65535 };
}

async function handleSearch() {
  if (!groupIds.value.trim()) {
    ElMessage.warning("Please enter GroupIDs");
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await SearchSimGroupIdAPI.search({ groupIds: groupIds.value });
    similarGroupIds.value = result.similarGroupIds || emptyResult();
    workOrders.value = result.workOrders || emptyResult();
  } catch (error) {
    errorMessage.value = error.message || "Unable to search similar GroupIDs.";
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  groupIds.value = "";
}

const ResultTable = defineComponent({
  name: "SearchSimGroupIdResultTable",
  props: {
    title: { type: String, required: true },
    emptyText: { type: String, required: true },
    result: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    pageSize: { type: Number, default: 50 },
    exportLabel: { type: String, required: true },
    exportFile: { type: String, required: true },
  },
  setup(props) {
    const page = ref(1);
    const exporting = ref(false);

    watch(
      () => props.result.rows,
      () => {
        page.value = 1;
      }
    );

    async function exportExcel() {
      if (!props.result.rows?.length || exporting.value) return;
      exporting.value = true;
      try {
        const { default: ExcelJS } = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(props.title.slice(0, 31));
        const columns = props.result.columns || [];
        worksheet.columns = columns.map((column) => ({ header: column, key: column, width: 22 }));
        const maxRows = props.result.excelRowLimitExceeded
          ? props.result.excelMaxRows
          : props.result.rows.length;
        worksheet.addRows(props.result.rows.slice(0, maxRows));
        worksheet.views = [{ state: "frozen", ySplit: 1 }];
        worksheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        saveWorkbook(buffer, props.exportFile);
        ElMessage.success("Excel file exported successfully");
      } catch (error) {
        ElMessage.error(error.message || "Unable to export the Excel file.");
      } finally {
        exporting.value = false;
      }
    }

    return () => {
      const rows = props.result.rows || [];
      const columns = props.result.columns || [];
      const pageRows = rows.slice((page.value - 1) * props.pageSize, page.value * props.pageSize);
      return h(ElCard, { class: "page-content result-card", shadow: "never" }, () => [
        h("div", { class: "page-toolbar" }, [
          h("strong", props.title),
          h("span", `${Number(props.result.rowCount || rows.length).toLocaleString()} records`),
          h(
            ElButton,
            {
              type: "success",
              loading: exporting.value,
              disabled: props.loading || !rows.length,
              onClick: exportExcel,
            },
            () => props.exportLabel
          ),
        ]),
        props.result.excelRowLimitExceeded
          ? h(
              "div",
              { class: "excel-warning" },
              `Excel export is limited to ${props.result.excelMaxRows} rows.`
            )
          : null,
        h(
          ElTable,
          {
            data: pageRows,
            border: true,
            stripe: true,
            emptyText: props.emptyText,
            loading: props.loading,
          },
          () =>
            columns.map((column) =>
              h(ElTableColumn, { key: column, prop: column, label: column, minWidth: 150 })
            )
        ),
        h(Pagination, {
          page: page.value,
          limit: props.pageSize,
          total: rows.length,
          pageSizes: [50],
          layout: "total, prev, pager, next, jumper",
          "onUpdate:page": (value) => (page.value = value),
        }),
      ]);
    };
  },
});

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
.result-card,
.excel-warning {
  margin-top: 12px;
}

.page-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.excel-warning {
  color: var(--el-color-warning);
  margin-bottom: 12px;
}
</style>
