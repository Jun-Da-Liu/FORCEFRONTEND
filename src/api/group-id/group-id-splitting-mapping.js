import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/group-id-splitting-mapping";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  searchWorkOrders: (data) =>
    request({ url: `${BASE_URL}/work-orders/search`, method: "post", data }),
  searchGroupIds: (data) => request({ url: `${BASE_URL}/group-ids/search`, method: "post", data }),
  getGroupDetail: (data) => request({ url: `${BASE_URL}/group-ids/detail`, method: "post", data }),
  getWorkOrderDetail: (workOrderNo) =>
    request({
      url: `${BASE_URL}/work-orders/${encodeURIComponent(workOrderNo)}/detail`,
      method: "get",
    }),
  exportRows: () => request({ url: `${BASE_URL}/export`, method: "get" }),
};
