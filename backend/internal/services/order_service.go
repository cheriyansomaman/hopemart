package services

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/hopemart/backend/internal/models"
	"github.com/hopemart/backend/internal/repository"
)

type OrderService struct {
	repo *repository.FirestoreRepo
}

func NewOrderService(repo *repository.FirestoreRepo) *OrderService {
	return &OrderService{repo: repo}
}

func (s *OrderService) Create(ctx context.Context, userID string, bagItems []models.BagItem, discount float64, couponCode string) (*models.Order, error) {
	var subtotal float64
	orderItems := make([]models.OrderItem, 0, len(bagItems))
	for _, b := range bagItems {
		subtotal += b.Price * float64(b.Qty)
		orderItems = append(orderItems, models.OrderItem{
			ItemID:   b.ItemID,
			Name:     b.Name,
			Price:    b.Price,
			ImageURL: b.ImageURL,
			Qty:      b.Qty,
		})
	}

	now := time.Now()
	order := models.Order{
		ID:         uuid.New().String(),
		UserID:     userID,
		Items:      orderItems,
		Subtotal:   subtotal,
		Discount:   discount,
		Total:      subtotal - discount,
		CouponCode: couponCode,
		Status:     "confirmed",
		TrackingSteps: []models.TrackingStep{
			{Status: "confirmed", Label: "Order Confirmed", Timestamp: now},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Atomically deduct stock and create order in a single transaction.
	err := s.repo.Client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Read all item docs first (Firestore requires all reads before writes in a transaction).
		itemRefs := make([]*firestore.DocumentRef, len(bagItems))
		for i, b := range bagItems {
			itemRefs[i] = s.repo.Doc("items", b.ItemID)
		}

		itemSnaps := make([]*firestore.DocumentSnapshot, len(itemRefs))
		for i, ref := range itemRefs {
			snap, err := tx.Get(ref)
			if err != nil {
				return fmt.Errorf("fetch item %s: %w", ref.ID, err)
			}
			itemSnaps[i] = snap
		}

		// Validate stock and prepare updates.
		for i, snap := range itemSnaps {
			qty := bagItems[i].Qty
			stockType, _ := snap.DataAt("stockType")

			if stockType == "weight" {
				totalWeight, _ := snap.DataAt("totalWeight")
				tw, _ := totalWeight.(float64)
				needed := float64(qty)
				if tw < needed {
					return fmt.Errorf("insufficient weight stock for %s (have %.2f, need %.2f)", bagItems[i].Name, tw, needed)
				}
				if err := tx.Update(itemRefs[i], []firestore.Update{
					{Path: "totalWeight", Value: firestore.Increment(-needed)},
				}); err != nil {
					return err
				}
			} else {
				stock, _ := snap.DataAt("stock")
				s64, _ := stock.(int64)
				current := int(s64)
				if current < qty {
					return fmt.Errorf("insufficient stock for %s (have %d, need %d)", bagItems[i].Name, current, qty)
				}
				if err := tx.Update(itemRefs[i], []firestore.Update{
					{Path: "stock", Value: firestore.Increment(-qty)},
				}); err != nil {
					return err
				}
			}
		}

		// Write the order doc.
		return tx.Set(s.repo.Doc("orders", order.ID), order)
	})
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}
	return &order, nil
}

func (s *OrderService) ListByUser(ctx context.Context, userID string) ([]models.Order, error) {
	query := s.repo.Collection("orders").Where("userId", "==", userID).OrderBy("createdAt", 1)
	docs, err := s.repo.GetAll(ctx, query)
	if err != nil {
		return nil, err
	}

	orders := make([]models.Order, 0, len(docs))
	for _, doc := range docs {
		var o models.Order
		if err := doc.DataTo(&o); err != nil {
			continue
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func (s *OrderService) GetByID(ctx context.Context, orderID string) (*models.Order, error) {
	doc, err := s.repo.Doc("orders", orderID).Get(ctx)
	if err != nil {
		return nil, err
	}
	var o models.Order
	if err := doc.DataTo(&o); err != nil {
		return nil, err
	}
	return &o, nil
}
