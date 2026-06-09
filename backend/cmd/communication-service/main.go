package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/communication"
	sharedcfg "github.com/hopemart/backend/internal/shared/config"
	sharedfb "github.com/hopemart/backend/internal/shared/firebase"
	"github.com/hopemart/backend/internal/shared/middleware"
	sharedrepo "github.com/hopemart/backend/internal/shared/repository"
)

func main() {
	cfg := sharedcfg.Load("8086")
	ctx := context.Background()

	fb := sharedfb.NewClient(ctx, cfg.FirebaseProjectID, cfg.GoogleApplicationCredentials)
	defer fb.Firestore.Close()

	repo := sharedrepo.New(fb.Firestore)
	addressSvc := communication.NewAddressService(repo)
	wishlistSvc := communication.NewWishlistService(repo)

	addressH := communication.NewAddressHandler(addressSvc)
	wishlistH := communication.NewWishlistHandler(wishlistSvc)

	r := gin.New()
	r.Use(gin.Recovery())

	auth := middleware.Auth(fb.Auth)
	g := r.Group("", auth)
	addressH.RegisterRoutes(g)
	wishlistH.RegisterRoutes(g)

	log.Printf("communication-service starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("communication-service: %v", err)
	}
}
