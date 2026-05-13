package iuh.se.kltn.backend.modules.contract.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContractTermsRequest {
    @Size(max = 10000, message = "Terms are too long")
    @JsonAlias({"additionalTerms", "content"})
    private String terms;
}
