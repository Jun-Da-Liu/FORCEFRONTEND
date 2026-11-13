import request from "@/utils/request";

export default {
  getRows() {
    return request({ url: "/api/v1/sap/upload-sap-teco", method: "get" });
  },
};
