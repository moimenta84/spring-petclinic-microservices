FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/spring-petclinic-api-gateway-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
