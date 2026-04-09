package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ResidentRemoveRequestDTO {
    @NotNull(message = "Thiếu mã hợp đồng")
    private Long contractId;

    @NotNull(message = "Thiếu mã người dùng cần xóa")
    private Long userId;

    private String message;
}
