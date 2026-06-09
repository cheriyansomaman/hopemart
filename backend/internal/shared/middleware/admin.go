package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminOnly rejects requests where the Firebase token lacks admin: true custom claim.
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, _ := c.Get("claims")
		m, _ := claims.(map[string]interface{})
		if m["admin"] != true {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin only"})
			return
		}
		c.Next()
	}
}
