package communication

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/hopemart/backend/internal/shared/repository"
)

type WishlistService struct {
	repo *repository.FirestoreRepo
}

func NewWishlistService(repo *repository.FirestoreRepo) *WishlistService {
	return &WishlistService{repo: repo}
}

func (s *WishlistService) userColl(uid string) *firestore.CollectionRef {
	return s.repo.Client.Collection("wishlists").Doc(uid).Collection("items")
}

func (s *WishlistService) GetAll(ctx context.Context, uid string) ([]WishlistItem, error) {
	docs, err := s.repo.GetAll(ctx, s.userColl(uid).Query)
	if err != nil {
		return nil, fmt.Errorf("list wishlist: %w", err)
	}
	items := make([]WishlistItem, 0, len(docs))
	for _, doc := range docs {
		var w WishlistItem
		if err := doc.DataTo(&w); err != nil {
			continue
		}
		items = append(items, w)
	}
	return items, nil
}

// Add looks up the item in the items collection and snapshots name/price/imageUrl into the wishlist.
// This avoids cross-service HTTP dependency; communication-service reads items collection directly.
func (s *WishlistService) Add(ctx context.Context, uid, itemID string) error {
	snap, err := s.repo.Doc("items", itemID).Get(ctx)
	if err != nil {
		return fmt.Errorf("item not found: %w", err)
	}

	var raw struct {
		Name     string  `firestore:"name"`
		Price    float64 `firestore:"price"`
		ImageURL string  `firestore:"imageUrl"`
	}
	if err := snap.DataTo(&raw); err != nil {
		return fmt.Errorf("decode item: %w", err)
	}

	w := WishlistItem{
		ItemID:   itemID,
		Name:     raw.Name,
		Price:    raw.Price,
		ImageURL: raw.ImageURL,
		AddedAt:  time.Now(),
	}
	if _, err := s.userColl(uid).Doc(itemID).Set(ctx, w); err != nil {
		return fmt.Errorf("add to wishlist: %w", err)
	}
	return nil
}

func (s *WishlistService) Remove(ctx context.Context, uid, itemID string) error {
	if _, err := s.userColl(uid).Doc(itemID).Delete(ctx); err != nil {
		return fmt.Errorf("remove from wishlist: %w", err)
	}
	return nil
}
