package handlers

import (
	"context"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	fbclient "github.com/hopemart/backend/internal/firebase"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	fb *fbclient.Client
}

func NewAuthHandler(fb *fbclient.Client) *AuthHandler {
	return &AuthHandler{fb: fb}
}

func (h *AuthHandler) Verify(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	token, err := h.fb.Auth.GetUser(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	userDoc := h.fb.Firestore.Collection("users").Doc(uid)
	_, err = userDoc.Set(ctx, map[string]interface{}{
		"phone":       token.PhoneNumber,
		"lastLoginAt": time.Now(),
	}, firestore.MergeAll)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upsert user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"uid":   uid,
		"phone": token.PhoneNumber,
	})
}
