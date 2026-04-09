package iuh.se.kltn.backend.modules.contract.dto.response;

import lombok.Data;

@Data
public class ResidentRequestResponse {
    private Long id;
    private Long contractId;
    private String status;
    private String type; // ADD or REMOVE
    private String message;
    private java.time.LocalDateTime createdAt;

    // Invitee Info (Người được mời)
    private Long inviteeId;
    private String inviteeName;
    private String inviteeEmail;
    private String inviteePhone;
    private String inviteeZaloPhone;
    private String inviteeAvatar;
    private int inviteeReputationScore;
    private String inviteeKycStatus;
    private String inviteeCurrentAddress;
    private java.time.LocalDate inviteeDateOfBirth;

    // Requester Info (Người gửi yêu cầu)
    private Long requesterId;
    private String requesterName;
}