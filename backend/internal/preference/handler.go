package preference

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
	r.GET("/preferences", h.GetPreferences)
	r.PUT("/preferences", h.SetPreferences)
	r.GET("/preferences/interests", h.ListInterests)
	// batch-signal MUST be registered before :itemId/signal to prevent "batch-signal" matching as itemId param.
	r.POST("/preferences/interests/batch-signal", h.BatchSignal)
	r.POST("/preferences/interests/:itemId/signal", h.RecordSignal)
}

func (h *Handler) GetPreferences(c *gin.Context) {
	uid := c.GetString("uid")
	pref, err := h.svc.Get(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pref)
}

func (h *Handler) SetPreferences(c *gin.Context) {
	uid := c.GetString("uid")
	var body CommunicationPreference
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pref, err := h.svc.Set(c.Request.Context(), uid, body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pref)
}

func (h *Handler) ListInterests(c *gin.Context) {
	uid := c.GetString("uid")
	signals, err := h.svc.ListInterests(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"interests": signals})
}

func (h *Handler) RecordSignal(c *gin.Context) {
	uid := c.GetString("uid")
	itemID := c.Param("itemId")
	var body ProductInterestSignal
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.ItemID = itemID
	if err := h.svc.RecordSignal(c.Request.Context(), uid, body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) BatchSignal(c *gin.Context) {
	uid := c.GetString("uid")
	var body struct {
		Signals []ProductInterestSignal `json:"signals"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.RecordBatchSignals(c.Request.Context(), uid, body.Signals); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
