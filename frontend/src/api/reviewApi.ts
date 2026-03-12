import axiosClient from "./axiosClient";
import type { ReviewRequest, ReviewResponse } from "@/types";

export const reviewApi = {
  // Khách thuê viết đánh giá
  createReview: (data: ReviewRequest) => {
    return axiosClient.post("/reviews", data);
  },

  // Lấy danh sách đánh giá của 1 chủ nhà
  getReviewsByLandlord: (landlordId: number | string) => {
    return axiosClient.get(`/reviews/landlord/${landlordId}`);
  },
  getReviewsByProperty: (propertyId: number | string) => {
    return axiosClient.get(`/reviews/property/${propertyId}`);
  }
};