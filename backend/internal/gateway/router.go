package gateway

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hopemart/backend/internal/shared/middleware"
)

type route struct {
	prefix string
	target string
}

var routes = []route{
	{"/uploads",  "http://localhost:8081"},
	{"/products", "http://localhost:8081"},
	{"/coupons", "http://localhost:8082"},
	{"/bag", "http://localhost:8083"},
	{"/checkout", "http://localhost:8083"},
	{"/orders", "http://localhost:8083"},
	{"/preferences", "http://localhost:8084"},
	{"/auth", "http://localhost:8085"},
	{"/profile", "http://localhost:8085"},
	{"/parties", "http://localhost:8085"},
	{"/addresses", "http://localhost:8086"},
	{"/wishlist", "http://localhost:8086"},
}

func New() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())

	// Build proxy map keyed by prefix; sort prefixes longest-first for correct matching.
	proxies := make(map[string]*httputil.ReverseProxy, len(routes))
	prefixes := make([]string, 0, len(routes))
	for _, rt := range routes {
		target, _ := url.Parse(rt.target)
		proxies[rt.prefix] = httputil.NewSingleHostReverseProxy(target)
		prefixes = append(prefixes, rt.prefix)
	}
	sort.Slice(prefixes, func(i, j int) bool {
		return len(prefixes[i]) > len(prefixes[j])
	})

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		for _, prefix := range prefixes {
			if strings.HasPrefix(path, prefix) {
				proxies[prefix].ServeHTTP(c.Writer, c.Request)
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})

	return r
}
