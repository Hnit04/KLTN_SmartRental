# ============================================
# SmartRental Backend - Multi-stage Docker Build (Debian-based for AI Compatibility)
# Java 21 + Spring Boot 3.2 + Maven
# ============================================

# --- Stage 1: Build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source và build
COPY src ./src
RUN mvn package -DskipTests -B

# --- Stage 2: Runtime ---
# Chuyển từ alpine sang debian để hỗ trợ tốt nhất cho ONNX Runtime (AI)
FROM eclipse-temurin:21-jre
WORKDIR /app

# Cài đặt thư viện C++ cần thiết
RUN apt-get update && apt-get install -y libstdc++6 && rm -rf /var/lib/apt/lists/*

# Tạo user non-root cho bảo mật (Debian commands)
RUN groupadd -r spring && useradd -r -g spring spring
USER spring:spring

# Copy JAR từ build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=${SPRING_PROFILE:default}", "app.jar"]
