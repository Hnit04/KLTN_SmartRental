package iuh.se.kltn.backend.modules.ai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_sql_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiSqlCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question", unique = true, length = 500, nullable = false)
    private String question;

    @Column(name = "generated_sql", length = 1000)
    private String generatedSql;

    @Builder.Default
    @Column(name = "type", length = 20)
    private String type = "SQL"; // "SQL" or "FAQ"

    @Column(name = "answer", columnDefinition = "TEXT")
    private String answer;

    @Builder.Default
    @Column(name = "is_valid")
    private boolean isValid = true;
}