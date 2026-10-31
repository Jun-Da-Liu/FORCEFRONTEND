import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/group-id-replace-mapping-view";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  search: (data) => request({ url: `${BASE_URL}/search`, method: "post", data }),
};
