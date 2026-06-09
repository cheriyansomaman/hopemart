package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/party"
	sharedcfg "github.com/hopemart/backend/internal/shared/config"
	sharedfb "github.com/hopemart/backend/internal/shared/firebase"
	"github.com/hopemart/backend/internal/shared/middleware"
	sharedrepo "github.com/hopemart/backend/internal/shared/repository"
)

func main() {
	cfg := sharedcfg.Load("8085")
	ctx := context.Background()

	fb := sharedfb.NewClient(ctx, cfg.FirebaseProjectID, cfg.GoogleApplicationCredentials)
	defer fb.Firestore.Close()

	repo := sharedrepo.New(fb.Firestore)
	svc := party.NewService(repo, fb)
	h := party.NewHandler(svc)

	r := gin.New()
	r.Use(gin.Recovery())

	auth := middleware.Auth(fb.Auth)
	admin := middleware.AdminOnly()
	h.RegisterRoutes(r.Group("", auth))
	h.RegisterAdminRoutes(r.Group("", auth, admin))

	log.Printf("party-service starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("party-service: %v", err)
	}
}
