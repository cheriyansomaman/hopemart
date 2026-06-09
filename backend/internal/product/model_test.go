package product

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestItemMarshalsProductImageField(t *testing.T) {
	item := Item{ProductImage: "data:image/png;base64,abc123"}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal item: %v", err)
	}

	if !json.Valid(data) {
		t.Fatalf("item JSON is invalid: %s", string(data))
	}
	if got := string(data); !strings.Contains(got, `"productImage":"data:image/png;base64,abc123"`) {
		t.Fatalf("productImage field missing from JSON: %s", got)
	}
}
