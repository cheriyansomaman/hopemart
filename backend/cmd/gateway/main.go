package main

import (
	"log"

	"github.com/hopemart/backend/internal/gateway"
	sharedcfg "github.com/hopemart/backend/internal/shared/config"
)

func main() {
	cfg := sharedcfg.Load("8080")
	r := gateway.New()
	log.Printf("gateway starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("gateway: %v", err)
	}
}
