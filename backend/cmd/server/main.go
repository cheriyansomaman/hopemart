package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/config"
	fbclient "github.com/hopemart/backend/internal/firebase"
	"github.com/hopemart/backend/internal/handlers"
	"github.com/hopemart/backend/internal/middleware"
	"github.com/hopemart/backend/internal/repository"
	"github.com/hopemart/backend/internal/services"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	fb := fbclient.NewClient(ctx, cfg.FirebaseProjectID, cfg.GoogleApplicationCredentials)
	defer fb.Firestore.Close()

	repo := repository.New(fb.Firestore)

	itemSvc := services.NewItemService(repo)
	bagSvc := services.NewBagService(repo)
	couponSvc := services.NewCouponService(repo)
	orderSvc := services.NewOrderService(repo)

	itemH := handlers.NewItemHandler(itemSvc)
	bagH := handlers.NewBagHandler(bagSvc)
	couponH := handlers.NewCouponHandler(couponSvc)
	checkoutH := handlers.NewCheckoutHandler(bagSvc, orderSvc, couponSvc)
	orderH := handlers.NewOrderHandler(orderSvc)
	authH := handlers.NewAuthHandler(fb)

	r := gin.Default()
	r.Use(middleware.CORS())

	authMiddleware := middleware.Auth(fb.Auth)

	r.POST("/auth/verify", authMiddleware, authH.Verify)

	items := r.Group("/items", authMiddleware)
	{
		items.GET("", itemH.List)
		items.GET("/search", itemH.Search)
		items.GET("/:id", itemH.GetByID)
	}

	bag := r.Group("/bag", authMiddleware)
	{
		bag.GET("", bagH.Get)
		bag.POST("", bagH.AddOrUpdate)
		bag.PUT("/:itemId", bagH.UpdateQty)
		bag.DELETE("/:itemId", bagH.Remove)
		bag.DELETE("", bagH.Clear)
	}

	r.POST("/coupon/validate", authMiddleware, couponH.Validate)
	r.POST("/checkout", authMiddleware, checkoutH.Checkout)

	orders := r.Group("/orders", authMiddleware)
	{
		orders.GET("", orderH.List)
		orders.GET("/:id", orderH.GetByID)
		orders.GET("/:id/track", orderH.Track)
	}

	log.Printf("server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
