package iuh.se.kltn.backend.modules.contract.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ResidentRequestDTO {
    @NotNull(message = "Thiếu mã hợp đồng")
    private Long contractId;

    @NotBlank(message = "Thiếu email người được mời")
    @Email(message = "Email không hợp lệ")
    private String inviteeEmail;

    private String message;
}
