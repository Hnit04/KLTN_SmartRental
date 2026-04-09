package iuh.se.kltn.backend.modules.contract.dto.response;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ContractMemberResponse {
    private Long id;
    private Long userId;
    private String fullName;
    private String email;
    private String avatarUrl;
    private int reputationScore;
    private LocalDate joinedDate;
}
