package iuh.se.kltn.backend.modules.interaction.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AppointmentRequest {
    @NotNull(message = "Room ID is required")
    @Positive(message = "Room ID must be greater than 0")
    private Long roomId;

    @NotNull(message = "Meeting time is required")
    @Future(message = "Meeting time must be in the future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime meetTime;

    @Size(max = 500, message = "Meeting link is too long")
    private String meetingLink;

    @Size(max = 2000, message = "Note is too long")
    private String note;
}
