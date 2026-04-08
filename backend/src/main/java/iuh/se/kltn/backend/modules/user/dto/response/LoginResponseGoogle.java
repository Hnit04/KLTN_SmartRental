package iuh.se.kltn.backend.modules.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponseGoogle {
    private String username;
    private String password;
}