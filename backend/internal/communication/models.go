package communication

import "time"

type Address struct {
	ID        string    `firestore:"id" json:"id"`
	UserID    string    `firestore:"userId" json:"userId"`
	Label     string    `firestore:"label" json:"label"`
	Line1     string    `firestore:"line1" json:"line1"`
	Line2     string    `firestore:"line2,omitempty" json:"line2,omitempty"`
	City      string    `firestore:"city" json:"city"`
	County    string    `firestore:"county,omitempty" json:"county,omitempty"`
	Postcode  string    `firestore:"postcode" json:"postcode"`
	IsDefault bool      `firestore:"isDefault" json:"isDefault"`
	CreatedAt time.Time `firestore:"createdAt" json:"createdAt"`
}

type WishlistItem struct {
	ItemID   string    `firestore:"itemId" json:"itemId"`
	Name     string    `firestore:"name" json:"name"`
	Price    float64   `firestore:"price" json:"price"`
	ImageURL string    `firestore:"imageUrl" json:"imageUrl"`
	AddedAt  time.Time `firestore:"addedAt" json:"addedAt"`
}
