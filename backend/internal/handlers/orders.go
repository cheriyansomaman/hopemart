package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/services"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type OrderHandler struct {
	svc *services.OrderService
}

func NewOrderHandler(svc *services.OrderService) *OrderHandler {
	return &OrderHandler{svc: svc}
}

func (h *OrderHandler) List(c *gin.Context) {
	uid := c.GetString("uid")
	orders, err := h.svc.ListByUser(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func (h *OrderHandler) GetByID(c *gin.Context) {
	uid := c.GetString("uid")
	orderID := c.Param("id")

	order, err := h.svc.GetByID(c.Request.Context(), orderID)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	if order.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	c.JSON(http.StatusOK, order)
}

func (h *OrderHandler) Track(c *gin.Context) {
	uid := c.GetString("uid")
	orderID := c.Param("id")

	order, err := h.svc.GetByID(c.Request.Context(), orderID)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	if order.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"orderId":       order.ID,
		"status":        order.Status,
		"trackingSteps": order.TrackingSteps,
	})
}
