package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/checkout"
	"github.com/hopemart/backend/internal/coupon"
	sharedcfg "github.com/hopemart/backend/internal/shared/config"
	sharedfb "github.com/hopemart/backend/internal/shared/firebase"
	"github.com/hopemart/backend/internal/shared/middleware"
	sharedrepo "github.com/hopemart/backend/internal/shared/repository"
)

func main() {
	cfg := sharedcfg.Load("8083")
	ctx := context.Background()

	fb := sharedfb.NewClient(ctx, cfg.FirebaseProjectID, cfg.GoogleApplicationCredentials)
	defer fb.Firestore.Close()

	repo := sharedrepo.New(fb.Firestore)

	bagSvc := checkout.NewBagService(repo)
	orderSvc := checkout.NewOrderService(repo)
	couponSvc := coupon.NewService(repo)
	checkoutSvc := checkout.NewCheckoutService(bagSvc, orderSvc, couponSvc)

	bagH := checkout.NewBagHandler(bagSvc)
	orderH := checkout.NewOrderHandler(orderSvc)
	checkoutH := checkout.NewCheckoutHandler(checkoutSvc)

	r := gin.New()
	r.Use(gin.Recovery())

	auth := middleware.Auth(fb.Auth)
	admin := middleware.AdminOnly()
	g := r.Group("", auth)
	bagH.RegisterRoutes(g)
	orderH.RegisterRoutes(g)
	checkoutH.RegisterRoutes(g)
	orderH.RegisterAdminRoutes(r.Group("", auth, admin))

	log.Printf("checkout-service starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("checkout-service: %v", err)
	}
}
