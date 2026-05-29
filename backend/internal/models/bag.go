package models

import "time"

type BagItem struct {
	ItemID   string    `json:"itemId" firestore:"itemId"`
	Name     string    `json:"name" firestore:"name"`
	Price    float64   `json:"price" firestore:"price"`
	ImageURL string    `json:"imageUrl" firestore:"imageUrl"`
	Qty      int       `json:"qty" firestore:"qty"`
	AddedAt  time.Time `json:"addedAt" firestore:"addedAt"`
}

type Bag struct {
	UserID string    `json:"userId"`
	Items  []BagItem `json:"items"`
}
