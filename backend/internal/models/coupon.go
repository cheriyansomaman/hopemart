package models

import "time"

type Coupon struct {
	Code      string    `json:"code" firestore:"code"`
	Discount  float64   `json:"discount" firestore:"discount"`
	Type      string    `json:"type" firestore:"type"` // "percent" or "fixed"
	MinOrder  float64   `json:"minOrder" firestore:"minOrder"`
	MaxUses   int       `json:"maxUses" firestore:"maxUses"`
	UsedCount int       `json:"usedCount" firestore:"usedCount"`
	ExpiresAt time.Time `json:"expiresAt" firestore:"expiresAt"`
}

type CouponValidateResponse struct {
	Valid       bool    `json:"valid"`
	Discount    float64 `json:"discount"`
	Type        string  `json:"type"`
	Description string  `json:"description"`
}
