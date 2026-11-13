import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/work-order-no-hold-list";

// The shared response interceptor returns data only when ApiResult.code === "00000".
export default {
  search(workOrderNo = "") {
    return request({ url: BASE_URL, method: "get", params: { workOrderNo } });
  },
  create(workOrderNo) {
    return request({ url: BASE_URL, method: "post", data: { workOrderNo } });
  },
  update(id, workOrderNo) {
    return request({ url: `${BASE_URL}/${id}`, method: "put", data: { workOrderNo } });
  },
  remove(id) {
    return request({ url: `${BASE_URL}/${id}`, method: "delete" });
  },
};
