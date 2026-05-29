package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/models"
	"github.com/hopemart/backend/internal/services"
)

type BagHandler struct {
	svc *services.BagService
}

func NewBagHandler(svc *services.BagService) *BagHandler {
	return &BagHandler{svc: svc}
}

func (h *BagHandler) Get(c *gin.Context) {
	uid := c.GetString("uid")
	items, err := h.svc.Get(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *BagHandler) AddOrUpdate(c *gin.Context) {
	uid := c.GetString("uid")
	var item models.BagItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if item.ItemID == "" || item.Qty < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "itemId and qty >= 1 required"})
		return
	}
	item.AddedAt = time.Now()

	if err := h.svc.AddOrUpdate(c.Request.Context(), uid, item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BagHandler) Remove(c *gin.Context) {
	uid := c.GetString("uid")
	itemID := c.Param("itemId")
	if err := h.svc.Remove(c.Request.Context(), uid, itemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BagHandler) Clear(c *gin.Context) {
	uid := c.GetString("uid")
	if err := h.svc.Clear(c.Request.Context(), uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BagHandler) UpdateQty(c *gin.Context) {
	uid := c.GetString("uid")
	itemID := c.Param("itemId")

	var body struct {
		Qty int `json:"qty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Qty < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "qty >= 1 required"})
		return
	}

	if err := h.svc.UpdateQty(c.Request.Context(), uid, itemID, body.Qty); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
