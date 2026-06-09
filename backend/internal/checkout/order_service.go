package checkout

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/hopemart/backend/internal/shared/repository"
)

type OrderService struct {
	repo *repository.FirestoreRepo
}

func NewOrderService(repo *repository.FirestoreRepo) *OrderService {
	return &OrderService{repo: repo}
}

func (s *OrderService) Create(ctx context.Context, userID string, bagItems []BagItem, discount float64, couponCode string) (*Order, error) {
	var subtotal float64
	orderItems := make([]OrderItem, 0, len(bagItems))
	for _, b := range bagItems {
		subtotal += b.Price * float64(b.Qty)
		orderItems = append(orderItems, OrderItem{
			ItemID:   b.ItemID,
			Name:     b.Name,
			Price:    b.Price,
			ImageURL: b.ImageURL,
			Qty:      b.Qty,
		})
	}

	now := time.Now()
	order := Order{
		ID:         uuid.New().String(),
		UserID:     userID,
		Items:      orderItems,
		Subtotal:   subtotal,
		Discount:   discount,
		Total:      subtotal - discount,
		CouponCode: couponCode,
		Status:     "confirmed",
		TrackingSteps: []TrackingStep{
			{Status: "confirmed", Label: "Order Confirmed", Timestamp: now},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Atomically deduct stock and create order in single transaction.
	err := s.repo.Client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Read all item docs first — Firestore requires all reads before writes in a transaction.
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

		return tx.Set(s.repo.Doc("orders", order.ID), order)
	})
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}
	return &order, nil
}

func (s *OrderService) ListByUser(ctx context.Context, userID string) ([]Order, error) {
	query := s.repo.Collection("orders").Where("userId", "==", userID)
	docs, err := s.repo.GetAll(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}

	orders := make([]Order, 0, len(docs))
	for _, doc := range docs {
		var o Order
		if err := doc.DataTo(&o); err != nil {
			continue
		}
		orders = append(orders, o)
	}

	// Sort descending by CreatedAt (newest first) without requiring Firestore composite index.
	for i := 0; i < len(orders)-1; i++ {
		for j := i + 1; j < len(orders); j++ {
			if orders[j].CreatedAt.After(orders[i].CreatedAt) {
				orders[i], orders[j] = orders[j], orders[i]
			}
		}
	}

	return orders, nil
}

func (s *OrderService) Cancel(ctx context.Context, orderID, userID string) error {
	doc, err := s.repo.Doc("orders", orderID).Get(ctx)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}
	var o Order
	if err := doc.DataTo(&o); err != nil {
		return fmt.Errorf("decode order: %w", err)
	}
	if o.UserID != userID {
		return fmt.Errorf("forbidden")
	}
	if o.Status != "confirmed" {
		return fmt.Errorf("only confirmed orders can be cancelled")
	}
	_, err = s.repo.Doc("orders", orderID).Update(ctx, []firestore.Update{
		{Path: "status", Value: "cancelled"},
		{Path: "updatedAt", Value: time.Now()},
	})
	return err
}

func (s *OrderService) GetByID(ctx context.Context, orderID string) (*Order, error) {
	doc, err := s.repo.Doc("orders", orderID).Get(ctx)
	if err != nil {
		return nil, err
	}
	var o Order
	if err := doc.DataTo(&o); err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *OrderService) ListAll(ctx context.Context) ([]Order, error) {
	docs, err := s.repo.GetAll(ctx, s.repo.Collection("orders").Query)
	if err != nil {
		return nil, fmt.Errorf("list all orders: %w", err)
	}
	orders := make([]Order, 0, len(docs))
	for _, doc := range docs {
		var o Order
		if err := doc.DataTo(&o); err != nil {
			continue
		}
		orders = append(orders, o)
	}
	for i := 0; i < len(orders)-1; i++ {
		for j := i + 1; j < len(orders); j++ {
			if orders[j].CreatedAt.After(orders[i].CreatedAt) {
				orders[i], orders[j] = orders[j], orders[i]
			}
		}
	}
	return orders, nil
}

func (s *OrderService) UpdateStatus(ctx context.Context, orderID, status string, step TrackingStep) error {
	step.Timestamp = time.Now()
	_, err := s.repo.Doc("orders", orderID).Update(ctx, []firestore.Update{
		{Path: "status", Value: status},
		{Path: "updatedAt", Value: time.Now()},
		{Path: "trackingSteps", Value: firestore.ArrayUnion(step)},
	})
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	return nil
}
