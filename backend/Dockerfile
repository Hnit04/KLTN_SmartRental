# ============================================
# SmartRental Backend - Multi-stage Docker Build
# Java 21 + Spring Boot 3.2 + Maven
# ============================================

# ---------- Stage 1: Build ----------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source
COPY src ./src

# Build project
RUN mvn clean package -DskipTests -B


# ---------- Stage 2: Runtime ----------
FROM eclipse-temurin:21-jre

WORKDIR /app

# Install required native libs for ONNX Runtime
RUN apt-get update && apt-get install -y \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r spring && useradd -r -g spring spring

# Copy jar
COPY --from=build /app/target/*.jar app.jar

# Permissions
RUN chown spring:spring app.jar

USER spring:spring

EXPOSE 8080

# Start application (Dùng shell form để resolve environment variables)
# Cấu hình tối ưu cho Render Free (512MB RAM): 
# -Xms128m -Xmx256m: Giới hạn Heap an toàn để nhường RAM cho Native Memory (ONNX).
# -XX:+UseSerialGC: Tiết kiệm tài nguyên nhất cho máy cấu hình thấp.
ENTRYPOINT java -Xms128m -Xmx256m -XX:+UseSerialGC -Dspring.profiles.active=${SPRING_PROFILE:-default} -jar app.jar
