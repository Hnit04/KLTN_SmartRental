// src/main/java/iuh/se/kltn/backend/modules/interaction/dto/response/AppointmentResponse.java
package iuh.se.kltn.backend.modules.interaction.dto.response;

import iuh.se.kltn.backend.modules.interaction.enums.AppointmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {
    private Long id;
    private Long roomId;
    private String roomName;
    private Long landlordId;
    private String landlordFullName;
    private LocalDateTime meetTime;
    private AppointmentStatus status;
    private String note;
    private String meetingLink;
    private LocalDateTime createdAt;
}