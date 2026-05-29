package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/services"
)

type CouponHandler struct {
	svc *services.CouponService
}

func NewCouponHandler(svc *services.CouponService) *CouponHandler {
	return &CouponHandler{svc: svc}
}

func (h *CouponHandler) Validate(c *gin.Context) {
	var body struct {
		Code       string  `json:"code"`
		OrderTotal float64 `json:"orderTotal"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code required"})
		return
	}

	result, err := h.svc.Validate(c.Request.Context(), body.Code, body.OrderTotal)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
