package iuh.se.kltn.backend.modules.user.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class EmailOnlyRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    @JsonAlias({"userEmail", "username"})
    private String email;
}
