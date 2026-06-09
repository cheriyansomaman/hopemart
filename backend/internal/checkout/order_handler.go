package checkout

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type OrderHandler struct {
	svc *OrderService
}

func NewOrderHandler(svc *OrderService) *OrderHandler {
	return &OrderHandler{svc: svc}
}

func (h *OrderHandler) RegisterRoutes(r gin.IRouter) {
	r.GET("/orders", h.List)
	r.GET("/orders/:id", h.GetByID)
	r.POST("/orders/:id/cancel", h.CancelOrder)
	r.GET("/orders/:id/track", h.Track)
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

func (h *OrderHandler) CancelOrder(c *gin.Context) {
	uid := c.GetString("uid")
	orderID := c.Param("id")
	if err := h.svc.Cancel(c.Request.Context(), orderID, uid); err != nil {
		msg := err.Error()
		switch msg {
		case "forbidden":
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		case "only confirmed orders can be cancelled":
			c.JSON(http.StatusConflict, gin.H{"error": msg})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
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

func (h *OrderHandler) RegisterAdminRoutes(r gin.IRouter) {
	r.GET("/orders/all", h.ListAll)
	r.PATCH("/orders/:id/status", h.UpdateStatus)
}

func (h *OrderHandler) ListAll(c *gin.Context) {
	orders, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func (h *OrderHandler) UpdateStatus(c *gin.Context) {
	orderID := c.Param("id")
	var body struct {
		Status string       `json:"status" binding:"required"`
		Step   TrackingStep `json:"step"   binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.UpdateStatus(c.Request.Context(), orderID, body.Status, body.Step); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
