package communication

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type WishlistHandler struct {
	svc *WishlistService
}

func NewWishlistHandler(svc *WishlistService) *WishlistHandler {
	return &WishlistHandler{svc: svc}
}

func (h *WishlistHandler) RegisterRoutes(r gin.IRouter) {
	r.GET("/wishlist", h.List)
	r.POST("/wishlist/:itemId", h.Add)
	r.DELETE("/wishlist/:itemId", h.Remove)
}

func (h *WishlistHandler) List(c *gin.Context) {
	uid := c.GetString("uid")
	items, err := h.svc.GetAll(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *WishlistHandler) Add(c *gin.Context) {
	uid := c.GetString("uid")
	itemID := c.Param("itemId")
	if err := h.svc.Add(c.Request.Context(), uid, itemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true})
}

func (h *WishlistHandler) Remove(c *gin.Context) {
	uid := c.GetString("uid")
	itemID := c.Param("itemId")
	if err := h.svc.Remove(c.Request.Context(), uid, itemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
