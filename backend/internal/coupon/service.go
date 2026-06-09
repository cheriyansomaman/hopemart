package coupon

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/hopemart/backend/internal/shared/repository"
)

type Service struct {
	repo *repository.FirestoreRepo
}

func NewService(repo *repository.FirestoreRepo) *Service {
	return &Service{repo: repo}
}

func (s *Service) Validate(ctx context.Context, code string, orderTotal float64) (*ValidateResponse, error) {
	doc, err := s.repo.Doc("coupons", code).Get(ctx)
	if err != nil {
		return &ValidateResponse{Valid: false}, nil
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

	c := Coupon{
		Code:      raw.Code,
		Discount:  raw.Discount,
		Type:      raw.Type,
		MinOrder:  raw.MinOrder,
		MaxUses:   raw.MaxUses,
		UsedCount: raw.UsedCount,
		ExpiresAt: expiresAt,
	}

	if time.Now().After(c.ExpiresAt) {
		return &ValidateResponse{Valid: false}, nil
	}
	if c.MaxUses > 0 && c.UsedCount >= c.MaxUses {
		return &ValidateResponse{Valid: false}, nil
	}
	if orderTotal < c.MinOrder {
		return &ValidateResponse{Valid: false}, nil
	}

	var discount float64
	var desc string
	if c.Type == "percent" {
		discount = orderTotal * c.Discount / 100
		desc = fmt.Sprintf("%.0f%% off", c.Discount)
	} else {
		discount = c.Discount
		desc = fmt.Sprintf("$%.2f off", c.Discount)
	}

	return &ValidateResponse{
		Valid:       true,
		Discount:    discount,
		Type:        c.Type,
		Description: desc,
	}, nil
}

// IncrementUsage atomically increments usedCount. Safe under concurrent orders.
func (s *Service) IncrementUsage(ctx context.Context, code string) error {
	ref := s.repo.Doc("coupons", code)
	_, err := ref.Update(ctx, []firestore.Update{
		{Path: "usedCount", Value: firestore.Increment(1)},
	})
	return err
}

func (s *Service) List(ctx context.Context) ([]Coupon, error) {
	docs, err := s.repo.GetAll(ctx, s.repo.Collection("coupons").Query)
	if err != nil {
		return nil, fmt.Errorf("list coupons: %w", err)
	}
	coupons := make([]Coupon, 0, len(docs))
	for _, doc := range docs {
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
			continue
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
		coupons = append(coupons, Coupon{
			Code:      raw.Code,
			Discount:  raw.Discount,
			Type:      raw.Type,
			MinOrder:  raw.MinOrder,
			MaxUses:   raw.MaxUses,
			UsedCount: raw.UsedCount,
			ExpiresAt: expiresAt,
		})
	}
	return coupons, nil
}

func (s *Service) Create(ctx context.Context, c Coupon) error {
	if _, err := s.repo.Doc("coupons", c.Code).Set(ctx, c); err != nil {
		return fmt.Errorf("create coupon: %w", err)
	}
	return nil
}

func (s *Service) Update(ctx context.Context, code string, fields map[string]any) error {
	if _, err := s.repo.Doc("coupons", code).Set(ctx, fields, firestore.MergeAll); err != nil {
		return fmt.Errorf("update coupon: %w", err)
	}
	return nil
}

func (s *Service) Delete(ctx context.Context, code string) error {
	if _, err := s.repo.Doc("coupons", code).Delete(ctx); err != nil {
		return fmt.Errorf("delete coupon: %w", err)
	}
	return nil
}
