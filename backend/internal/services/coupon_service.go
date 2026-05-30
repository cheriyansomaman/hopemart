package services

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/hopemart/backend/internal/models"
	"github.com/hopemart/backend/internal/repository"
)

type CouponService struct {
	repo *repository.FirestoreRepo
}

func NewCouponService(repo *repository.FirestoreRepo) *CouponService {
	return &CouponService{repo: repo}
}

func (s *CouponService) Validate(ctx context.Context, code string, orderTotal float64) (*models.CouponValidateResponse, error) {
	doc, err := s.repo.Doc("coupons", code).Get(ctx)
	if err != nil {
		return &models.CouponValidateResponse{Valid: false}, nil
	}

	// Use interface{} for expiresAt to handle both legacy ISO strings and Firestore Timestamps.
	var raw struct {
		Code      string      `firestore:"code"`
		Discount  float64     `firestore:"discount"`
		Type      string      `firestore:"type"`
		MinOrder  float64     `firestore:"minOrder"`
		MaxUses   int         `firestore:"maxUses"`
		UsedCount int         `firestore:"usedCount"`
		ExpiresAt interface{} `firestore:"expiresAt"`
	}
	if err := doc.DataTo(&raw); err != nil {
		return nil, fmt.Errorf("parse coupon: %w", err)
	}

	var expiresAt time.Time
	switch v := raw.ExpiresAt.(type) {
	case time.Time:
		expiresAt = v
	case string:
		if t, parseErr := time.Parse(time.RFC3339, v); parseErr == nil {
			expiresAt = t
		}
	}

	coupon := models.Coupon{
		Code:      raw.Code,
		Discount:  raw.Discount,
		Type:      raw.Type,
		MinOrder:  raw.MinOrder,
		MaxUses:   raw.MaxUses,
		UsedCount: raw.UsedCount,
		ExpiresAt: expiresAt,
	}

	if time.Now().After(coupon.ExpiresAt) {
		return &models.CouponValidateResponse{Valid: false}, nil
	}
	if coupon.MaxUses > 0 && coupon.UsedCount >= coupon.MaxUses {
		return &models.CouponValidateResponse{Valid: false}, nil
	}
	if orderTotal < coupon.MinOrder {
		return &models.CouponValidateResponse{Valid: false}, nil
	}

	var discount float64
	var desc string
	if coupon.Type == "percent" {
		discount = orderTotal * coupon.Discount / 100
		desc = fmt.Sprintf("%.0f%% off", coupon.Discount)
	} else {
		discount = coupon.Discount
		desc = fmt.Sprintf("$%.2f off", coupon.Discount)
	}

	return &models.CouponValidateResponse{
		Valid:       true,
		Discount:    discount,
		Type:        coupon.Type,
		Description: desc,
	}, nil
}

// IncrementUsage atomically increments usedCount. Safe under concurrent orders.
func (s *CouponService) IncrementUsage(ctx context.Context, code string) error {
	ref := s.repo.Doc("coupons", code)
	_, err := ref.Update(ctx, []firestore.Update{
		{Path: "usedCount", Value: firestore.Increment(1)},
	})
	return err
}
