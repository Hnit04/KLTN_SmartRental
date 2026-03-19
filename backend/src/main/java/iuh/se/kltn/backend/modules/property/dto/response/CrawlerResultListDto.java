package iuh.se.kltn.backend.modules.property.dto.response;

import lombok.Data;
import java.util.List;

@Data
public class CrawlerResultListDto {
    private List<CrawlerResultDto> results;
}
