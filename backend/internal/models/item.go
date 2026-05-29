package models

import "time"

type Item struct {
	ID          string    `json:"id" firestore:"id"`
	Name        string    `json:"name" firestore:"name"`
	Description string    `json:"description" firestore:"description"`
	Price       float64   `json:"price" firestore:"price"`
	ImageURL    string    `json:"imageUrl" firestore:"imageUrl"`
	Category    string    `json:"category" firestore:"category"`
	Stock       int       `json:"stock" firestore:"stock"`
	StockType   string    `json:"stockType" firestore:"stockType"` // "quantity" or "weight"
	TotalWeight float64   `json:"totalWeight" firestore:"totalWeight"`
	WeightUnit  string    `json:"weightUnit" firestore:"weightUnit"`
	CreatedAt   time.Time `json:"createdAt" firestore:"createdAt"`
}
