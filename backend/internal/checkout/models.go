package checkout

import "time"

type BagItem struct {
	ItemID   string    `json:"itemId" firestore:"itemId"`
	Name     string    `json:"name" firestore:"name"`
	Price    float64   `json:"price" firestore:"price"`
	ImageURL string    `json:"imageUrl" firestore:"imageUrl"`
	Qty      int       `json:"qty" firestore:"qty"`
	AddedAt  time.Time `json:"addedAt" firestore:"addedAt"`
}

type TrackingStep struct {
	Status    string    `json:"status" firestore:"status"`
	Label     string    `json:"label" firestore:"label"`
	Timestamp time.Time `json:"timestamp" firestore:"timestamp"`
}

type OrderItem struct {
	ItemID   string  `json:"itemId" firestore:"itemId"`
	Name     string  `json:"name" firestore:"name"`
	Price    float64 `json:"price" firestore:"price"`
	ImageURL string  `json:"imageUrl" firestore:"imageUrl"`
	Qty      int     `json:"qty" firestore:"qty"`
}

type Order struct {
	ID            string         `json:"id" firestore:"id"`
	UserID        string         `json:"userId" firestore:"userId"`
	Items         []OrderItem    `json:"items" firestore:"items"`
	Subtotal      float64        `json:"subtotal" firestore:"subtotal"`
	Discount      float64        `json:"discount" firestore:"discount"`
	Total         float64        `json:"total" firestore:"total"`
	CouponCode    string         `json:"couponCode,omitempty" firestore:"couponCode,omitempty"`
	Status        string         `json:"status" firestore:"status"`
	TrackingSteps []TrackingStep `json:"trackingSteps" firestore:"trackingSteps"`
	CreatedAt     time.Time      `json:"createdAt" firestore:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt" firestore:"updatedAt"`
}
