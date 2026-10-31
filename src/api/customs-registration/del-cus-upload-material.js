import request from "@/utils/request";

const BASE_URL = "/api/v1/customs-registration/del-cus-upload-material";

// The shared interceptor unwraps ApiResult only when code is "00000".
export default {
  getInitial: () => request({ url: BASE_URL, method: "get" }),
  search: (data) => request({ url: `${BASE_URL}/search`, method: "post", data }),
  deleteRows: (items) => request({ url: BASE_URL, method: "delete", data: { items } }),
};
