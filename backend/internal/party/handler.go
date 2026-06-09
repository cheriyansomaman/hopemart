package party

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
	r.POST("/auth/verify", h.Verify)
	r.POST("/profile", h.UpdateProfile)
	r.GET("/parties/:id", h.GetParty)
}

func (h *Handler) Verify(c *gin.Context) {
	uid := c.GetString("uid")
	party, err := h.svc.UpsertLogin(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"uid":   party.UID,
		"phone": party.Phone,
		"name":  party.Name,
	})
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	uid := c.GetString("uid")
	var body struct {
		Name        string `json:"name" binding:"required"`
		DateOfBirth string `json:"dateOfBirth" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and dateOfBirth are required"})
		return
	}
	if err := h.svc.UpdateProfile(c.Request.Context(), uid, body.Name, body.DateOfBirth); err != nil {
		if err.Error() == "dateOfBirth must be YYYY-MM-DD" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) GetParty(c *gin.Context) {
	uid := c.GetString("uid")
	id := c.Param("id")
	if id != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	party, err := h.svc.GetByID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "party not found"})
		return
	}
	c.JSON(http.StatusOK, party)
}

func (h *Handler) RegisterAdminRoutes(r gin.IRouter) {
	r.GET("/parties", h.ListAll)
}

func (h *Handler) ListAll(c *gin.Context) {
	parties, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"parties": parties})
}
