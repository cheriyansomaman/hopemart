package checkout

import (
	"context"
	"fmt"

	couponpkg "github.com/hopemart/backend/internal/coupon"
)

type CheckoutService struct {
	bagSvc    *BagService
	orderSvc  *OrderService
	couponSvc *couponpkg.Service
}

func NewCheckoutService(bagSvc *BagService, orderSvc *OrderService, couponSvc *couponpkg.Service) *CheckoutService {
	return &CheckoutService{bagSvc: bagSvc, orderSvc: orderSvc, couponSvc: couponSvc}
}

func (s *CheckoutService) PlaceOrder(ctx context.Context, uid, couponCode string) (*Order, error) {
	bagItems, err := s.bagSvc.Get(ctx, uid)
	if err != nil || len(bagItems) == 0 {
		return nil, fmt.Errorf("bag is empty")
	}

	var subtotal float64
	for _, item := range bagItems {
		subtotal += item.Price * float64(item.Qty)
	}

	var discount float64
	couponApplied := false
	if couponCode != "" {
		result, err := s.couponSvc.Validate(ctx, couponCode, subtotal)
		if err == nil && result.Valid {
			discount = result.Discount
			couponApplied = true
		}
	}

	order, err := s.orderSvc.Create(ctx, uid, bagItems, discount, couponCode)
	if err != nil {
		return nil, err
	}

	// Best-effort: don't fail the order if coupon increment or bag clear errors.
	if couponApplied {
		_ = s.couponSvc.IncrementUsage(ctx, couponCode)
	}
	_ = s.bagSvc.Clear(ctx, uid)

	return order, nil
}
