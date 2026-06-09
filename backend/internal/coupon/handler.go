package coupon

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r gin.IRouter) {
	r.POST("/coupons/validate", h.Validate)
}

func (h *Handler) Validate(c *gin.Context) {
	var req struct {
		Code       string  `json:"code" binding:"required"`
		OrderTotal float64 `json:"orderTotal" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.svc.Validate(c.Request.Context(), req.Code, req.OrderTotal)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *Handler) RegisterAdminRoutes(r gin.IRouter) {
	r.GET("/coupons", h.List)
	r.POST("/coupons", h.Create)
	r.PUT("/coupons/:code", h.Update)
	r.DELETE("/coupons/:code", h.DeleteCoupon)
}

func (h *Handler) List(c *gin.Context) {
	coupons, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"coupons": coupons})
}

func (h *Handler) Create(c *gin.Context) {
	var body Coupon
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}
	if err := h.svc.Create(c.Request.Context(), body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true})
}

func (h *Handler) Update(c *gin.Context) {
	code := c.Param("code")
	var fields map[string]any
	if err := c.ShouldBindJSON(&fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Update(c.Request.Context(), code, fields); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) DeleteCoupon(c *gin.Context) {
	code := c.Param("code")
	if err := h.svc.Delete(c.Request.Context(), code); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
