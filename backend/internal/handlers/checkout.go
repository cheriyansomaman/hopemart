package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/services"
)

type CheckoutHandler struct {
	bagSvc    *services.BagService
	orderSvc  *services.OrderService
	couponSvc *services.CouponService
}

func NewCheckoutHandler(bagSvc *services.BagService, orderSvc *services.OrderService, couponSvc *services.CouponService) *CheckoutHandler {
	return &CheckoutHandler{bagSvc: bagSvc, orderSvc: orderSvc, couponSvc: couponSvc}
}

func (h *CheckoutHandler) Checkout(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := c.Request.Context()

	var body struct {
		CouponCode string `json:"couponCode"`
	}
	_ = c.ShouldBindJSON(&body)

	bagItems, err := h.bagSvc.Get(ctx, uid)
	if err != nil || len(bagItems) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bag is empty"})
		return
	}

	var subtotal float64
	for _, item := range bagItems {
		subtotal += item.Price * float64(item.Qty)
	}

	var discount float64
	couponApplied := false
	if body.CouponCode != "" {
		result, err := h.couponSvc.Validate(ctx, body.CouponCode, subtotal)
		if err == nil && result.Valid {
			discount = result.Discount
			couponApplied = true
		}
	}

	order, err := h.orderSvc.Create(ctx, uid, bagItems, discount, body.CouponCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Increment coupon usage after confirmed order. Best-effort — don't fail the order if this errors.
	if couponApplied {
		_ = h.couponSvc.IncrementUsage(ctx, body.CouponCode)
	}

	_ = h.bagSvc.Clear(ctx, uid)

	c.JSON(http.StatusOK, order)
}
