package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                       string
	FirebaseProjectID          string
	GoogleApplicationCredentials string
}

func Load() *Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return &Config{
		Port:                       port,
		FirebaseProjectID:          os.Getenv("FIREBASE_PROJECT_ID"),
		GoogleApplicationCredentials: os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"),
	}
}
