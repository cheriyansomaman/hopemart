package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                         string
	FirebaseProjectID            string
	GoogleApplicationCredentials string
	UploadsDir                   string
	UploadsBase                  string
}

func Load(defaultPort string) *Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	uploadsDir := os.Getenv("UPLOADS_DIR")
	if uploadsDir == "" {
		uploadsDir = "./uploads"
	}

	uploadsBase := os.Getenv("UPLOADS_BASE_URL")
	if uploadsBase == "" {
		uploadsBase = "http://localhost:8080"
	}

	return &Config{
		Port:                         port,
		FirebaseProjectID:            os.Getenv("FIREBASE_PROJECT_ID"),
		GoogleApplicationCredentials: os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"),
		UploadsDir:                   uploadsDir,
		UploadsBase:                  uploadsBase,
	}
}
