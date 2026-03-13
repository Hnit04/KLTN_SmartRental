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

    @Column(name = "generated_sql", length = 1000, nullable = false)
    private String generatedSql;

    @Column(name = "is_valid")
    private boolean isValid = true;
}