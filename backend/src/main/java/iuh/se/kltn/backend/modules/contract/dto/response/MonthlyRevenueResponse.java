package iuh.se.kltn.backend.modules.contract.dto;

public class MonthlyRevenueResponse {

    private Integer year;
    private Integer month;
    private Double revenue;

    public MonthlyRevenueResponse() {
    }

    public MonthlyRevenueResponse(Integer year, Integer month, Double revenue) {
        this.year = year;
        this.month = month;
        this.revenue = revenue;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public Double getRevenue() {
        return revenue;
    }

    public void setRevenue(Double revenue) {
        this.revenue = revenue;
    }

    public String getPeriod() {
        return String.format("%02d/%d", month, year);
    }
}