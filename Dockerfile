FROM openjdk:17-slim
RUN apt-get update && apt-get install -y curl wget
WORKDIR /app
RUN wget -O playit https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-x86_64 && chmod +x playit
COPY . .
RUN echo "eula=true" > eula.txt
CMD ["sh", "-c", "./playit & java -Xmx512M -Xms512M -jar paper.jar nogui"]
