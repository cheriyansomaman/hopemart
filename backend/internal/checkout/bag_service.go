package checkout

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/hopemart/backend/internal/shared/repository"
)

type BagService struct {
	repo *repository.FirestoreRepo
}

func NewBagService(repo *repository.FirestoreRepo) *BagService {
	return &BagService{repo: repo}
}

func (s *BagService) Get(ctx context.Context, userID string) ([]BagItem, error) {
	docs, err := s.repo.GetAll(ctx, s.repo.Collection("bags").Doc(userID).Collection("items").Query)
	if err != nil {
		return nil, err
	}
	items := make([]BagItem, 0, len(docs))
	for _, doc := range docs {
		var item BagItem
		if err := doc.DataTo(&item); err != nil {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *BagService) AddOrUpdate(ctx context.Context, userID string, item BagItem) error {
	item.AddedAt = time.Now()
	_, err := s.repo.Collection("bags").Doc(userID).Collection("items").Doc(item.ItemID).Set(ctx, item)
	return err
}

func (s *BagService) Remove(ctx context.Context, userID, itemID string) error {
	_, err := s.repo.Collection("bags").Doc(userID).Collection("items").Doc(itemID).Delete(ctx)
	return err
}

func (s *BagService) Clear(ctx context.Context, userID string) error {
	docs, err := s.repo.GetAll(ctx, s.repo.Collection("bags").Doc(userID).Collection("items").Query)
	if err != nil {
		return err
	}
	batch := s.repo.Client.Batch()
	for _, doc := range docs {
		batch.Delete(doc.Ref)
	}
	_, err = batch.Commit(ctx)
	return err
}

func (s *BagService) UpdateQty(ctx context.Context, userID, itemID string, qty int) error {
	_, err := s.repo.Collection("bags").Doc(userID).Collection("items").Doc(itemID).Update(ctx, []firestore.Update{
		{Path: "qty", Value: qty},
	})
	return err
}
