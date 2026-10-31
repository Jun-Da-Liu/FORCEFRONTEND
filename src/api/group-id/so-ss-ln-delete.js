import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/so-ss-ln-delete";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  getInitial: () => request({ url: BASE_URL, method: "get" }),
  search: (data) => request({ url: `${BASE_URL}/search`, method: "post", data }),
  getOriginalPns: () => request({ url: `${BASE_URL}/original-pns`, method: "get" }),
  getUpdatedPns: (originalPn) =>
    request({ url: `${BASE_URL}/updated-pns`, method: "get", params: { originalPn } }),
  deleteRecord: (data) => request({ url: BASE_URL, method: "delete", data }),
};
