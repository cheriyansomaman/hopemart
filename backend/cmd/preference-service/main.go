package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	sharedcfg "github.com/hopemart/backend/internal/shared/config"
	sharedfb "github.com/hopemart/backend/internal/shared/firebase"
	"github.com/hopemart/backend/internal/shared/middleware"
	sharedrepo "github.com/hopemart/backend/internal/shared/repository"
	"github.com/hopemart/backend/internal/preference"
)

func main() {
	cfg := sharedcfg.Load("8084")
	ctx := context.Background()

	fb := sharedfb.NewClient(ctx, cfg.FirebaseProjectID, cfg.GoogleApplicationCredentials)
	defer fb.Firestore.Close()

	repo := sharedrepo.New(fb.Firestore)
	svc := preference.NewService(repo)
	h := preference.NewHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())

	auth := middleware.Auth(fb.Auth)
	h.RegisterRoutes(r.Group("", auth))

	log.Printf("preference-service starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("preference-service: %v", err)
	}
}
