package iuh.se.kltn.backend.modules.contract.dto.response;

import lombok.Data;

@Data
public class ResidentRequestResponse {
    private Long id;
    private String fullName;
    private String cccdNumber;
    private String status;
    private Long contractId;
}