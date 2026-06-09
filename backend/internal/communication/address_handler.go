package communication

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

type AddressHandler struct {
	svc *AddressService
}

func NewAddressHandler(svc *AddressService) *AddressHandler {
	return &AddressHandler{svc: svc}
}

var ukPostcode = regexp.MustCompile(`(?i)^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$`)

func validateAddress(a Address) error {
	if strings.TrimSpace(a.Line1) == "" {
		return fmt.Errorf("line1 is required")
	}
	if strings.TrimSpace(a.City) == "" {
		return fmt.Errorf("city is required")
	}
	if !ukPostcode.MatchString(strings.TrimSpace(a.Postcode)) {
		return fmt.Errorf("invalid UK postcode")
	}
	return nil
}

func (h *AddressHandler) RegisterRoutes(r gin.IRouter) {
	r.GET("/addresses", h.List)
	r.POST("/addresses", h.Create)
	r.PUT("/addresses/:id", h.Update)
	r.DELETE("/addresses/:id", h.Delete)
	r.POST("/addresses/:id/default", h.SetDefault)
}

func (h *AddressHandler) List(c *gin.Context) {
	uid := c.GetString("uid")
	addresses, err := h.svc.GetAll(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"addresses": addresses})
}

func (h *AddressHandler) Create(c *gin.Context) {
	uid := c.GetString("uid")
	var body Address
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if err := validateAddress(body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	addr, err := h.svc.Create(c.Request.Context(), uid, body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, addr)
}

func (h *AddressHandler) Update(c *gin.Context) {
	uid := c.GetString("uid")
	id := c.Param("id")
	var body Address
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if err := validateAddress(body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	addr, err := h.svc.Update(c.Request.Context(), uid, id, body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, addr)
}

func (h *AddressHandler) Delete(c *gin.Context) {
	uid := c.GetString("uid")
	id := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), uid, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *AddressHandler) SetDefault(c *gin.Context) {
	uid := c.GetString("uid")
	id := c.Param("id")
	if err := h.svc.SetDefault(c.Request.Context(), uid, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
