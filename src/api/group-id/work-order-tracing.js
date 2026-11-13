import request from "@/utils/request";

const WORK_ORDER_TRACING_BASE_URL = "/api/v1/group-id/work-order-tracing";

const WorkOrderTracingAPI = {
  getList(params) {
    return request({
      url: WORK_ORDER_TRACING_BASE_URL,
      method: "get",
      params,
    });
  },

  search(data) {
    return request({
      url: `${WORK_ORDER_TRACING_BASE_URL}/search`,
      method: "post",
      data,
    });
  },

  refreshRegisteredSn(data) {
    return request({
      url: `${WORK_ORDER_TRACING_BASE_URL}/refresh-registered-sn`,
      method: "post",
      data,
    });
  },
};

export default WorkOrderTracingAPI;
