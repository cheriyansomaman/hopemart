package checkout

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type CheckoutHandler struct {
	svc *CheckoutService
}

func NewCheckoutHandler(svc *CheckoutService) *CheckoutHandler {
	return &CheckoutHandler{svc: svc}
}

func (h *CheckoutHandler) RegisterRoutes(r gin.IRouter) {
	r.POST("/checkout", h.Checkout)
}

func (h *CheckoutHandler) Checkout(c *gin.Context) {
	uid := c.GetString("uid")
	var body struct {
		CouponCode string `json:"couponCode"`
	}
	_ = c.ShouldBindJSON(&body)

	order, err := h.svc.PlaceOrder(c.Request.Context(), uid, body.CouponCode)
	if err != nil {
		if err.Error() == "bag is empty" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bag is empty"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, order)
}
