# ============================================
# SmartRental Backend - Multi-stage Docker Build
# Java 21 + Spring Boot 3.2 + Maven
# ============================================

# --- Stage 1: Build ---
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Cache dependencies (chỉ rebuild khi pom.xml thay đổi)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source và build
COPY src ./src
RUN mvn package -DskipTests -B

# --- Stage 2: Runtime ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Cài đặt thư viện C++ và glibc compatibility cho Alpine (Bắt buộc cho AI/ONNX)
RUN apk add --no-cache libstdc++ gcompat libc6-compat

# Tạo user non-root cho bảo mật
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy JAR từ build stage
COPY --from=build /app/target/*.jar app.jar

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=${SPRING_PROFILE:default}", "app.jar"]
